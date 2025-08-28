import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15m
  max: 300, // per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, slow down." }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth attempts. Try again later." }
});
