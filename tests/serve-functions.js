import { createServer } from "node:http";
import health from "../api/health.js";
import recipes from "../api/recipes.js";

createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname === "/api/health") return health(req, res);
  if (pathname === "/api/recipes") return recipes(req, res);
  res.writeHead(404).end();
}).listen(Number(process.env.PORT), "127.0.0.1");
