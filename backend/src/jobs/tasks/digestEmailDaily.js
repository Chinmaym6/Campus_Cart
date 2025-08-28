import { db } from "../../loaders/database.js";
import { sendEmail } from "../../utils/mailer.js";

export async function digestEmailDaily() {
  console.log("[jobs] digestEmailDaily");
  // users who want daily digest
  const { rows: users } = await db.query(
    `SELECT u.id, u.email
     FROM campus_cart.users u
     JOIN campus_cart.user_notification_settings s ON s.user_id = u.id
     WHERE s.digest_email = true`
  );

  for (const u of users) {
    const { rows: notes } = await db.query(
      `SELECT type, title, body, created_at
       FROM campus_cart.notifications
       WHERE user_id=$1 AND is_read=false
       ORDER BY created_at DESC
       LIMIT 20`,
      [u.id]
    );

    if (!notes.length) continue;

    const lines = notes.map(n => `• [${n.type}] ${n.title}${n.body ? " — " + n.body : ""}`).join("\n");
    await sendEmail(u.email, "Your Campus Cart daily digest", `You have unread notifications:\n\n${lines}\n\nVisit the app to view.`);
  }
}
