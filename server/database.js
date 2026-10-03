import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { homeMenus } from "../src/menus.js";

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
    initialized = getClient().batch([
      "CREATE TABLE IF NOT EXISTS recipes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL COLLATE NOCASE UNIQUE, body TEXT NOT NULL)",
      ...homeMenus.map((menu) => ({
        sql: "INSERT OR IGNORE INTO recipes (name, body) VALUES (?, ?)",
        args: [menu.name, JSON.stringify({ ...menu, video: "" })],
      })),
    ], "write").catch((error) => { initialized = undefined; throw error; });
  }
  await initialized;
}

export async function listRecipes() {
  await initializeDatabase();
  const result = await getClient().execute("SELECT id, body FROM recipes ORDER BY id");
  return result.rows.map((row) => ({ ...JSON.parse(row.body), id: Number(row.id) }));
}

export async function insertRecipe(recipe) {
  await initializeDatabase();
  const result = await getClient().execute({
    sql: "INSERT INTO recipes (name, body) VALUES (?, ?) RETURNING id",
    args: [recipe.name, JSON.stringify(recipe)],
  });
  return { ...recipe, id: Number(result.rows[0].id) };
}
