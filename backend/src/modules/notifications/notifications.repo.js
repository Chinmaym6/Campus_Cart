import { db } from "../../loaders/database.js";

export async function getRecent({ viewerId, limit }) {
  const { rows } = await db.query(
    `SELECT id, type, title, body, data, is_read, created_at
     FROM campus_cart.notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [viewerId, limit]
  );
  return rows;
}
