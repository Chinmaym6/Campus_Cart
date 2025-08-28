import { db } from "../../loaders/database.js";

// CREATE
export async function createPost(userId, p) {
  const { rows } = await db.query(
    `INSERT INTO campus_cart.roommate_posts
       (user_id, title, description, budget_min_cents, budget_max_cents,
        preferred_lat, preferred_lon, move_in_date, lease_months, housing, gender_pref,
        cleanliness_level, noise_tolerance, guests_level, sleep, study_style, social_level,
        smoking, pets, alcohol)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     RETURNING *`,
    [userId, p.title, p.description, p.budget_min_cents, p.budget_max_cents,
     p.preferred_lat, p.preferred_lon, p.move_in_date, p.lease_months, p.housing, p.gender_pref,
     p.cleanliness_level, p.noise_tolerance, p.guests_level, p.sleep, p.study_style, p.social_level,
     p.smoking, p.pets, p.alcohol]
  );
  return rows[0];
}

export async function getPostById(id) {
  const { rows } = await db.query(
    `SELECT * FROM campus_cart.roommate_posts WHERE id=$1`,
    [id]
  );
  return rows[0] || null;
}

export async function getLatestPostForUser(userId) {
  const { rows } = await db.query(
    `SELECT * FROM campus_cart.roommate_posts
     WHERE user_id=$1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

export async function updatePost(id, patch) {
  const fields = [];
  const values = [];
  let idx = 1;
  for (const [k,v] of Object.entries(patch)) {
    fields.push(`${k} = $${idx++}`);
    values.push(v);
  }
  values.push(id);
  const { rows } = await db.query(
    `UPDATE campus_cart.roommate_posts
     SET ${fields.join(", ")}, updated_at=now()
     WHERE id=$${idx}
     RETURNING *`,
    values
  );
  return rows[0];
}

export async function deletePost(id) {
  await db.query(`DELETE FROM campus_cart.roommate_posts WHERE id=$1`, [id]);
}

// Distance (earthdistance)
export async function getDistanceMeters(a, b) {
  if (a?.preferred_lat == null || a?.preferred_lon == null || b?.preferred_lat == null || b?.preferred_lon == null) return null;
  const { rows } = await db.query(
    `SELECT earth_distance(
        ll_to_earth($1,$2),
        ll_to_earth($3,$4)
     ) AS meters`,
    [a.preferred_lat, a.preferred_lon, b.preferred_lat, b.preferred_lon]
  );
  return rows[0]?.meters ?? null;
}

// Cache
export async function upsertMatch(viewerId, postId, score, breakdown) {
  await db.query(
    `INSERT INTO campus_cart.roommate_matches (viewer_id, post_id, score_percent, breakdown)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (viewer_id, post_id)
     DO UPDATE SET score_percent=EXCLUDED.score_percent, breakdown=EXCLUDED.breakdown, created_at=now()`,
    [viewerId, postId, score, breakdown]
  );
}
export async function deleteCachedMatchesForPost(postId) {
  await db.query(`DELETE FROM campus_cart.roommate_matches WHERE post_id=$1`, [postId]);
}
export async function listCachedMatches(viewerId, minScore, { page, pageSize }) {
  const offset = (page - 1) * pageSize;
  const base = `
    SELECT rm.*, rp.title, rp.description, rp.budget_min_cents, rp.budget_max_cents,
           rp.preferred_lat, rp.preferred_lon, rp.move_in_date, rp.housing, rp.gender_pref
    FROM campus_cart.roommate_matches rm
    JOIN campus_cart.roommate_posts rp ON rp.id = rm.post_id
    WHERE rm.viewer_id = $1 AND rm.score_percent >= $2
  `;
  const countSql = `SELECT COUNT(*)::int AS total FROM (${base}) q`;
  const dataSql  = `${base} ORDER BY rm.score_percent DESC, rm.created_at DESC LIMIT $3 OFFSET $4`;

  const [{ rows: [{ total }] }, { rows }] = await Promise.all([
    db.query(countSql, [viewerId, minScore]),
    db.query(dataSql, [viewerId, minScore, pageSize, offset])
  ]);
  return { rows, total };
}

// Search / browse
export async function searchPosts(filters, { page, pageSize }) {
  const where = [];
  const params = [];
  let idx = 1;

  if (filters.q) {
    where.push(`(rp.search_vector @@ plainto_tsquery('english', $${idx}) OR rp.title ILIKE '%' || $${idx} || '%')`);
    params.push(filters.q); idx++;
  }
  if (filters.budgetMin != null) { where.push(`rp.budget_max_cents >= $${idx}`); params.push(filters.budgetMin); idx++; }
  if (filters.budgetMax != null) { where.push(`rp.budget_min_cents <= $${idx}`); params.push(filters.budgetMax); idx++; }
  if (filters.fromDate) { where.push(`rp.move_in_date IS NULL OR rp.move_in_date >= $${idx}`); params.push(filters.fromDate); idx++; }
  if (filters.toDate)   { where.push(`rp.move_in_date IS NULL OR rp.move_in_date <= $${idx}`); params.push(filters.toDate); idx++; }
  if (filters.housing)  { where.push(`rp.housing = $${idx}`); params.push(filters.housing); idx++; }
  if (filters.gender)   { where.push(`(rp.gender_pref = 'any' OR rp.gender_pref = $${idx})`); params.push(filters.gender); idx++; }

  let distExpr = "NULL";
  if (filters.lat != null && filters.lon != null) {
    where.push(`rp.preferred_lat IS NOT NULL AND rp.preferred_lon IS NOT NULL`);
    distExpr = `earth_distance(ll_to_earth($${idx},$${idx+1}), ll_to_earth(rp.preferred_lat,rp.preferred_lon))`;
    params.push(filters.lat, filters.lon); idx += 2;
    if (filters.radiusKm) { where.push(`${distExpr} <= $${idx}`); params.push(filters.radiusKm * 1000); idx++; }
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  let orderBy = "rp.created_at DESC";
  if (filters.sort === "distance" && distExpr !== "NULL") orderBy = `${distExpr} ASC, rp.created_at DESC`;

  const offset = (page - 1) * pageSize;
  const base = `
    SELECT rp.*, ${distExpr} AS meters
    FROM campus_cart.roommate_posts rp
    ${whereSql}
  `;
  const countSql = `SELECT COUNT(*)::int AS total FROM (${base}) q`;
  const dataSql = `${base} ORDER BY ${orderBy} LIMIT $${idx} OFFSET $${idx+1}`;

  const [{ rows: [{ total }] }, { rows }] = await Promise.all([
    db.query(countSql, params),
    db.query(dataSql, [...params, pageSize, offset])
  ]);

  return { posts: rows, page, pageSize, total };
}
