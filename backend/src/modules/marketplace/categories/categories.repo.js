import { db } from "../../../loaders/database.js";

export async function list() {
  const { rows } = await db.query(
    `SELECT id, name, slug FROM campus_cart.categories ORDER BY name ASC`
  );
  return rows;
}

export async function ensureSeed(defaults) {
  for (const c of defaults) {
    await db.query(
      `INSERT INTO campus_cart.categories (name, slug)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO NOTHING`,
      [c.name, c.slug]
    );
  }
}
