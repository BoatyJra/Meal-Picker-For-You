import app from "../server/app.js";

export default function handler(req, res) {
  req.url = "/api/menus";
  return app(req, res);
}
