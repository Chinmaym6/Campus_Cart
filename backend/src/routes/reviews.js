import express from 'express';
import { body, param, query } from 'express-validator';
import * as reviewsController from '../controllers/reviewController.js';
import { auth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

// Review validation
const reviewValidation = [
    body('reviewee_id').isUUID().withMessage('Valid reviewee ID required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comment max 500 characters'),
    body('item_id').optional().isUUID(),
    body('is_public').optional().isBoolean()
];

// Get reviews for user
router.get('/user/:id', 
    param('id').isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 20 }),
    validateRequest,
    reviewsController.getUserReviews
);

// Get reviews for item
router.get('/item/:id',
    param('id').isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 20 }),
    validateRequest,
    reviewsController.getItemReviews
);

// Protected routes
router.use(auth);

// Submit review
router.post('/', reviewValidation, validateRequest, reviewsController.createReview);

// Update review
router.put('/:id',
    param('id').isUUID(),
    reviewValidation,
    validateRequest,
    reviewsController.updateReview
);

// Delete review
router.delete('/:id', param('id').isUUID(), validateRequest, reviewsController.deleteReview);

// Get user's given reviews
router.get('/given', reviewsController.getGivenReviews);

export default router;
