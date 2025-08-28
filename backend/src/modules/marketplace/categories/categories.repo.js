import { db } from "../../../loaders/database.js";
export async function listCategories() {
  const { rows } = await db.query(
    `SELECT id, name, slug, parent_id FROM campus_cart.categories ORDER BY name ASC`
  );
  return rows;
}
