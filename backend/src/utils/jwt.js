import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
export function signAccessToken(user) {
  return jwt.sign({ email: user.email }, config.jwtSecret, {
    subject: String(user.id),
    expiresIn: config.jwtExpiresIn
  });
}
