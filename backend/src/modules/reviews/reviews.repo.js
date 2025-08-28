import { db } from "../../loaders/database.js";

export async function getTransactionForReview(transactionId) {
  const { rows } = await db.query(
    `SELECT id, seller_id, buyer_id, status
     FROM campus_cart.transactions
     WHERE id=$1`,
    [transactionId]
  );
  return rows[0] || null;
}

export async function checkAlreadyReviewed(transactionId, reviewerId) {
  const { rows } = await db.query(
    `SELECT 1 FROM campus_cart.reviews
     WHERE transaction_id=$1 AND reviewer_id=$2`,
    [transactionId, reviewerId]
  );
  return !!rows[0];
}

export async function createReview({ transactionId, reviewerId, revieweeId, rating, comment }) {
  const { rows } = await db.query(
    `INSERT INTO campus_cart.reviews
       (transaction_id, reviewer_id, reviewee_id, rating, comment)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [transactionId, reviewerId, revieweeId, rating, comment || null]
  );
  return rows[0];
}

export async function listReviewsForUser(userId) {
  const { rows } = await db.query(
    `SELECT r.*, u.first_name AS reviewer_first_name, u.last_name AS reviewer_last_name
     FROM campus_cart.reviews r
     JOIN campus_cart.users u ON u.id = r.reviewer_id
     WHERE r.reviewee_id = $1
     ORDER BY r.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function getUserRatingSummary(userId) {
  const { rows } = await db.query(
    `SELECT COALESCE(AVG(rating),0)::numeric(3,2) AS avg, COUNT(*)::int AS count
     FROM campus_cart.reviews
     WHERE reviewee_id=$1`,
    [userId]
  );
  return { avg: Number(rows[0].avg), count: rows[0].count };
}
