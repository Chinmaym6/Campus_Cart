// import { db } from "../../../loaders/database.js";

// // cover photo join
// const COVER_PHOTO_SQL = `
// LEFT JOIN LATERAL (
//   SELECT p.file_path
//   FROM campus_cart.item_photos p
//   WHERE p.item_id = i.id
//   ORDER BY p.sort_order ASC, p.id ASC
//   LIMIT 1
// ) fp ON TRUE
// `;

// export async function search({ viewerId, q, category_id, min_price, max_price, condition, within_km, sort, page, page_size }) {
//   const viewer = await db.query(
//     `SELECT last_latitude AS lat, last_longitude AS lon FROM campus_cart.users WHERE id = $1`,
//     [viewerId]
//   ).then(r => r.rows[0] || {});
//   const hasLoc = viewer?.lat != null && viewer?.lon != null && within_km;

//   const where = ["i.status = 'active'"];
//   const params = [];
//   let param = 1;

//   if (q) { where.push(`(i.search_vector @@ plainto_tsquery('english',$${param}) OR i.title ILIKE '%' || $${param} || '%')`); params.push(q); param++; }
//   if (category_id) { where.push(`i.category_id = $${param}`); params.push(category_id); param++; }
//   if (min_price != null) { where.push(`i.price_cents >= $${param}`); params.push(min_price); param++; }
//   if (max_price != null) { where.push(`i.price_cents <= $${param}`); params.push(max_price); param++; }
//   if (condition) { where.push(`i.condition = $${param}`); params.push(condition); param++; }
//   if (hasLoc) { where.push(`i.latitude IS NOT NULL AND i.longitude IS NOT NULL`); }

//   const distanceSelect = hasLoc
//     ? `earth_distance(ll_to_earth($${param},$${param+1}), ll_to_earth(i.latitude,i.longitude)) AS dist_m`
//     : `NULL::double precision AS dist_m`;
//   if (hasLoc) { params.push(viewer.lat, viewer.lon); param += 2; }

//   const order = (() => {
//     switch (sort) {
//       case "price_asc": return "ORDER BY i.price_cents ASC, i.id DESC";
//       case "price_desc": return "ORDER BY i.price_cents DESC, i.id DESC";
//       case "distance": return hasLoc ? "ORDER BY dist_m ASC, i.created_at DESC" : "ORDER BY i.created_at DESC";
//       default: return "ORDER BY i.created_at DESC";
//     }
//   })();

//   params.push(page_size, (page - 1) * page_size);
//   const limitOff = `LIMIT $${param} OFFSET $${param+1}`;

//   const sql = `
//     SELECT i.id, i.title, i.price_cents, i.created_at, ${distanceSelect},
//            fp.file_path AS cover_path
//     FROM campus_cart.items i
//     ${COVER_PHOTO_SQL}
//     WHERE ${where.join(" AND ")}
//     ${order}
//     ${limitOff}
//   `;
//   const { rows } = await db.query(sql, params);
//   return rows.map(r => ({
//     id: r.id,
//     title: r.title,
//     price_cents: r.price_cents,
//     created_at: r.created_at,
//     distance_m: r.dist_m ?? null,
//     cover_photo_url: r.cover_path ? `/uploads/${r.cover_path}` : null,
//   }));
// }

// export async function getSavedItems({ viewerId, limit }) {
//   const { rows } = await db.query(
//     `
//     SELECT i.id, i.title, i.price_cents, i.created_at,
//            fp.file_path AS cover_path
//     FROM campus_cart.saved_items s
//     JOIN campus_cart.items i ON i.id = s.item_id
//     ${COVER_PHOTO_SQL}
//     WHERE s.user_id = $1 AND i.status = 'active'
//     ORDER BY s.created_at DESC
//     LIMIT $2
//     `,
//     [viewerId, limit]
//   );
//   return rows.map(r => ({
//     id: r.id,
//     title: r.title,
//     price_cents: r.price_cents,
//     created_at: r.created_at,
//     cover_photo_url: r.cover_path ? `/uploads/${r.cover_path}` : null,
//   }));
// }

// export async function createItem({ sellerId, title, description, category_id, condition, price_cents, is_negotiable, latitude, longitude }) {
//   const { rows } = await db.query(
//     `INSERT INTO campus_cart.items
//      (seller_id, category_id, title, description, condition, price_cents, is_negotiable, latitude, longitude)
//      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
//      RETURNING *`,
//     [sellerId, category_id, title, description || null, condition, price_cents, is_negotiable, latitude ?? null, longitude ?? null]
//   );
//   return rows[0];
// }

// export async function addPhotos(item_id, filenames) {
//   if (!filenames?.length) return;
//   const values = filenames.map((fn, idx) => `($1, $${idx+2}, ${idx})`).join(",");
//   await db.query(
//     `INSERT INTO campus_cart.item_photos (item_id, file_path, sort_order) VALUES ${values}`,
//     [item_id, ...filenames]
//   );
// }

// export async function recordPriceChange({ item_id, old_price, new_price }) {
//   await db.query(
//     `INSERT INTO campus_cart.item_price_history (item_id, old_price_cents, new_price_cents) VALUES ($1,$2,$3)`,
//     [item_id, old_price, new_price]
//   );
// }

// export async function updateItem(id, patch) {
//   const fields = [];
//   const params = [];
//   let p = 1;
//   for (const [k,v] of Object.entries(patch)) {
//     fields.push(`${k} = $${p++}`);
//     params.push(v);
//   }
//   if (!fields.length) return;
//   params.push(id);
//   await db.query(`UPDATE campus_cart.items SET ${fields.join(", ")} WHERE id = $${p}`, params);
// }

// export async function getItemById(id) {
//   const { rows } = await db.query(`SELECT * FROM campus_cart.items WHERE id = $1`, [id]);
//   return rows[0] || null;
// }

// export async function getItemDetails({ viewerId, id }) {
//   const item = await db.query(
//     `
//     SELECT i.*, u.first_name, u.last_name, u.email,
//            EXISTS(
//              SELECT 1 FROM campus_cart.saved_items s WHERE s.user_id = $2 AND s.item_id = i.id
//            ) AS is_saved
//     FROM campus_cart.items i
//     JOIN campus_cart.users u ON u.id = i.seller_id
//     WHERE i.id = $1
//     `,
//     [id, viewerId]
//   ).then(r => r.rows[0]);

//   if (!item) return null;

//   const photos = await db.query(
//     `SELECT id, file_path, sort_order FROM campus_cart.item_photos WHERE item_id = $1 ORDER BY sort_order ASC, id ASC`,
//     [id]
//   ).then(r => r.rows.map(p => ({ id: p.id, url: `/uploads/${p.file_path}`, sort_order: p.sort_order })));

//   return { ...item, photos };
// }

// export async function saveItem({ userId, item_id }) {
//   await db.query(
//     `INSERT INTO campus_cart.saved_items (user_id, item_id)
//      VALUES ($1,$2) ON CONFLICT DO NOTHING`,
//     [userId, item_id]
//   );
// }

// export async function unsaveItem({ userId, item_id }) {
//   await db.query(
//     `DELETE FROM campus_cart.saved_items WHERE user_id = $1 AND item_id = $2`,
//     [userId, item_id]
//   );
// }
import { db } from "../../../loaders/database.js";

const COVER_PHOTO_SQL = `
LEFT JOIN LATERAL (
  SELECT p.file_path
  FROM campus_cart.item_photos p
  WHERE p.item_id = i.id
  ORDER BY p.sort_order ASC, p.id ASC
  LIMIT 1
) fp ON TRUE
`;

export async function search({ viewerId, q, category_id, min_price, max_price, condition, /*within_km, sort,*/ page, page_size }) {
  // 👇 harden pagination against undefined/NaN
  const sizeN = Number.isFinite(page_size) ? page_size : 20;
  const pageN = Number.isFinite(page) ? page : 1;
  const offsetN = (pageN - 1) * sizeN;

  const where = ["i.status = 'active'"];
  const params = [];
  let p = 1;

  if (q) { where.push(`(i.search_vector @@ plainto_tsquery('english',$${p}) OR i.title ILIKE '%' || $${p} || '%')`); params.push(q); p++; }
  if (category_id) { where.push(`i.category_id = $${p}`); params.push(category_id); p++; }
  if (min_price != null) { where.push(`i.price_cents >= $${p}`); params.push(min_price); p++; }
  if (max_price != null) { where.push(`i.price_cents <= $${p}`); params.push(max_price); p++; }
  if (condition) { where.push(`i.condition = $${p}`); params.push(condition); p++; }

  const order = "ORDER BY i.created_at DESC";

  // Remember the parameter numbers before pushing
  const limitParam = p++;
  const offsetParam = p++;

  params.push(sizeN, offsetN);

  const sql = `
    SELECT i.id, i.title, i.price_cents, i.created_at,
           fp.file_path AS cover_path
    FROM campus_cart.items i
    ${COVER_PHOTO_SQL}
    WHERE ${where.join(" AND ")}
    ${order}
    LIMIT $${limitParam} OFFSET $${offsetParam}
  `;

  const { rows } = await db.query(sql, params);
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    price_cents: r.price_cents,
    created_at: r.created_at,
    cover_photo_url: r.cover_path ? `/uploads/${r.cover_path}` : null,
  }));
}

export async function getItemById(id) {
  const { rows } = await db.query(
    `SELECT * FROM campus_cart.items WHERE id = $1`, [id]
  );
  return rows[0] || null;
}

export async function getItemDetails({ viewerId, id }) {
  const { rows } = await db.query(
    `
    WITH photos AS (
      SELECT p.item_id, ARRAY_AGG(p.file_path ORDER BY p.sort_order ASC, p.id ASC) AS paths
      FROM campus_cart.item_photos p
      WHERE p.item_id = $1
      GROUP BY p.item_id
    ),
    saved AS (
      SELECT TRUE AS is_saved
      FROM campus_cart.saved_items s
      WHERE s.item_id = $1 AND s.user_id = $2
      LIMIT 1
    )
    SELECT
      i.id,
      i.title,
      i.description,
      i.price_cents,
      i.condition,
      i.status,
      i.created_at,
      i.updated_at,
      i.latitude,
      i.longitude,
      u.id   AS seller_id,
      u.first_name AS seller_first_name,
      u.last_name  AS seller_last_name,
      u.email      AS seller_email,
      COALESCE(ph.paths, ARRAY[]::text[]) AS photo_paths,
      COALESCE(sv.is_saved, FALSE) AS is_saved
    FROM campus_cart.items i
    JOIN campus_cart.users u ON u.id = i.seller_id
    LEFT JOIN photos ph ON ph.item_id = i.id
    LEFT JOIN saved sv ON TRUE
    WHERE i.id = $1
    `,
    [id, viewerId || null]
  );

  const r = rows[0];
  if (!r) return null;

  return {
    id: r.id,
    title: r.title,
    description: r.description,
    price_cents: r.price_cents,
    condition: r.condition,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
    latitude: r.latitude,
    longitude: r.longitude,
    seller: {
      id: r.seller_id,
      first_name: r.seller_first_name,
      last_name: r.seller_last_name,
      email: r.seller_email
    },
    photos: (r.photo_paths || []).map(p => `/uploads/${p}`),
    is_saved: r.is_saved
  };
}

export async function createItem({
  sellerId, category_id, title, description, condition,
  price_cents, is_negotiable, latitude, longitude
}) {
  const { rows } = await db.query(
    `
    INSERT INTO campus_cart.items
      (seller_id, category_id, title, description, condition, price_cents, is_negotiable, latitude, longitude)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
    `,
    [
      sellerId, category_id, title, description || null, condition,
      price_cents, is_negotiable ?? true, latitude ?? null, longitude ?? null
    ]
  );
  return rows[0];
}

export async function addPhotos(item_id, fileNames = []) {
  if (!fileNames.length) return;
  const values = [];
  const params = [];
  let p = 1;
  fileNames.forEach((fn, idx) => {
    values.push(`($${p++}, $${p++}, $${p++})`);
    params.push(item_id, fn, idx);
  });
  await db.query(
    `INSERT INTO campus_cart.item_photos (item_id, file_path, sort_order) VALUES ${values.join(",")}`,
    params
  );
}

// UPDATE (partial)
export async function updateItem(id, patch) {
  const keys = Object.keys(patch || {});
  if (!keys.length) return;

  const sets = [];
  const params = [];
  let p = 1;

  for (const k of keys) {
    sets.push(`${k} = $${p++}`);
    params.push(patch[k]);
  }
  params.push(id);
  await db.query(
    `UPDATE campus_cart.items SET ${sets.join(", ")}, updated_at = now() WHERE id = $${p}`,
    params
  );
}

// Price history
export async function recordPriceChange({ item_id, old_price, new_price }) {
  await db.query(
    `INSERT INTO campus_cart.item_price_history (item_id, old_price_cents, new_price_cents)
     VALUES ($1,$2,$3)`,
    [item_id, old_price, new_price]
  );
}

// Saved items
export async function saveItem({ userId, item_id }) {
  await db.query(
    `INSERT INTO campus_cart.saved_items (user_id, item_id)
     VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [userId, item_id]
  );
}

export async function unsaveItem({ userId, item_id }) {
  await db.query(
    `DELETE FROM campus_cart.saved_items WHERE user_id = $1 AND item_id = $2`,
    [userId, item_id]
  );
}

export async function getSavedItems({ viewerId, limit = 4 }) {
  const { rows } = await db.query(
    `
    SELECT i.id, i.title, i.price_cents,
           (SELECT p.file_path FROM campus_cart.item_photos p
            WHERE p.item_id = i.id ORDER BY p.sort_order ASC, p.id ASC LIMIT 1) AS cover_path
    FROM campus_cart.saved_items s
    JOIN campus_cart.items i ON i.id = s.item_id
    WHERE s.user_id = $1 AND i.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT $2
    `,
    [viewerId, limit]
  );
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    price_cents: r.price_cents,
    cover_photo_url: r.cover_path ? `/uploads/${r.cover_path}` : null,
  }));
}