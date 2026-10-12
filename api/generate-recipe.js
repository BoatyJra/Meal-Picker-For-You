import app from "../server/app.js";

export default function handler(req, res) {
  req.url = "/api/generate-recipe";
  return app(req, res);
}
