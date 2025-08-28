// backend/src/config/index.js
import dotenv from "dotenv";
dotenv.config();

const toBool = (v, def = true) =>
  v === undefined ? def : !(String(v).toLowerCase() === "false" || v === "0");

export const config = {
  env: process.env.NODE_ENV || "development",

  // Server
  port: Number(process.env.PORT || 4000),
  appUrl: process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",

  // Database (support both shapes to avoid mismatches)
  databaseUrl: process.env.DATABASE_URL,        // preferred
  db: { url: process.env.DATABASE_URL },        // backward-compat

  // Auth / JWT
  jwtSecret: process.env.JWT_SECRET || "change_this_dev_secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  // Uploads
  uploadsDir: process.env.UPLOADS_DIR || "uploads",

  // SMTP / Email
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: toBool(process.env.SMTP_SECURE, true), // 465 = true, 587 = false
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
  },
};
