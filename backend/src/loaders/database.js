import pg from "pg";
import { config } from "../config/index.js";

export const pool = new pg.Pool({
  connectionString: config.dbUrl
});

export const db = {
  query: (text, params) => pool.query(text, params)
};

// quick ping on boot
pool.connect()
  .then(c => c
    .query("SELECT NOW()")
    .then(() => { c.release(); console.log("🗄️  PostgreSQL connected"); }))
  .catch(err => console.error("DB connect error:", err.message));
