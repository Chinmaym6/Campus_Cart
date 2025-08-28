import jwt from "jsonwebtoken";
import { config } from "../config/index.js";

export function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: Number(payload.sub) };
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

// Used by search logging where auth is optional
export function getViewerId(req) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return null;
    const payload = jwt.verify(token, config.jwtSecret);
    return Number(payload.sub);
  } catch {
    return null;
  }
}
