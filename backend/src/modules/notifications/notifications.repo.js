import { db } from "../../loaders/database.js";

export async function listNotifications(userId, { page, pageSize, unreadOnly }) {
  const offset = (page - 1) * pageSize;
  const where = [`user_id=$1`];
  const params = [userId];
  if (unreadOnly) where.push(`is_read=false`);
  const whereSql = where.join(" AND ");

  const [{ rows: [{ total }] }, { rows }] = await Promise.all([
    db.query(`SELECT COUNT(*)::int AS total FROM campus_cart.notifications WHERE ${whereSql}`, params),
    db.query(
      `SELECT id, type, title, body, data, is_read, created_at
       FROM campus_cart.notifications
       WHERE ${whereSql}
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    )
  ]);

  return { notifications: rows, page, pageSize, total };
}

export async function markRead(userId, id) {
  await db.query(
    `UPDATE campus_cart.notifications SET is_read=true
     WHERE id=$1 AND user_id=$2`,
    [id, userId]
  );
}

export async function markAllRead(userId) {
  await db.query(
    `UPDATE campus_cart.notifications SET is_read=true WHERE user_id=$1`,
    [userId]
  );
}

export async function getSettings(userId) {
  const { rows } = await db.query(
    `SELECT user_id, email_enabled, push_enabled, digest_email, created_at, updated_at
     FROM campus_cart.user_notification_settings WHERE user_id=$1`,
    [userId]
  );
  if (rows[0]) return rows[0];
  // create defaults if not exist
  const { rows: created } = await db.query(
    `INSERT INTO campus_cart.user_notification_settings (user_id)
     VALUES ($1) RETURNING *`,
    [userId]
  );
  return created[0];
}

export async function updateSettings(userId, body) {
  const current = await getSettings(userId);
  const patch = {
    email_enabled: body.email_enabled ?? current.email_enabled,
    push_enabled: body.push_enabled ?? current.push_enabled,
    digest_email: body.digest_email ?? current.digest_email
  };
  const { rows } = await db.query(
    `UPDATE campus_cart.user_notification_settings
     SET email_enabled=$2, push_enabled=$3, digest_email=$4, updated_at=now()
     WHERE user_id=$1 RETURNING *`,
    [userId, patch.email_enabled, patch.push_enabled, patch.digest_email]
  );
  return rows[0];
}
