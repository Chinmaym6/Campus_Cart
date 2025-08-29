import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 4000),
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "dev",
  allowAnyEmails: String(process.env.ALLOW_ANY_EMAILS || "true") === "true",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:4000",
    appBaseUrl: process.env.APP_BASE_URL || "http://localhost:4000",
  clientBaseUrl: process.env.CLIENT_BASE_URL || "http://localhost:3000",
  mail: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  uploadsDir: "uploads"
};
