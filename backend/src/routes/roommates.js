import express from 'express';
import { body, param, query } from 'express-validator';
import * as roommatesController from '../controllers/roommateController.js';
import { auth, optionalAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { upload, processImages } from '../config/aws.js';

const router = express.Router();

// Roommate post validation
const createPostValidation = [
    body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required'),
    body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be 10-1000 characters'),
    body('budget_min').isFloat({ min: 0 }).withMessage('Minimum budget must be positive'),
    body('budget_max').isFloat({ min: 0 }).withMessage('Maximum budget must be positive'),
    body('housing_type').isIn(['dorm', 'apartment', 'house', 'studio']).withMessage('Invalid housing type'),
    body('preferred_location').isIn(['on_campus', 'near_campus', 'downtown', 'suburbs', 'anywhere']),
    body('move_in_date').optional().isISO8601().toDate(),
    body('lease_duration_months').optional().isInt({ min: 1, max: 24 }),
    body('gender_preference').optional().isIn(['male', 'female', 'any', 'non_binary']),
    body('cleanliness_level').optional().isInt({ min: 1, max: 5 }),
    body('noise_tolerance').optional().isInt({ min: 1, max: 5 }),
    body('social_level').optional().isInt({ min: 1, max: 5 }),
    body('smoking_allowed').optional().isBoolean(),
    body('pets_allowed').optional().isBoolean(),
    body('alcohol_friendly').optional().isBoolean()
];

// Search validation
const searchValidation = [
    query('q').optional().trim().isLength({ max: 100 }),
    query('min_budget').optional().isFloat({ min: 0 }),
    query('max_budget').optional().isFloat({ min: 0 }),
    query('housing_type').optional().isIn(['dorm', 'apartment', 'house', 'studio']),
    query('preferred_location').optional().isIn(['on_campus', 'near_campus', 'downtown', 'suburbs', 'anywhere']),
    query('gender_preference').optional().isIn(['male', 'female', 'any', 'non_binary']),
    query('latitude').optional().isFloat({ min: -90, max: 90 }),
    query('longitude').optional().isFloat({ min: -180, max: 180 }),
    query('radius').optional().isFloat({ min: 0, max: 100 }),
    query('sort').optional().isIn(['newest', 'budget_low', 'budget_high', 'move_in_date']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
];

// Compatibility preferences validation
const compatibilityValidation = [
    body('cleanliness').optional().isInt({ min: 1, max: 5 }),
    body('noise_level').optional().isInt({ min: 1, max: 5 }),
    body('social_level').optional().isInt({ min: 1, max: 5 }),
    body('sleep_schedule').optional().isInt({ min: 1, max: 5 }),
    body('study_habits').optional().isInt({ min: 1, max: 5 }),
    body('cooking_habits').optional().isInt({ min: 1, max: 5 }),
    body('sharing_comfort').optional().isInt({ min: 1, max: 5 }),
    body('pet_preference').optional().isInt({ min: 1, max: 5 }),
    body('deal_breakers').optional().isArray()
];

// Set upload folder for roommate posts
const setRoommateUploadFolder = (req, res, next) => {
    req.uploadFolder = 'roommates';
    next();
};

// Public routes
router.get('/', searchValidation, validateRequest, optionalAuth, roommatesController.searchPosts);

// Protected routes
router.use(auth);

// User's roommate posts - must be defined before /:id to avoid being treated as an ID parameter
router.get('/user/posts', roommatesController.getUserPosts);

// Create roommate post
router.post('/',
    setRoommateUploadFolder,
    upload.array('images', 5),
    processImages,
    createPostValidation,
    validateRequest,
    roommatesController.createPost
);

// Compatibility preferences
router.get('/preferences', roommatesController.getPreferences);
router.post('/preferences', compatibilityValidation, validateRequest, roommatesController.savePreferences);
router.put('/preferences', compatibilityValidation, validateRequest, roommatesController.updatePreferences);

// Compatibility matching
router.get('/matches', roommatesController.getCompatibilityMatches);
router.get('/matches/analytics', roommatesController.getMatchingAnalytics);

// Get post by ID - must be after specific routes to avoid capturing them as IDs
router.get('/:id', param('id').isUUID(), validateRequest, optionalAuth, roommatesController.getPostById);

// Update roommate post
router.put('/:id',
    param('id').isUUID(),
    setRoommateUploadFolder,
    upload.array('images', 5),
    processImages,
    createPostValidation,
    validateRequest,
    roommatesController.updatePost
);

// Delete roommate post
router.delete('/:id', param('id').isUUID(), validateRequest, roommatesController.deletePost);

export default router;
