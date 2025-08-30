import { db } from "../../loaders/database.js";

export async function findNearYou({ viewerId, limit }) {
  const ures = await db.query(
    `SELECT last_latitude AS lat, last_longitude AS lon
     FROM campus_cart.users WHERE id = $1`,
    [viewerId]
  );
  const u = ures.rows[0] || {};
  const hasLoc = u?.lat != null && u?.lon != null;

  let rows = [];
  if (hasLoc) {
    const q = `
      SELECT rp.id, rp.title, rp.budget_min_cents, rp.budget_max_cents,
             earth_distance(ll_to_earth($1,$2), ll_to_earth(rp.preferred_lat, rp.preferred_lon)) AS dist_m
      FROM campus_cart.roommate_posts rp
      WHERE rp.preferred_lat IS NOT NULL AND rp.preferred_lon IS NOT NULL
      ORDER BY dist_m ASC, rp.created_at DESC
      LIMIT $3
    `;
    rows = (await db.query(q, [u.lat, u.lon, limit])).rows;
  } else {
    const q = `
      SELECT rp.id, rp.title, rp.budget_min_cents, rp.budget_max_cents, NULL::double precision AS dist_m
      FROM campus_cart.roommate_posts rp
      ORDER BY rp.created_at DESC
      LIMIT $1
    `;
    rows = (await db.query(q, [limit])).rows;
  }

  return rows.map(r => ({
    id: r.id,
    title: r.title,
    budget_min_cents: r.budget_min_cents,
    budget_max_cents: r.budget_max_cents,
    score_percent: scoreFromDistance(r.dist_m) // simple heuristic
  }));
}

function scoreFromDistance(dist_m) {
  if (dist_m == null) return 70;
  // 0–10km => 90–100, 10–30km => 70–90, >30km => 50–70
  const km = dist_m / 1000;
  if (km <= 10) return Math.max(90, 100 - Math.round(km));
  if (km <= 30) return 90 - Math.round((km - 10));
  return 70 - Math.min(20, Math.round((km - 30) * 0.5));
}
