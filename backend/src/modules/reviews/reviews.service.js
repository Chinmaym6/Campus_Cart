import * as R from "./reviews.repo.js";

export async function createReview({ reviewerId, transactionId, rating, comment }) {
  if (!transactionId || !Number.isFinite(rating) || rating < 1 || rating > 5) {
    const e = new Error("transaction_id and rating 1..5 are required"); e.status=400; throw e;
  }
  const tx = await R.getTransactionForReview(transactionId);
  if (!tx) { const e=new Error("Transaction not found"); e.status=404; throw e; }
  if (tx.status !== "completed") { const e=new Error("Reviews allowed only after completion"); e.status=400; throw e; }
  if (tx.seller_id !== reviewerId && tx.buyer_id !== reviewerId) { const e=new Error("Forbidden"); e.status=403; throw e; }

  const revieweeId = (tx.seller_id === reviewerId) ? tx.buyer_id : tx.seller_id;
  const already = await R.checkAlreadyReviewed(transactionId, reviewerId);
  if (already) { const e=new Error("You already reviewed this transaction"); e.status=409; throw e; }

  return R.createReview({ transactionId, reviewerId, revieweeId, rating, comment });
}

export async function listReviewsForUser({ userId }) {
  const reviews = await R.listReviewsForUser(userId);
  const { avg, count } = await R.getUserRatingSummary(userId);
  return { reviews, average_rating: avg, count };
}
