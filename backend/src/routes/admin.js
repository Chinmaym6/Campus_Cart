import express from 'express';
import { param, query, body } from 'express-validator';
import * as adminController from '../controllers/adminController.js';
import { auth, restrictTo } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(auth);
router.use(restrictTo('admin', 'moderator'));

// Dashboard
router.get('/dashboard', adminController.getDashboard);
router.get('/analytics', adminController.getAnalytics);

// User management
router.get('/users',
    query('status').optional().isIn(['active', 'inactive', 'suspended', 'pending_verification']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    validateRequest,
    adminController.getUsers
);

router.get('/users/:id', param('id').isUUID(), validateRequest, adminController.getUserDetails);
router.put('/users/:id/status',
    param('id').isUUID(),
    body('status').isIn(['active', 'inactive', 'suspended']),
    validateRequest,
    restrictTo('admin'),
    adminController.updateUserStatus
);

// Content management
router.get('/items',
    query('status').optional().isIn(['available', 'sold', 'reserved', 'inactive']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    validateRequest,
    adminController.getItems
);

router.put('/items/:id/status',
    param('id').isUUID(),
    body('status').isIn(['available', 'sold', 'reserved', 'inactive']),
    validateRequest,
    adminController.updateItemStatus
);

// Reports management
router.get('/reports',
    query('status').optional().isIn(['pending', 'reviewing', 'resolved', 'rejected']),
    query('type').optional().isIn(['inappropriate_content', 'spam', 'scam', 'harassment', 'other']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    validateRequest,
    adminController.getReports
);

router.put('/reports/:id',
    param('id').isUUID(),
    body('status').isIn(['pending', 'reviewing', 'resolved', 'rejected']),
    body('admin_notes').optional().trim(),
    validateRequest,
    adminController.updateReport
);

// Universities management
router.get('/universities', adminController.getUniversities);
router.post('/universities',
    body('name').trim().isLength({ min: 1 }),
    body('domain').isEmail().customSanitizer(email => email.split('@')[1]),
    body('city').trim().isLength({ min: 1 }),
    body('state').trim().isLength({ min: 2, max: 50 }),
    validateRequest,
    restrictTo('admin'),
    adminController.createUniversity
);

// Categories management
router.post('/categories',
    body('name').trim().isLength({ min: 1 }),
    body('slug').trim().isLength({ min: 1 }),
    body('description').optional().trim(),
    body('parent_id').optional().isUUID(),
    validateRequest,
    restrictTo('admin'),
    adminController.createCategory
);

export default router;
