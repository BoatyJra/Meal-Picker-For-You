import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { homeMenus, foodMenus, snackMenus, restaurantMenus } from "../src/menus.js";

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
      "CREATE TABLE IF NOT EXISTS favorites (menu_id INTEGER PRIMARY KEY)",
      "CREATE TABLE IF NOT EXISTS recipe_drafts (cache_key TEXT PRIMARY KEY, body TEXT NOT NULL, created_at INTEGER NOT NULL)",
      "CREATE TABLE IF NOT EXISTS app_state (name TEXT PRIMARY KEY, body TEXT NOT NULL, updated_at INTEGER NOT NULL)",
      "CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY)",
      ], "write");
      const migration = await db.execute("SELECT name FROM migrations WHERE name = 'all-menus-v1'");
      if (!migration.rows.length) {
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
      }
      const dineInMigration = await db.execute("SELECT name FROM migrations WHERE name = 'dine-in-v1'");
      if (!dineInMigration.rows.length) await db.batch([
        ...restaurantMenus.map((menu) => ({
          sql: "INSERT OR IGNORE INTO menus (mode, name, body) SELECT 'dinein', ?, ? WHERE NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'dine-in-v1')",
          args: [menu.name, JSON.stringify({ ...menu, mode: "dinein", video: "", ingredients: [], steps: [] })],
        })),
        "INSERT OR IGNORE INTO migrations (name) VALUES ('dine-in-v1')",
      ], "write");
    })().catch((error) => { initialized = undefined; throw error; });
  }
  await initialized;
}

export async function listMenus() {
  await initializeDatabase();
  const result = await getClient().execute("SELECT menus.id, menus.body, favorites.menu_id IS NOT NULL AS favorite FROM menus LEFT JOIN favorites ON favorites.menu_id = menus.id ORDER BY menus.id");
  return result.rows.map((row) => ({ ...JSON.parse(row.body), id: Number(row.id), favorite: Boolean(row.favorite) }));
}

export async function setFavorite(menuId, favorite) {
  await initializeDatabase();
  const menu = await getClient().execute({ sql: "SELECT id FROM menus WHERE id = ?", args: [menuId] });
  if (!menu.rows.length) return null;
  if (favorite) await getClient().execute({ sql: "INSERT OR IGNORE INTO favorites (menu_id) VALUES (?)", args: [menuId] });
  else await getClient().execute({ sql: "DELETE FROM favorites WHERE menu_id = ?", args: [menuId] });
  return { menuId, favorite };
}

function recipeCacheKey(name) {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("th");
}

export async function getRecipeDraft(name) {
  await initializeDatabase();
  const result = await getClient().execute({ sql: "SELECT body FROM recipe_drafts WHERE cache_key = ?", args: [recipeCacheKey(name)] });
  return result.rows.length ? JSON.parse(result.rows[0].body) : null;
}

export async function saveRecipeDraft(name, draft) {
  await initializeDatabase();
  await getClient().execute({
    sql: "INSERT INTO recipe_drafts (cache_key, body, created_at) VALUES (?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET body = excluded.body, created_at = excluded.created_at",
    args: [recipeCacheKey(name), JSON.stringify(draft), Date.now()],
  });
  return draft;
}

export async function getAppState(name) {
  await initializeDatabase();
  const result = await getClient().execute({ sql: "SELECT body FROM app_state WHERE name = ?", args: [name] });
  return result.rows.length ? String(result.rows[0].body) : null;
}

export async function setAppState(name, body) {
  await initializeDatabase();
  await getClient().execute({
    sql: "INSERT INTO app_state (name, body, updated_at) VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at",
    args: [name, body, Date.now()],
  });
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
