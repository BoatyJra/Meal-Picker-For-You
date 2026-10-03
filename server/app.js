import "dotenv/config";
import express from "express";
import { timingSafeEqual } from "node:crypto";
import { initializeDatabase, insertRecipe, listRecipes } from "./database.js";
import { validateRecipe } from "../src/recipe-schema.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.get("/api/health", async (_req, res, next) => {
  try { await initializeDatabase(); res.json({ ok: true }); }
  catch (error) { next(error); }
});
app.get("/api/recipes", async (_req, res, next) => {
  try { res.json(await listRecipes()); }
  catch (error) { next(error); }
});

// Best-effort per-instance throttling; serverless instances do not share this map.
const attempts = new Map();
app.post("/api/recipes", async (req, res) => {
  const expected = process.env.RECIPE_PASSWORD;
  if (!expected) return res.status(503).json({ error: "ยังไม่ได้ตั้งรหัสผ่านสำหรับเพิ่มสูตร" });
  const now = Date.now();
  for (const [key, value] of attempts) if (now > value.reset) attempts.delete(key);
  const address = process.env.VERCEL ? req.get("x-vercel-forwarded-for") || req.socket.remoteAddress : req.socket.remoteAddress;
  const bucket = attempts.get(address) || { count: 0, reset: now + 60000 };
  attempts.set(address, bucket);
  if (++bucket.count > 30) return res.status(429).json({ error: "ลองใหม่อีกครั้งในหนึ่งนาที" });
  const authorization = req.get("authorization") || "";
  const received = Buffer.from(authorization.startsWith("Bearer ") ? authorization.slice(7) : "");
  const secret = Buffer.from(expected);
  if (received.length !== secret.length || !timingSafeEqual(received, secret)) return res.status(401).json({ error: "รหัสผ่านไม่ถูกต้อง" });
  const error = validateRecipe(req.body);
  if (error) return res.status(400).json({ error });
  const recipe = {
    name: req.body.name.trim(), category: "สูตรของเรา", video: req.body.video.trim(),
    ingredients: req.body.ingredients.map((line) => line.trim()), steps: req.body.steps.map((line) => line.trim()),
  };
  try { res.status(201).json(await insertRecipe(recipe)); }
  catch (cause) {
    if (cause.code === "SQLITE_CONSTRAINT_UNIQUE" || cause.message.includes("UNIQUE constraint")) {
      return res.status(409).json({ error: "มีชื่อเมนูนี้แล้ว ลองตั้งชื่อสูตรให้ต่างกันนะ" });
    }
    console.error("Recipe save failed:", cause.code || cause.name);
    res.status(503).json({ error: "บันทึกไม่ได้ ลองใหม่อีกครั้ง" });
  }
});
app.use("/api", (_req, res) => res.status(404).json({ error: "ไม่พบ API นี้" }));
app.use((error, _req, res, _next) => {
  console.error("API request failed:", error.code || error.name);
  res.status(error.status || 503).json({ error: "คำขอไม่ถูกต้อง หรือเซิร์ฟเวอร์มีปัญหา" });
});
export default app;
