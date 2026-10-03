import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { homeMenus, foodMenus, snackMenus } from "../src/menus.js";

let client;
let initialized;

export function getClient() {
  if (client) return client;
  const remoteUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (process.env.VERCEL && (!remoteUrl || !authToken || remoteUrl.startsWith("file:"))) {
    throw new Error("Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN on Vercel");
  }
  let url = remoteUrl;
  if (!url) {
    const directory = path.resolve(process.env.DATA_DIR || "data");
    mkdirSync(directory, { recursive: true });
    url = pathToFileURL(path.join(directory, "recipes.sqlite")).href;
  }
  client = createClient({ url, authToken });
  return client;
}

export async function initializeDatabase() {
  if (!initialized) {
    initialized = (async () => {
      const db = getClient();
      await db.batch([
      "CREATE TABLE IF NOT EXISTS recipes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL COLLATE NOCASE UNIQUE, body TEXT NOT NULL)",
      "CREATE TABLE IF NOT EXISTS menus (id INTEGER PRIMARY KEY AUTOINCREMENT, mode TEXT NOT NULL, name TEXT NOT NULL COLLATE NOCASE, body TEXT NOT NULL, UNIQUE(mode, name))",
      "CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY)",
      ], "write");
      const migration = await db.execute("SELECT name FROM migrations WHERE name = 'all-menus-v1'");
      if (migration.rows.length) return;
      const legacy = await db.execute("SELECT id, body FROM recipes ORDER BY id");
      const seeds = legacy.rows.length ? legacy.rows.map((row) => JSON.parse(row.body)) : homeMenus;
      // Seed and migrate exactly once, including across concurrent cold starts.
      await db.batch([
        ...[["home", seeds], ["food", foodMenus], ["snacks", snackMenus]].flatMap(([mode, items]) => items.map((menu) => ({
          sql: "INSERT OR IGNORE INTO menus (mode, name, body) SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'all-menus-v1')",
          args: [mode, menu.name, JSON.stringify({ ...menu, mode, video: menu.video || "", ingredients: menu.ingredients || [], steps: menu.steps || [] })],
        }))),
        "INSERT OR IGNORE INTO migrations (name) VALUES ('all-menus-v1')",
      ], "write");
    })().catch((error) => { initialized = undefined; throw error; });
  }
  await initialized;
}

export async function listMenus() {
  await initializeDatabase();
  const result = await getClient().execute("SELECT id, body FROM menus ORDER BY id");
  return result.rows.map((row) => ({ ...JSON.parse(row.body), id: Number(row.id) }));
}

export async function insertMenu(recipe) {
  await initializeDatabase();
  const result = await getClient().execute({
    sql: "INSERT INTO menus (mode, name, body) VALUES (?, ?, ?) RETURNING id",
    args: [recipe.mode, recipe.name, JSON.stringify(recipe)],
  });
  return { ...recipe, id: Number(result.rows[0].id) };
}

export async function updateMenu(id, menu) {
  await initializeDatabase();
  const result = await getClient().execute({ sql: "UPDATE menus SET mode = ?, name = ?, body = ? WHERE id = ? RETURNING id", args: [menu.mode, menu.name, JSON.stringify(menu), id] });
  return result.rows.length ? { ...menu, id } : null;
}

export async function deleteMenu(id) {
  await initializeDatabase();
  const result = await getClient().execute({ sql: "DELETE FROM menus WHERE id = ?", args: [id] });
  return result.rowsAffected > 0;
}

export async function listRecipes() { return (await listMenus()).filter((menu) => menu.mode === "home"); }
export async function insertRecipe(recipe) { return insertMenu({ ...recipe, mode: "home" }); }
