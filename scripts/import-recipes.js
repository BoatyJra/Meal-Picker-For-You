import "dotenv/config";
import { createClient } from "@libsql/client";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getClient, initializeDatabase } from "../server/database.js";
import { validateRecipe } from "../src/recipe-schema.js";

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN || process.env.TURSO_DATABASE_URL.startsWith("file:")) {
  throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN before importing");
}
const filename = path.resolve(process.argv[2] || path.join(process.env.DATA_DIR || "data", "recipes.sqlite"));
if (!existsSync(filename)) throw new Error("The source recipe file does not exist");
let recipes;
if (filename.endsWith(".json")) {
  recipes = JSON.parse(readFileSync(filename, "utf8"));
} else {
  const source = createClient({ url: pathToFileURL(filename).href });
  try {
    const tables = await source.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'menus'");
    const result = await source.execute(tables.rows.length ? "SELECT body FROM menus WHERE mode = 'home' ORDER BY id" : "SELECT body FROM recipes ORDER BY id");
    recipes = result.rows.map((row) => JSON.parse(row.body));
  } finally { source.close(); }
}
if (!Array.isArray(recipes) || recipes.some((recipe) => validateRecipe(recipe))) {
  throw new Error("Source contains invalid recipes; nothing was imported");
}
await initializeDatabase();
const destination = getClient();
try {
  const results = recipes.length ? await destination.batch(recipes.map((recipe) => ({
    sql: "INSERT OR IGNORE INTO menus (mode, name, body) VALUES ('home', ?, ?)",
    args: [recipe.name.trim(), JSON.stringify({ mode: "home",
      name: recipe.name.trim(), category: recipe.category === "ทำกินเอง" ? "ทำกินเอง" : "สูตรของเรา",
      ingredients: recipe.ingredients, steps: recipe.steps, video: recipe.video,
    })],
  })), "write") : [];
  const inserted = results.reduce((count, result) => count + result.rowsAffected, 0);
  console.log(`Imported ${inserted} recipes; skipped ${recipes.length - inserted} existing names. The source file was preserved.`);
} finally { destination.close(); }
