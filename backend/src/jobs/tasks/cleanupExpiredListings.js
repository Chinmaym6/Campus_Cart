import { db } from "../../loaders/database.js";

/**
 * Cleanup logic:
 * - Reopen 'reserved' items older than 72h with no pending transaction
 * - Soft-delete 'active' items older than 120 days (stale)
 */
export async function cleanupExpiredListings() {
  console.log("[jobs] cleanupExpiredListings");
  // reserved -> active if no pending transaction & reserved > 72h
  await db.query(
    `UPDATE campus_cart.items i
     SET status='active', updated_at=now()
     WHERE i.status='reserved'
       AND i.updated_at < now() - interval '72 hours'
       AND NOT EXISTS (
         SELECT 1 FROM campus_cart.transactions t
         WHERE t.item_id = i.id AND t.status = 'pending'
       )`
  );

  // active items older than 120 days -> deleted
  await db.query(
    `UPDATE campus_cart.items
     SET status='deleted', updated_at=now()
     WHERE status='active'
       AND created_at < now() - interval '120 days'`
  );
}
