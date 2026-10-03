import app from "../server/app.js";

export default function handler(req, res) {
  req.url = "/api/recipes";
  return app(req, res);
}
