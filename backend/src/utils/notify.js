import { db } from "../loaders/database.js";

export async function createNotification(userId, type, title, body, data = {}) {
  await db.query(
    `INSERT INTO campus_cart.notifications (user_id, type, title, body, data)
     VALUES ($1,$2,$3,$4,$5)`,
    [userId, type, title, body || null, data]
  );
}

export async function markNotificationRead(userId, id) {
  await db.query(
    `UPDATE campus_cart.notifications SET is_read=true
     WHERE id=$1 AND user_id=$2`,
    [id, userId]
  );
}
