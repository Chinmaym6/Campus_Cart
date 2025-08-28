// backend/src/loaders/database.js
import pkg from "pg";
const { Pool } = pkg;
import { config } from "../config/index.js";

const connectionString = config.databaseUrl || config.db?.url;

if (!connectionString) {
  console.error("❌ DATABASE_URL is not set. Put it in backend/.env");
  // Example: postgres://postgres:postgres@localhost:5432/campus_cart
  process.exit(1);
}

export const pool = new Pool({
  connectionString,
  max: 10,
  // Enable this if you ever use a managed DB that requires SSL:
  // ssl: { rejectUnauthorized: false }
});

export const db = {
  query: (text, params) => pool.query(text, params),
};

pool.on("error", (err) => {
  console.error("[pg] Pool error:", err);
});
