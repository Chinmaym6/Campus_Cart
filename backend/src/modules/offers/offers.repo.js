import { db } from "../../loaders/database.js";
import { pool } from "../../loaders/database.js";

export async function getItemForOffer(itemId) {
  const { rows } = await db.query(
    `SELECT id, seller_id, status, is_negotiable
     FROM campus_cart.items WHERE id = $1`,
    [itemId]
  );
  return rows[0] || null;
}

export async function createOffer({ itemId, buyerId, amountCents, message }) {
  const { rows } = await db.query(
    `INSERT INTO campus_cart.offers (item_id, buyer_id, amount_cents, message)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [itemId, buyerId, amountCents, message || null]
  );
  return rows[0];
}

export async function listOffersForItem(itemId) {
  const { rows } = await db.query(
    `SELECT o.*, u.first_name AS buyer_first_name, u.last_name AS buyer_last_name
     FROM campus_cart.offers o
     JOIN campus_cart.users u ON u.id = o.buyer_id
     WHERE o.item_id = $1
     ORDER BY o.created_at DESC`,
    [itemId]
  );
  return rows;
}

export async function listOffersByBuyer(buyerId) {
  const { rows } = await db.query(
    `SELECT o.*, i.title, i.price_cents AS item_price, i.status AS item_status
     FROM campus_cart.offers o
     JOIN campus_cart.items i ON i.id = o.item_id
     WHERE o.buyer_id = $1
     ORDER BY o.created_at DESC`,
    [buyerId]
  );
  return rows;
}

export async function getOfferForAction(offerId) {
  const { rows } = await db.query(
    `SELECT o.*, i.seller_id, i.status AS item_status
     FROM campus_cart.offers o
     JOIN campus_cart.items i ON i.id = o.item_id
     WHERE o.id = $1`,
    [offerId]
  );
  return rows[0] || null;
}

export async function setOfferStatus(offerId, next) {
  await db.query(
    `UPDATE campus_cart.offers
     SET status = $1, decided_at = CASE WHEN $1 IN ('accepted','rejected','withdrawn','expired') THEN now() ELSE decided_at END
     WHERE id = $2`,
    [next, offerId]
  );
}

export async function acceptOfferTx({ sellerId, offerId }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock offer + item row
    const { rows: offerRows } = await client.query(
      `SELECT o.*, i.seller_id, i.status AS item_status, i.id AS item_id
       FROM campus_cart.offers o
       JOIN campus_cart.items i ON i.id = o.item_id
       WHERE o.id = $1
       FOR UPDATE`,
      [offerId]
    );
    const offer = offerRows[0];
    if (!offer) { const e=new Error("Offer not found"); e.status=404; throw e; }
    if (offer.seller_id !== sellerId) { const e=new Error("Forbidden"); e.status=403; throw e; }
    if (offer.status !== "pending") { const e=new Error("Only pending offers can be accepted"); e.status=400; throw e; }
    if (offer.item_status !== "active" && offer.item_status !== "reserved") {
      const e=new Error("Item must be active/reserved to accept"); e.status=400; throw e;
    }

    // Mark chosen offer accepted
    await client.query(
      `UPDATE campus_cart.offers
       SET status='accepted', decided_at=now()
       WHERE id=$1`,
      [offerId]
    );

    // Reject other pending offers for the same item
    await client.query(
      `UPDATE campus_cart.offers
       SET status='rejected', decided_at=now()
       WHERE item_id=$1 AND id<>$2 AND status='pending'`,
      [offer.item_id, offerId]
    );

    // Reserve the item
    await client.query(
      `UPDATE campus_cart.items
       SET status='reserved', updated_at=now()
       WHERE id=$1`,
      [offer.item_id]
    );

    // Ensure there isn't an existing live transaction for this item
    const { rows: txCheck } = await client.query(
      `SELECT id, status FROM campus_cart.transactions WHERE item_id=$1`,
      [offer.item_id]
    );
    if (txCheck[0] && txCheck[0].status !== "canceled") {
      const e = new Error("Transaction already exists for this item"); e.status=409; throw e;
    }
    if (txCheck[0] && txCheck[0].status === "canceled") {
      // overwrite a canceled transaction
      await client.query(
        `UPDATE campus_cart.transactions
         SET buyer_id=$1, seller_id=$2, agreed_price_cents=$3, status='pending', updated_at=now()
         WHERE id=$4`,
        [offer.buyer_id, offer.seller_id, offer.amount_cents, txCheck[0].id]
      );
      const { rows: txRow } = await client.query(
        `SELECT * FROM campus_cart.transactions WHERE id=$1`,
        [txCheck[0].id]
      );
      await client.query("COMMIT");
      return { offerId, transaction: txRow[0] };
    }

    // Create new transaction
    const { rows: txRows } = await client.query(
      `INSERT INTO campus_cart.transactions
         (item_id, seller_id, buyer_id, agreed_price_cents, status)
       VALUES ($1,$2,$3,$4,'pending')
       RETURNING *`,
      [offer.item_id, offer.seller_id, offer.buyer_id, offer.amount_cents]
    );

    await client.query("COMMIT");
    return { offerId, transaction: txRows[0] };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
