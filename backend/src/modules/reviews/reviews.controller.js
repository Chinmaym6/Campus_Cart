import * as S from "./reviews.service.js";

export async function createReview(req, res, next) {
  try {
    const reviewerId = req.user.id;
    const { transaction_id, rating, comment } = req.body || {};
    const review = await S.createReview({
      reviewerId,
      transactionId: Number(transaction_id),
      rating: Number(rating),
      comment
    });
    res.status(201).json({ review });
  } catch (e) { next(e); }
}

export async function listReviewsForUser(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const result = await S.listReviewsForUser({ userId });
    res.json(result); // { reviews, average_rating, count }
  } catch (e) { next(e); }
}
