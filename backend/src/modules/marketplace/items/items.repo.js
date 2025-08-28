import { db } from "../../../loaders/database.js";

export async function createItem(sellerId, p) {
  const { rows } = await db.query(
    `INSERT INTO campus_cart.items
       (seller_id, category_id, title, description, condition, price_cents,
        is_negotiable, isbn, brand, model, latitude, longitude)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [sellerId, p.category_id, p.title, p.description, p.condition, p.price_cents,
     p.is_negotiable, p.isbn, p.brand, p.model, p.latitude, p.longitude]
  );
  return rows[0];
}

export async function addPhoto(itemId, filePath, sortOrder) {
  const { rows } = await db.query(
    `INSERT INTO campus_cart.item_photos (item_id, file_path, sort_order)
     VALUES ($1,$2,$3) RETURNING *`,
    [itemId, filePath, sortOrder]
  );
  return rows[0];
}

export async function getItemPhotos(itemId) {
  const { rows } = await db.query(
    `SELECT id, file_path, sort_order
     FROM campus_cart.item_photos
     WHERE item_id = $1
     ORDER BY sort_order ASC, id ASC`,
    [itemId]
  );
  return rows;
}

export async function getItemByIdBasic(id) {
  const { rows } = await db.query(
    `SELECT * FROM campus_cart.items WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function getItemById(id, viewerId) {
  const { rows } = await db.query(
    `SELECT i.*,
            u.id AS seller_id,
            u.first_name AS seller_first_name,
            u.last_name  AS seller_last_name,
            COALESCE((
              SELECT AVG(r.rating)::numeric(3,2)
              FROM campus_cart.reviews r
              JOIN campus_cart.transactions t ON t.id = r.transaction_id
              WHERE r.reviewee_id = i.seller_id
            ), 0)::float AS seller_rating,
            CASE WHEN $2::bigint IS NULL THEN false ELSE
              EXISTS(SELECT 1 FROM campus_cart.saved_items s
                     WHERE s.user_id = $2 AND s.item_id = i.id)
            END AS is_saved
     FROM campus_cart.items i
     JOIN campus_cart.users u ON u.id = i.seller_id
     WHERE i.id = $1`,
    [id, viewerId ? Number(viewerId) : null]
  );
  return rows[0] || null;
}

export async function updateItem(id, patch) {
  const fields = [];
  const values = [];
  let idx = 1;
  for (const [k,v] of Object.entries(patch)) {
    if (v === undefined) continue;
    fields.push(`${k} = $${idx++}`);
    values.push(v);
  }
  if (!fields.length) {
    const { rows } = await db.query(`SELECT * FROM campus_cart.items WHERE id=$1`, [id]);
    return rows[0];
  }
  values.push(id);
  const { rows } = await db.query(
    `UPDATE campus_cart.items
     SET ${fields.join(", ")}, updated_at = now()
     WHERE id = $${idx}
     RETURNING *`,
    values
  );
  return rows[0];
}

export async function softDeleteItem(id) {
  await db.query(
    `UPDATE campus_cart.items SET status='deleted', updated_at = now() WHERE id=$1`,
    [id]
  );
}

export async function searchItems(filters, { page, pageSize }) {
  const where = [`i.status = $1`];
  const params = [filters.status];
  let idx = params.length + 1;

  if (filters.categoryId) { where.push(`i.category_id = $${idx++}`); params.push(filters.categoryId); }
  if (filters.minPrice != null) { where.push(`i.price_cents >= $${idx++}`); params.push(filters.minPrice); }
  if (filters.maxPrice != null) { where.push(`i.price_cents <= $${idx++}`); params.push(filters.maxPrice); }

  let rankExpr = "0";
  if (filters.q) {
    where.push(`(i.search_vector @@ plainto_tsquery('english', $${idx}) OR i.title ILIKE '%' || $${idx} || '%')`);
    params.push(filters.q); idx++;
    rankExpr = `ts_rank(i.search_vector, plainto_tsquery('english', $${idx-1}))`;
  }

  let distExpr = "NULL";
  if (filters.lat != null && filters.lon != null) {
    distExpr = `earth_distance(ll_to_earth($${idx}, $${idx+1}), ll_to_earth(i.latitude, i.longitude))`;
    params.push(filters.lat, filters.lon); idx += 2;
    if (filters.radiusKm) { where.push(`${distExpr} <= $${idx}`); params.push(filters.radiusKm * 1000); idx++; }
    where.push(`i.latitude IS NOT NULL AND i.longitude IS NOT NULL`);
  }

  let orderBy = "i.created_at DESC";
  if (filters.sort === "price_asc") orderBy = "i.price_cents ASC";
  else if (filters.sort === "price_desc") orderBy = "i.price_cents DESC";
  else if (filters.sort === "distance" && distExpr !== "NULL") orderBy = `${distExpr} ASC, i.created_at DESC`;
  else if (filters.q) orderBy = `${rankExpr} DESC, i.created_at DESC`;

  const offset = (page - 1) * pageSize;

  const base = `
    SELECT i.id, i.title, i.price_cents, i.is_negotiable, i.status,
           i.condition, i.category_id, i.latitude, i.longitude,
           i.created_at,
           ${rankExpr} AS rank,
           ${distExpr} AS meters
    FROM campus_cart.items i
    WHERE ${where.join(" AND ")}
  `;

  const countSql = `SELECT COUNT(*)::int AS total FROM (${base}) q`;
  const dataSql  = `${base} ORDER BY ${orderBy} LIMIT $${idx} OFFSET $${idx+1}`;

  const [{ rows: [{ total }] }, { rows }] = await Promise.all([
    db.query(countSql, params),
    db.query(dataSql, [...params, pageSize, offset])
  ]);

  return { rows, total };
}

export async function getFirstPhotosMap(itemIds) {
  if (!itemIds.length) return {};
  const { rows } = await db.query(
    `SELECT DISTINCT ON (item_id) item_id, file_path
     FROM campus_cart.item_photos
     WHERE item_id = ANY($1)
     ORDER BY item_id, sort_order ASC, id ASC`,
    [itemIds]
  );
  const map = {};
  rows.forEach(r => { map[r.item_id] = r.file_path; });
  return map;
}

export async function getSavedMap(userId, itemIds) {
  if (!itemIds.length) return {};
  const { rows } = await db.query(
    `SELECT item_id FROM campus_cart.saved_items
     WHERE user_id = $1 AND item_id = ANY($2)`,
    [userId, itemIds]
  );
  const map = {};
  rows.forEach(r => { map[r.item_id] = true; });
  return map;
}

export async function saveItem(userId, itemId) {
  await db.query(
    `INSERT INTO campus_cart.saved_items (user_id, item_id)
     VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [userId, itemId]
  );
}
export async function unsaveItem(userId, itemId) {
  await db.query(
    `DELETE FROM campus_cart.saved_items WHERE user_id=$1 AND item_id=$2`,
    [userId, itemId]
  );
}
