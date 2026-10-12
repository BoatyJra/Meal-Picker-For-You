import app from "../server/app.js";

export default function handler(req, res) {
  req.url = "/api/chatgpt/connect";
  return app(req, res);
}
