import { db } from "../../loaders/database.js";

export async function findById(id) {
  const { rows } = await db.query("SELECT * FROM campus_cart.offers WHERE id = $1", [id]);
  return rows[0];
}

export async function findPendingByBuyerAndItem({ buyerId, itemId }) {
  const { rows } = await db.query(
    "SELECT * FROM campus_cart.offers WHERE buyer_id=$1 AND item_id=$2 AND status='pending' LIMIT 1",
    [buyerId, itemId]
  );
  return rows[0];
}

export async function create({ item_id, buyer_id, amount_cents, message }) {
  const { rows } = await db.query(
    `INSERT INTO campus_cart.offers (item_id,buyer_id,amount_cents,message,status)
     VALUES ($1,$2,$3,$4,'pending') RETURNING *`,
    [item_id, buyer_id, amount_cents, message || null]
  );
  return rows[0];
}

export async function accept(id) {
  await db.query(
    `UPDATE campus_cart.offers SET status='accepted', decided_at=now() WHERE id=$1 AND status='pending'`,
    [id]
  );
}

export async function reject(id) {
  await db.query(
    `UPDATE campus_cart.offers SET status='rejected', decided_at=now() WHERE id=$1 AND status='pending'`,
    [id]
  );
}

export async function withdraw(id) {
  await db.query(
    `UPDATE campus_cart.offers SET status='withdrawn', decided_at=now() WHERE id=$1 AND status='pending'`,
    [id]
  );
}

export async function rejectOthersPending({ itemId, exceptOfferId }) {
  await db.query(
    `UPDATE campus_cart.offers
     SET status='rejected', decided_at=now()
     WHERE item_id=$1 AND status='pending' AND id<>$2`,
    [itemId, exceptOfferId]
  );
}

export async function listForBuyer({ buyerId, limit, offset }) {
  const { rows } = await db.query(
    `
    SELECT o.*, i.title, i.price_cents AS list_price_cents,
           u.first_name AS seller_first_name, u.last_name AS seller_last_name
    FROM campus_cart.offers o
    JOIN campus_cart.items i ON i.id = o.item_id
    JOIN campus_cart.users u ON u.id = i.seller_id
    WHERE o.buyer_id = $1
    ORDER BY o.created_at DESC
    LIMIT $2 OFFSET $3
    `,
    [buyerId, limit, offset]
  );
  return rows;
}

export async function listForSeller({ sellerId, limit, offset }) {
  const { rows } = await db.query(
    `
    SELECT o.*, i.title,
           bu.first_name AS buyer_first_name, bu.last_name AS buyer_last_name, bu.email AS buyer_email
    FROM campus_cart.offers o
    JOIN campus_cart.items i ON i.id = o.item_id
    JOIN campus_cart.users bu ON bu.id = o.buyer_id
    WHERE i.seller_id = $1
    ORDER BY o.created_at DESC
    LIMIT $2 OFFSET $3
    `,
    [sellerId, limit, offset]
  );
  return rows;
}

export async function listForItem({ itemId, limit, offset }) {
  const { rows } = await db.query(
    `
    SELECT o.*, bu.first_name AS buyer_first_name, bu.last_name AS buyer_last_name
    FROM campus_cart.offers o
    JOIN campus_cart.users bu ON bu.id = o.buyer_id
    WHERE o.item_id = $1
    ORDER BY o.created_at DESC
    LIMIT $2 OFFSET $3
    `,
    [itemId, limit, offset]
  );
  return rows;
}
