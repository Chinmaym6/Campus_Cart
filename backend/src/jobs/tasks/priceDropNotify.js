import { db } from "../../loaders/database.js";
import { createNotification } from "../../utils/notify.js";

export async function priceDropNotify() {
  console.log("[jobs] priceDropNotify");
  // find items with price drop in last hour
  const { rows } = await db.query(
    `SELECT iph.item_id, iph.old_price_cents, iph.new_price_cents, i.title
     FROM campus_cart.item_price_history iph
     JOIN campus_cart.items i ON i.id = iph.item_id
     WHERE iph.changed_at >= now() - interval '1 hour'
       AND iph.new_price_cents < iph.old_price_cents`
  );

  for (const r of rows) {
    const { rows: watchers } = await db.query(
      `SELECT user_id FROM campus_cart.saved_items WHERE item_id=$1`,
      [r.item_id]
    );
    for (const w of watchers) {
      await createNotification(
        w.user_id,
        "price_drop",
        "Price dropped",
        `${r.title} is now ${(r.new_price_cents/100).toFixed(2)} (was ${(r.old_price_cents/100).toFixed(2)})`,
        { itemId: r.item_id }
      );
    }
  }
}
