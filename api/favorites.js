import app from "../server/app.js";

export default function handler(req, res) {
  req.url = "/api/favorites";
  return app(req, res);
}
