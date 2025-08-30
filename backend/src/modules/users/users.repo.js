import { db } from "../../loaders/database.js";

export async function updateLastLocation(userId, { latitude, longitude, accuracy_m }) {
  const { rows } = await db.query(
    `UPDATE campus_cart.users
       SET last_latitude = $2,
           last_longitude = $3,
           last_location_accuracy_m = $4,
           last_location_at = NOW(),
           updated_at = NOW()
     WHERE id = $1
     RETURNING id, email, last_latitude, last_longitude, last_location_accuracy_m, last_location_at`,
    [userId, latitude ?? null, longitude ?? null, accuracy_m ?? null]
  );
  return rows[0];
}

export async function getMyStats(userId) {
  const q = `
    SELECT
      (SELECT COUNT(*) FROM campus_cart.items WHERE seller_id = $1 AND status IN ('active','reserved'))::int AS my_listings,
      (SELECT COUNT(*) FROM campus_cart.items WHERE seller_id = $1 AND status = 'sold')::int AS items_sold,
      (SELECT COUNT(*) FROM campus_cart.saved_items WHERE user_id = $1)::int AS saved_items,
      (SELECT COUNT(*) FROM campus_cart.roommate_posts WHERE user_id = $1)::int AS roommate_posts
  `;
  const { rows } = await db.query(q, [userId]);
  return rows[0];
}