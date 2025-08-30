// backend/src/config/rateLimit.js
import rateLimit from "express-rate-limit";

export function apiLimiter() {
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    // In dev, do not rate limit to avoid 429s from StrictMode double calls
    return (req, res, next) => next();
  }

  // In production, keep a sensible limit
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 120,            // 120 req/min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." }
  });
}
