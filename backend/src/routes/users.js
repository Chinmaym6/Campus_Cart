import express from 'express';
import { body, param, query } from 'express-validator';
import * as usersController from '../controllers/userController.js';
import { auth, optionalAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { upload, processImages } from '../config/aws.js';

const router = express.Router();

// Profile update validation
const updateProfileValidation = [
    body('first_name').optional().trim().isLength({ min: 1, max: 100 }),
    body('last_name').optional().trim().isLength({ min: 1, max: 100 }),
    body('bio').optional().trim().isLength({ max: 500 }),
    body('phone').optional().trim().isMobilePhone(),
    body('university_id').optional().isUUID(),
    body('student_id').optional().trim(),
    body('graduation_year').optional().isInt({ min: 2020, max: 2035 }),
    body('location_address').optional().trim(),
    body('latitude').optional().isFloat({ min: -90, max: 90 }),
    body('longitude').optional().isFloat({ min: -180, max: 180 })
];

// Set upload folder for profiles
const setProfileUploadFolder = (req, res, next) => {
    req.uploadFolder = 'profiles';
    next();
};

// Search users
router.get('/', 
    query('q').optional().trim().isLength({ max: 100 }),
    query('university_id').optional().isUUID(),
    query('graduation_year').optional().isInt(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    validateRequest,
    usersController.searchUsers
);

// Protected routes
router.use(auth);

// Get dashboard data
router.get('/dashboard/stats', usersController.getDashboardStats);

// Update profile
router.put('/profile',
    setProfileUploadFolder,
    upload.single('profile_picture'),
    processImages,
    updateProfileValidation,
    validateRequest,
    usersController.updateProfile
);

// Update privacy settings
router.put('/privacy',
    body('show_phone').optional().isBoolean(),
    body('show_email').optional().isBoolean(),
    body('profile_visibility').optional().isIn(['public', 'students_only', 'private']),
    validateRequest,
    usersController.updatePrivacySettings
);

// Update notification preferences
router.put('/notifications',
    body('email_notifications').optional().isBoolean(),
    body('push_notifications').optional().isBoolean(),
    body('marketing_emails').optional().isBoolean(),
    validateRequest,
    usersController.updateNotificationPreferences
);

// Verification document upload
router.post('/verification',
    setProfileUploadFolder,
    upload.array('documents', 3),
    processImages,
    usersController.uploadVerificationDocuments
);

// Get user profile (public)
router.get('/:id', param('id').isUUID(), validateRequest, optionalAuth, usersController.getUserProfile);

// Get user statistics
router.get('/:id/stats', param('id').isUUID(), validateRequest, usersController.getUserStats);

export default router;
