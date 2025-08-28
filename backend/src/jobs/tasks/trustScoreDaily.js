import { db } from "../../loaders/database.js";
import { createNotification } from "../../utils/notify.js";

/**
 * Computes current rating (avg) and nudges users (optional).
 * We don't store trust score permanently in schema; we can notify top/bottom users.
 */
export async function trustScoreDaily() {
  console.log("[jobs] trustScoreDaily");
  const { rows } = await db.query(
    `SELECT u.id,
            COALESCE((
              SELECT AVG(r.rating)
              FROM campus_cart.reviews r
              WHERE r.reviewee_id = u.id
            ), 0) AS avg_rating
     FROM campus_cart.users u`
  );

  for (const r of rows) {
    const avg = Number(r.avg_rating || 0);
    // Nudge new users with 0 reviews
    if (avg === 0) {
      await createNotification(r.id, "system", "Build your reputation",
        "Complete transactions and collect reviews to improve your visibility.", {});
    }
  }
}
