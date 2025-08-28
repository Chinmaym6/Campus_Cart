import { db, pool } from "../../loaders/database.js";

export async function getTransaction(id) {
  const { rows } = await db.query(
    `SELECT * FROM campus_cart.transactions WHERE id=$1`,
    [id]
  );
  return rows[0] || null;
}

export async function completeTransaction(id, { metAt, locationNote, itemId }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: txRows } = await client.query(
      `UPDATE campus_cart.transactions
       SET status='completed', met_at = COALESCE($2, now()), location_note = COALESCE($3, location_note), updated_at=now()
       WHERE id=$1
       RETURNING *`,
      [id, metAt ? new Date(metAt) : null, locationNote || null]
    );

    await client.query(
      `UPDATE campus_cart.items
       SET status='sold', updated_at=now()
       WHERE id=$1`,
      [itemId]
    );

    await client.query("COMMIT");
    return txRows[0];
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function cancelTransaction(id, { itemId }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: txRows } = await client.query(
      `UPDATE campus_cart.transactions
       SET status='canceled', updated_at=now()
       WHERE id=$1
       RETURNING *`,
      [id]
    );

    // Put item back to active (only if not deleted/sold)
    await client.query(
      `UPDATE campus_cart.items
       SET status='active', updated_at=now()
       WHERE id=$1 AND status <> 'deleted'`,
      [itemId]
    );

    await client.query("COMMIT");
    return txRows[0];
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
