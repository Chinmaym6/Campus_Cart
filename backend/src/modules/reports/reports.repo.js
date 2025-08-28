import { db } from "../../loaders/database.js";

export async function createReport(reporterId, p) {
  const { rows } = await db.query(
    `INSERT INTO campus_cart.reports
       (reporter_id, target_type, target_id, reason, details)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [reporterId, p.target_type, p.target_id, p.reason, p.details]
  );
  return rows[0];
}

export async function listReports({ reporterId = null, page = 1, pageSize = 20 }) {
  const offset = (page - 1) * pageSize;
  const where = [];
  const params = [];
  let idx = 1;
  if (reporterId) { where.push(`r.reporter_id = $${idx++}`); params.push(reporterId); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const base = `
    SELECT r.*, u.first_name AS reporter_first_name, u.last_name AS reporter_last_name
    FROM campus_cart.reports r
    JOIN campus_cart.users u ON u.id = r.reporter_id
    ${whereSql}
  `;
  const countSql = `SELECT COUNT(*)::int AS total FROM (${base}) q`;
  const dataSql = `${base} ORDER BY r.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`;

  const [{ rows: [{ total }] }, { rows }] = await Promise.all([
    db.query(countSql, params),
    db.query(dataSql, [...params, pageSize, offset])
  ]);

  return { reports: rows, page, pageSize, total };
}

export async function resolveReport(id, resolverUserId) {
  const { rows } = await db.query(
    `UPDATE campus_cart.reports
     SET resolved_at = now(), resolved_by = $2
     WHERE id = $1
     RETURNING *`,
    [id, resolverUserId]
  );
  return rows[0] || null;
}
