import express from 'express';
import { param } from 'express-validator';
import * as categoriesController from '../controllers/categoryController.js';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

// Get all categories
router.get('/', categoriesController.getCategories);

// Get category by ID with subcategories
router.get('/:id', param('id').isUUID(), validateRequest, categoriesController.getCategoryById);

// Get subcategories of a category
router.get('/:id/subcategories', param('id').isUUID(), validateRequest, categoriesController.getSubcategories);

// Get category stats (item counts, etc.)
router.get('/:id/stats', param('id').isUUID(), validateRequest, categoriesController.getCategoryStats);

export default router;
