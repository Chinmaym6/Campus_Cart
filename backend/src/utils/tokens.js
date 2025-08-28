import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";

export function randomToken(len = 48) {
  return crypto.randomBytes(len).toString("base64url");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signAccessToken(userId) {
  return jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}
