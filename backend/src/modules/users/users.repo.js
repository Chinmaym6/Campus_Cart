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
