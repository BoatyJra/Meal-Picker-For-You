import "dotenv/config";
import express from "express";
import { timingSafeEqual } from "node:crypto";
import { initializeDatabase, listRecipes, listMenus, insertMenu, updateMenu, deleteMenu } from "./database.js";
import { validateMenu, cleanMenu } from "../src/recipe-schema.js";

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
app.get("/api/menus", async (_req, res, next) => {
  try { res.json(await listMenus()); } catch (error) { next(error); }
});

// Best-effort per-instance throttling; serverless instances do not share this map.
const attempts = new Map();
function authorize(req, res, next) {
  const expected = process.env.RECIPE_PASSWORD;
  if (!expected) return res.status(503).json({ error: "ยังไม่ได้ตั้งรหัสผ่านสำหรับเพิ่มสูตร" });
  const now = Date.now();
  for (const [key, value] of attempts) if (now > value.reset) attempts.delete(key);
  const address = process.env.VERCEL ? req.get("x-vercel-forwarded-for") || req.socket.remoteAddress : req.socket.remoteAddress;
  const bucket = attempts.get(address) || { count: 0, reset: now + 60000 };
  attempts.set(address, bucket);
  if (++bucket.count > 30) return res.status(429).json({ error: "ลองใหม่อีกครั้งในหนึ่งนาที" });
  const authorization = req.get("authorization") || "";
  // JSON supports Unicode passwords; accept legacy headers for cached clients.
  const password = typeof req.body?.password === "string" ? req.body.password : authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const received = Buffer.from(password);
  const secret = Buffer.from(expected);
  if (received.length !== secret.length || !timingSafeEqual(received, secret)) return res.status(401).json({ error: "รหัสผ่านไม่ถูกต้อง" });
  next();
}

async function saveMenu(req, res) {
  const body = req.path === "/api/recipes" ? { ...req.body, mode: "home", category: req.body?.category || "สูตรของเรา" } : req.body;
  const error = validateMenu(body);
  if (error) return res.status(400).json({ error });
  if (req.method === "PUT" && (!Number.isSafeInteger(body.id) || body.id < 1)) return res.status(400).json({ error: "รหัสเมนูไม่ถูกต้อง" });
  const menu = cleanMenu(body);
  try {
    const saved = req.method === "PUT" ? await updateMenu(body.id, menu) : await insertMenu(menu);
    if (!saved) return res.status(404).json({ error: "ไม่พบเมนูนี้แล้ว" });
    res.status(req.method === "PUT" ? 200 : 201).json(saved);
  }
  catch (cause) {
    if (cause.code === "SQLITE_CONSTRAINT_UNIQUE" || cause.message.includes("UNIQUE constraint")) {
      return res.status(409).json({ error: "มีชื่อเมนูนี้แล้ว ลองตั้งชื่อสูตรให้ต่างกันนะ" });
    }
    console.error("Recipe save failed:", cause.code || cause.name);
    res.status(503).json({ error: "บันทึกไม่ได้ ลองใหม่อีกครั้ง" });
  }
}
app.post(["/api/recipes", "/api/menus"], authorize, saveMenu);
app.put("/api/menus", authorize, saveMenu);
app.delete("/api/menus", authorize, async (req, res, next) => {
  if (!Number.isSafeInteger(req.body?.id) || req.body.id < 1) return res.status(400).json({ error: "รหัสเมนูไม่ถูกต้อง" });
  try {
    if (!await deleteMenu(req.body.id)) return res.status(404).json({ error: "ไม่พบเมนูนี้แล้ว" });
    res.json({ ok: true });
  } catch (error) { next(error); }
});
app.use("/api", (_req, res) => res.status(404).json({ error: "ไม่พบ API นี้" }));
app.use((error, _req, res, _next) => {
  console.error("API request failed:", error.code || error.name);
  res.status(error.status || 503).json({ error: "คำขอไม่ถูกต้อง หรือเซิร์ฟเวอร์มีปัญหา" });
});
export default app;
