import { db } from "../../loaders/database.js";

export async function create({ item_id, seller_id, buyer_id, agreed_price_cents }) {
  const { rows } = await db.query(
    `INSERT INTO campus_cart.transactions (item_id,seller_id,buyer_id,agreed_price_cents,status)
     VALUES ($1,$2,$3,$4,'pending') RETURNING *`,
    [item_id, seller_id, buyer_id, agreed_price_cents]
  );
  return rows[0];
}
