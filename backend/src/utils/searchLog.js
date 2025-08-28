import { db } from "../loaders/database.js";
export async function logSearch(userId, queryText, filters) {
  if (!userId || !queryText) return;
  await db.query(
    `INSERT INTO campus_cart.user_search_history (user_id, query_text, filters)
     VALUES ($1,$2,$3)`,
    [userId, String(queryText).slice(0, 500), filters || {}]
  );
}
