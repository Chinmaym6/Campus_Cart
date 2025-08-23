import { pool, withTransaction } from '../config/database.js';

// Create Review
export const createReview = async (req, res) => {
    try {
        const { reviewee_id, rating, comment, item_id, is_public = true } = req.body;
        const reviewer_id = req.user.userId;

        // Prevent self-review
        if (reviewer_id === reviewee_id) {
            return res.status(400).json({
                success: false,
                message: "You cannot review yourself"
            });
        }

        // Check if review already exists
        const existingReview = await pool.query(
            'SELECT id FROM reviews WHERE reviewer_id = $1 AND reviewee_id = $2 AND item_id = $3',
            [reviewer_id, reviewee_id, item_id || null]
        );

        if (existingReview.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "You have already reviewed this user for this transaction"
            });
        }

        // Verify transaction occurred (if item_id provided)
        if (item_id) {
            const transactionCheck = await pool.query(
                `SELECT t.id FROM transactions t
                 JOIN items i ON t.item_id = i.id
                 WHERE t.item_id = $1 AND t.buyer_id = $2 AND i.seller_id = $3 AND t.status = 'completed'`,
                [item_id, reviewer_id, reviewee_id]
            );

            if (transactionCheck.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "You can only review users you've completed transactions with"
                });
            }
        }

        const result = await pool.query(
            `INSERT INTO reviews (reviewer_id, reviewee_id, item_id, rating, comment, is_public)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [reviewer_id, reviewee_id, item_id || null, rating, comment, is_public]
        );

        // Get reviewer info for response
        const reviewerResult = await pool.query(
            'SELECT first_name, last_name, profile_picture_url FROM users WHERE id = $1',
            [reviewer_id]
        );

        const review = {
            ...result.rows[0],
            reviewer_name: `${reviewerResult.rows.first_name} ${reviewerResult.rows.last_name}`,
            reviewer_avatar: reviewerResult.rows.profile_picture_url
        };

        res.status(201).json({
            success: true,
            message: 'Review submitted successfully! ⭐',
            data: { review }
        });

    } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting review'
        });
    }
};

// Get User Reviews (Received)
export const getUserReviews = async (req, res) => {
    try {
        const { id: userId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const query = `
            SELECT r.*, 
                   reviewer.first_name as reviewer_first_name,
                   reviewer.last_name as reviewer_last_name,
                   reviewer.profile_picture_url as reviewer_avatar,
                   i.title as item_title,
                   i.images as item_images
            FROM reviews r
            JOIN users reviewer ON r.reviewer_id = reviewer.id
            LEFT JOIN items i ON r.item_id = i.id
            WHERE r.reviewee_id = $1 AND r.is_public = true
            ORDER BY r.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await pool.query(query, [userId, parseInt(limit), offset]);

        // Get review stats
        const statsQuery = `
            SELECT 
                COUNT(*) as total_reviews,
                AVG(rating) as average_rating,
                COUNT(*) FILTER (WHERE rating = 5) as five_star,
                COUNT(*) FILTER (WHERE rating = 4) as four_star,
                COUNT(*) FILTER (WHERE rating = 3) as three_star,
                COUNT(*) FILTER (WHERE rating = 2) as two_star,
                COUNT(*) FILTER (WHERE rating = 1) as one_star
            FROM reviews
            WHERE reviewee_id = $1 AND is_public = true
        `;

        const statsResult = await pool.query(statsQuery, [userId]);
        const stats = {
            ...statsResult.rows[0],
            total_reviews: parseInt(statsResult.rows.total_reviews),
            average_rating: parseFloat(statsResult.rows.average_rating || 0),
            five_star: parseInt(statsResult.rows.five_star),
            four_star: parseInt(statsResult.rows.four_star),
            three_star: parseInt(statsResult.rows.three_star),
            two_star: parseInt(statsResult.rows.two_star),
            one_star: parseInt(statsResult.rows.one_star)
        };

        const reviews = result.rows.map(review => ({
            ...review,
            item_images: review.item_images ? JSON.parse(review.item_images) : null
        }));

        res.json({
            success: true,
            data: { reviews, stats }
        });

    } catch (error) {
        console.error('Error fetching user reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching reviews'
        });
    }
};

// Get Item Reviews
export const getItemReviews = async (req, res) => {
    try {
        const { id: itemId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const query = `
            SELECT r.*, 
                   reviewer.first_name as reviewer_first_name,
                   reviewer.last_name as reviewer_last_name,
                   reviewer.profile_picture_url as reviewer_avatar
            FROM reviews r
            JOIN users reviewer ON r.reviewer_id = reviewer.id
            WHERE r.item_id = $1 AND r.is_public = true
            ORDER BY r.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await pool.query(query, [itemId, parseInt(limit), offset]);

        res.json({
            success: true,
            data: { reviews: result.rows }
        });

    } catch (error) {
        console.error('Error fetching item reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching item reviews'
        });
    }
};

// Update Review
export const updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment, is_public } = req.body;
        const userId = req.user.userId;

        // Check if user owns the review
        const reviewCheck = await pool.query(
            'SELECT reviewer_id FROM reviews WHERE id = $1',
            [id]
        );

        if (reviewCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        if (reviewCheck.rows[0].reviewer_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this review'
            });
        }

        const result = await pool.query(
            `UPDATE reviews 
             SET rating = COALESCE($1, rating),
                 comment = COALESCE($2, comment),
                 is_public = COALESCE($3, is_public),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [rating, comment, is_public, id]
        );

        res.json({
            success: true,
            message: 'Review updated successfully',
            data: { review: result.rows[0] }
        });

    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating review'
        });
    }
};

// Delete Review
export const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        // Check ownership
        const reviewCheck = await pool.query(
            'SELECT reviewer_id FROM reviews WHERE id = $1',
            [id]
        );

        if (reviewCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        if (reviewCheck.rows[0].reviewer_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this review'
            });
        }

        await pool.query('DELETE FROM reviews WHERE id = $1', [id]);

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting review'
        });
    }
};

// Get User's Given Reviews
export const getGivenReviews = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const query = `
            SELECT r.*, 
                   reviewee.first_name as reviewee_first_name,
                   reviewee.last_name as reviewee_last_name,
                   reviewee.profile_picture_url as reviewee_avatar,
                   i.title as item_title,
                   i.images as item_images
            FROM reviews r
            JOIN users reviewee ON r.reviewee_id = reviewee.id
            LEFT JOIN items i ON r.item_id = i.id
            WHERE r.reviewer_id = $1
            ORDER BY r.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await pool.query(query, [userId, parseInt(limit), offset]);

        const reviews = result.rows.map(review => ({
            ...review,
            item_images: review.item_images ? JSON.parse(review.item_images) : null
        }));

        res.json({
            success: true,
            data: { reviews }
        });

    } catch (error) {
        console.error('Error fetching given reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching your reviews'
        });
    }
};
