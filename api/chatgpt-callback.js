import app from "../server/app.js";

export default function handler(req, res) {
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  req.url = `/auth/chatgpt/callback${query}`;
  return app(req, res);
}
