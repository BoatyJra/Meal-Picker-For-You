import app from "../server/app.js";

export default function handler(req, res) {
  req.url = "/api/chatgpt/status";
  return app(req, res);
}
