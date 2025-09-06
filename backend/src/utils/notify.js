// backend/src/utils/notify.js
import { db } from "../loaders/database.js";

/**
 * Create an in-app notification.
 * @param {number} userId
 * @param {'message_received'|'item_sold'|'price_drop'|'new_match'|'review_received'|'system'} type
 * @param {string} title
 * @param {string} [body]
 * @param {object} [data] - extra payload stored as JSONB
 */
export async function createNotification(userId, type = "system", title, body = null, data = null) {
  if (!userId || !title) return;

  await db.query(
    `
    INSERT INTO campus_cart.notifications (user_id, type, title, body, data)
    VALUES ($1, $2::campus_cart.notification_type, $3, $4, $5::jsonb)
    `,
    [userId, type, title, body, data ? JSON.stringify(data) : null]
  );
}
