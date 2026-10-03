import "dotenv/config";

// Local development must never write to a configured production Turso database.
process.env.TURSO_DATABASE_URL = "";
process.env.TURSO_AUTH_TOKEN = "";
process.env.VERCEL = "";
process.env.HOST = "127.0.0.1";
process.env.DATA_DIR = process.env.DEV_DATA_DIR || "data/dev";
process.env.RECIPE_PASSWORD = process.env.DEV_RECIPE_PASSWORD || "local-preview-only";

await import("./index.js");
