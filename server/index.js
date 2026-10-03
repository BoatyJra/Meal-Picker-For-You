import app from "./app.js";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
app.use(express.static(path.join(root, "dist")));
app.get("*", (_req, res) => res.sendFile(path.join(root, "dist", "index.html")));
const port = Number(process.env.PORT || 3001);
app.listen(port, process.env.HOST || "127.0.0.1", () => console.log(`Meal Picker API listening on port ${port}`));
