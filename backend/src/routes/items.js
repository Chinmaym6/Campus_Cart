// 

import express from 'express';
import { body, param, query } from 'express-validator';
import { pool, withTransaction } from '../config/database.js';
import authenticateToken from '../middleware/authenticateToken.js';
import { validateRequest } from '../middleware/validation.js';
import { upload, processImages } from '../config/aws.js';

const router = express.Router();

// Enhanced item validation
const createItemValidation = [
    body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required (max 255 characters)'),
    body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category_id').isUUID().withMessage('Valid category ID required'),
    body('condition').isIn(['new', 'like_new', 'good', 'fair', 'poor']).withMessage('Invalid condition'),
    body('is_negotiable').optional().isBoolean(),
    body('isbn').optional().isLength({ max: 13 }),
    body('brand').optional().trim().isLength({ max: 100 }),
    body('model').optional().trim().isLength({ max: 100 }),
    body('location_address').optional().trim(),
    body('latitude').optional().isFloat({ min: -90, max: 90 }),
    body('longitude').optional().isFloat({ min: -180, max: 180 })
];

// Search validation
const searchValidation = [
    query('q').optional().trim().isLength({ max: 100 }),
    query('category_id').optional().isUUID(),
    query('category').optional().trim(), // for category slug
    query('min_price').optional().isFloat({ min: 0 }),
    query('max_price').optional().isFloat({ min: 0 }),
    query('condition').optional().custom((value) => {
        if (Array.isArray(value)) {
            return value.every(v => ['new', 'like_new', 'good', 'fair', 'poor'].includes(v));
        }
        return ['new', 'like_new', 'good', 'fair', 'poor'].includes(value);
    }),
    query('latitude').optional().isFloat({ min: -90, max: 90 }),
    query('longitude').optional().isFloat({ min: -180, max: 180 }),
    query('radius').optional().isFloat({ min: 0, max: 500 }),
    query('university_id').optional().isUUID(),
    query('sort').optional().isIn(['newest', 'oldest', 'price_low', 'price_high', 'popular', 'ending_soon']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
];

// Set upload folder for items
const setItemsUploadFolder = (req, res, next) => {
    req.uploadFolder = 'items';
    next();
};

// Optional authentication middleware
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.cookies.accessToken || req.header('Authorization')?.replace('Bearer ', '');
        
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userResult = await pool.query(
                'SELECT id, email, role, email_verified FROM users WHERE id = $1 AND status = $2',
                [decoded.userId, 'active']
            );
            
            if (userResult.rows.length > 0) {
                req.user = { userId: userResult.rows[0].id, ...userResult.rows };
            }
        }
        next();
    } catch (error) {
        next(); // Continue without authentication
    }
};

// Enhanced Get all items (marketplace)
router.get('/', searchValidation, validateRequest, optionalAuth, async (req, res) => {
    try {
        const { 
            q: search, 
            category, 
            category_id, 
            min_price: minPrice, 
            max_price: maxPrice, 
            condition, 
            latitude, 
            longitude, 
            radius, 
            university_id, 
            sort: sortBy = 'newest', 
            page = 1, 
            limit = 20 
        } = req.query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const userId = req.user?.userId;
        
        // Base query with user saved items check
        let query = `
            SELECT i.*, u.first_name, u.last_name, u.profile_picture_url, u.email_verified,
                   u.university_id, un.name as university_name,
                   c.name as category_name, c.slug as category_slug,
                   ${userId ? `(SELECT COUNT(*) FROM saved_items WHERE item_id = i.id AND user_id = $${userId ? 'USER_ID' : 'NULL'}) > 0 as is_saved,` : 'false as is_saved,'}
                   CASE 
                       WHEN i.latitude IS NOT NULL AND i.longitude IS NOT NULL AND ${'LAT'} IS NOT NULL AND ${'LNG'} IS NOT NULL
                       THEN (6371 * acos(cos(radians(${'LAT'})) * cos(radians(i.latitude)) * 
                            cos(radians(i.longitude) - radians(${'LNG'})) + 
                            sin(radians(${'LAT'})) * sin(radians(i.latitude))))
                       ELSE NULL
                   END as distance
            FROM items i
            JOIN users u ON i.seller_id = u.id
            LEFT JOIN universities un ON u.university_id = un.id
            LEFT JOIN categories c ON i.category_id = c.id
            WHERE i.status = 'available' AND i.expires_at > CURRENT_TIMESTAMP
        `;
        
        const params = [];
        let paramCount = 0;

        // Add user ID for saved items check
        if (userId) {
            paramCount++;
            params.push(userId);
            query = query.replace('USER_ID', paramCount);
        } else {
            query = query.replace('USER_ID', 'NULL');
        }

        // Add coordinates for distance calculation
        if (latitude && longitude) {
            paramCount++;
            params.push(parseFloat(latitude));
            query = query.replace(/LAT/g, paramCount);
            
            paramCount++;
            params.push(parseFloat(longitude));
            query = query.replace(/LNG/g, paramCount);
        } else {
            query = query.replace(/\$LAT/g, 'NULL').replace(/\$LNG/g, 'NULL');
        }

        // Search filter
        if (search) {
            paramCount++;
            query += ` AND (i.title ILIKE $${paramCount} OR i.description ILIKE $${paramCount} OR i.brand ILIKE $${paramCount} OR i.model ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        // Category filter (by slug or ID)
        if (category) {
            paramCount++;
            query += ` AND c.slug = $${paramCount}`;
            params.push(category);
        } else if (category_id) {
            paramCount++;
            query += ` AND i.category_id = $${paramCount}`;
            params.push(category_id);
        }
        
        // Price filters
        if (minPrice) {
            paramCount++;
            query += ` AND i.price >= $${paramCount}`;
            params.push(parseFloat(minPrice));
        }
        
        if (maxPrice) {
            paramCount++;
            query += ` AND i.price <= $${paramCount}`;
            params.push(parseFloat(maxPrice));
        }
        
        // Condition filter (supports multiple)
        if (condition) {
            const conditions = Array.isArray(condition) ? condition : [condition];
            const conditionPlaceholders = conditions.map(() => `$${++paramCount}`).join(',');
            query += ` AND i.condition IN (${conditionPlaceholders})`;
            params.push(...conditions);
        }

        // Location filter (within radius)
        if (latitude && longitude && radius) {
            query += ` AND (6371 * acos(cos(radians($${latitude && longitude ? params.findIndex(p => p === parseFloat(latitude)) + 1 : 'NULL'})) * cos(radians(i.latitude)) * cos(radians(i.longitude) - radians($${latitude && longitude ? params.findIndex(p => p === parseFloat(longitude)) + 1 : 'NULL'})) + sin(radians($${latitude && longitude ? params.findIndex(p => p === parseFloat(latitude)) + 1 : 'NULL'})) * sin(radians(i.latitude)))) <= $${++paramCount}`;
            params.push(parseFloat(radius));
        }

        // University filter
        if (university_id) {
            paramCount++;
            query += ` AND u.university_id = $${paramCount}`;
            params.push(university_id);
        }

        // Exclude user's own items (if logged in)
        if (userId) {
            const userIdIndex = params.findIndex(p => p === userId);
            if (userIdIndex !== -1) {
                query += ` AND i.seller_id != $${userIdIndex + 1}`;
            }
        }

        // Sorting
        const sortOptions = {
            'newest': 'i.created_at DESC',
            'oldest': 'i.created_at ASC',
            'price_low': 'i.price ASC',
            'price_high': 'i.price DESC',
            'popular': 'i.view_count DESC',
            'ending_soon': 'i.expires_at ASC'
        };

        const orderBy = sortOptions[sortBy] || 'i.created_at DESC';
        
        // Add distance sorting if location provided
        if (latitude && longitude) {
            query += ` ORDER BY distance ASC, ${orderBy}`;
        } else {
            query += ` ORDER BY ${orderBy}`;
        }

        // Pagination
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(parseInt(limit), offset);

        // Execute main query
        const result = await pool.query(query, params);
        
        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as total
            FROM items i
            JOIN users u ON i.seller_id = u.id
            LEFT JOIN categories c ON i.category_id = c.id
            WHERE i.status = 'available' AND i.expires_at > CURRENT_TIMESTAMP
        `;
        
        // Apply same filters for count (excluding pagination and user-specific params)
        const countParams = [];
        let countParamIndex = 0;

        if (search) {
            countParamIndex++;
            countQuery += ` AND (i.title ILIKE $${countParamIndex} OR i.description ILIKE $${countParamIndex} OR i.brand ILIKE $${countParamIndex} OR i.model ILIKE $${countParamIndex})`;
            countParams.push(`%${search}%`);
        }

        if (category) {
            countParamIndex++;
            countQuery += ` AND c.slug = $${countParamIndex}`;
            countParams.push(category);
        } else if (category_id) {
            countParamIndex++;
            countQuery += ` AND i.category_id = $${countParamIndex}`;
            countParams.push(category_id);
        }

        if (minPrice) {
            countParamIndex++;
            countQuery += ` AND i.price >= $${countParamIndex}`;
            countParams.push(parseFloat(minPrice));
        }

        if (maxPrice) {
            countParamIndex++;
            countQuery += ` AND i.price <= $${countParamIndex}`;
            countParams.push(parseFloat(maxPrice));
        }

        if (condition) {
            const conditions = Array.isArray(condition) ? condition : [condition];
            const conditionPlaceholders = conditions.map(() => `$${++countParamIndex}`).join(',');
            countQuery += ` AND i.condition IN (${conditionPlaceholders})`;
            countParams.push(...conditions);
        }

        if (university_id) {
            countParamIndex++;
            countQuery += ` AND u.university_id = $${countParamIndex}`;
            countParams.push(university_id);
        }

        if (userId) {
            countParamIndex++;
            countQuery += ` AND i.seller_id != $${countParamIndex}`;
            countParams.push(userId);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        // Process images for each item
        const items = result.rows.map(item => ({
            ...item,
            images: typeof item.images === 'string' ? JSON.parse(item.images || '[]') : (item.images || []),
            price: parseFloat(item.price),
            distance: item.distance ? parseFloat(item.distance).toFixed(2) : null
        }));

        res.json({
            success: true,
            data: {
                items,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit)),
                    hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
                    hasPrev: parseInt(page) > 1
                },
                filters: {
                    search,
                    category,
                    category_id,
                    minPrice,
                    maxPrice,
                    condition,
                    sortBy,
                    total_results: total
                }
            }
        });

    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching items' 
        });
    }
});

// Get featured items
router.get('/featured', optionalAuth, async (req, res) => {
    try {
        const { limit = 12 } = req.query;
        const userId = req.user?.userId;

        const query = `
            SELECT i.*, u.first_name, u.last_name, u.profile_picture_url,
                   c.name as category_name, c.slug as category_slug,
                   ${userId ? `(SELECT COUNT(*) FROM saved_items WHERE item_id = i.id AND user_id = $1) > 0 as is_saved` : 'false as is_saved'}
            FROM items i
            JOIN users u ON i.seller_id = u.id
            LEFT JOIN categories c ON i.category_id = c.id
            WHERE i.status = 'available' AND (i.is_featured = true OR i.view_count > 10)
            ORDER BY i.is_featured DESC, i.view_count DESC, i.created_at DESC
            LIMIT $${userId ? 2 : 1}
        `;

        const params = userId ? [userId, parseInt(limit)] : [parseInt(limit)];
        const result = await pool.query(query, params);

        const items = result.rows.map(item => ({
            ...item,
            images: typeof item.images === 'string' ? JSON.parse(item.images || '[]') : (item.images || []),
            price: parseFloat(item.price)
        }));

        res.json({
            success: true,
            data: { items }
        });

    } catch (error) {
        console.error('Error fetching featured items:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching featured items'
        });
    }
});

// Get single item by ID
router.get('/:id', param('id').isUUID(), validateRequest, optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;

        const query = `
            SELECT i.*, u.first_name, u.last_name, u.profile_picture_url, u.email_verified,
                   u.university_id, un.name as university_name, u.bio as seller_bio,
                   u.created_at as seller_joined,
                   c.name as category_name, c.slug as category_slug,
                   ${userId ? `(SELECT COUNT(*) FROM saved_items WHERE item_id = i.id AND user_id = $2) > 0 as is_saved,` : 'false as is_saved,'}
                   (SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id) as seller_rating,
                   (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as seller_review_count
            FROM items i
            JOIN users u ON i.seller_id = u.id
            LEFT JOIN universities un ON u.university_id = un.id
            LEFT JOIN categories c ON i.category_id = c.id
            WHERE i.id = $1
        `;

        const params = userId ? [id, userId] : [id];
        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        const item = {
            ...result.rows[0],
            images: typeof result.rows.images === 'string' ? 
                JSON.parse(result.rows.images || '[]') : 
                (result.rows.images || []),
            price: parseFloat(result.rows.price),
            seller_rating: result.rows.seller_rating ? parseFloat(result.rows.seller_rating) : null
        };

        // Increment view count (async, don't wait)
        if (!userId || userId !== item.seller_id) {
            pool.query('UPDATE items SET view_count = view_count + 1 WHERE id = $1', [id])
                .catch(console.error);
        }

        res.json({
            success: true,
            data: { item }
        });

    } catch (error) {
        console.error('Error fetching item:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching item'
        });
    }
});

// Get similar items
router.get('/:id/similar', param('id').isUUID(), validateRequest, optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 8 } = req.query;
        const userId = req.user?.userId;

        // First get the current item's details
        const itemResult = await pool.query(
            'SELECT category_id, price, seller_id FROM items WHERE id = $1',
            [id]
        );

        if (itemResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        const currentItem = itemResult.rows[0];
        const priceRange = parseFloat(currentItem.price) * 0.5; // 50% price range
        const minPrice = parseFloat(currentItem.price) - priceRange;
        const maxPrice = parseFloat(currentItem.price) + priceRange;

        const query = `
            SELECT i.*, u.first_name, u.last_name, u.profile_picture_url,
                   c.name as category_name, c.slug as category_slug,
                   ${userId ? `(SELECT COUNT(*) FROM saved_items WHERE item_id = i.id AND user_id = $${userId ? 6 : 'NULL'}) > 0 as is_saved,` : 'false as is_saved,'}
                   ABS(i.price - $5) as price_diff
            FROM items i
            JOIN users u ON i.seller_id = u.id
            LEFT JOIN categories c ON i.category_id = c.id
            WHERE i.category_id = $1 
            AND i.id != $2 
            AND i.status = 'available'
            AND i.seller_id != $3
            AND i.price BETWEEN $4 AND $5
            ORDER BY price_diff ASC, i.view_count DESC, i.created_at DESC
            LIMIT $${userId ? 7 : 6}
        `;

        const params = [
            currentItem.category_id, 
            id, 
            currentItem.seller_id,
            minPrice,
            parseFloat(currentItem.price),
            parseInt(limit)
        ];

        if (userId) {
            params.splice(5, 0, userId); // Insert userId at index 5
        }

        const result = await pool.query(query, params);

        const items = result.rows.map(item => ({
            ...item,
            images: typeof item.images === 'string' ? JSON.parse(item.images || '[]') : (item.images || []),
            price: parseFloat(item.price)
        }));

        res.json({
            success: true,
            data: { items }
        });

    } catch (error) {
        console.error('Error fetching similar items:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching similar items'
        });
    }
});

// Enhanced Create new item
router.post('/', 
    authenticateToken,
    setItemsUploadFolder,
    upload.array('images', 10),
    processImages,
    createItemValidation, 
    validateRequest, 
    async (req, res) => {
        try {
            const { 
                title, 
                description, 
                price, 
                condition, 
                category_id, 
                is_negotiable = true,
                isbn,
                brand,
                model,
                location_address,
                latitude,
                longitude
            } = req.body;
            
            const seller_id = req.user.userId;

            // Process uploaded images
            const imageUrls = [];
            if (req.processedFiles && req.processedFiles.length > 0) {
                req.processedFiles.forEach(file => {
                    imageUrls.push({
                        url: file.original.location,
                        key: file.original.key,
                        thumbnail_url: file.thumbnail ? file.thumbnail.url : file.original.location
                    });
                });
            }

            // Use transaction for item creation
            const result = await withTransaction(async (client) => {
                // Insert item
                const itemResult = await client.query(
                    `INSERT INTO items (
                        seller_id, category_id, title, description, price, condition,
                        isbn, brand, model, images, location_address, latitude, longitude,
                        is_negotiable, expires_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    RETURNING *`,
                    [
                        seller_id, 
                        category_id, 
                        title, 
                        description, 
                        parseFloat(price), 
                        condition,
                        isbn || null,
                        brand || null,
                        model || null,
                        JSON.stringify(imageUrls),
                        location_address || null,
                        latitude ? parseFloat(latitude) : null,
                        longitude ? parseFloat(longitude) : null,
                        is_negotiable,
                        new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days expiry
                    ]
                );

                // Get the created item with additional details
                const detailResult = await client.query(
                    `SELECT i.*, u.first_name, u.last_name, c.name as category_name
                     FROM items i
                     JOIN users u ON i.seller_id = u.id
                     LEFT JOIN categories c ON i.category_id = c.id
                     WHERE i.id = $1`,
                    [itemResult.rows[0].id]
                );

                return detailResult.rows;
            });

            const item = {
                ...result,
                images: typeof result.images === 'string' ? JSON.parse(result.images) : result.images,
                price: parseFloat(result.price)
            };

            res.status(201).json({
                success: true,
                message: 'Item created successfully! 🎉',
                data: { item }
            });

        } catch (error) {
            console.error('Error creating item:', error);
            res.status(500).json({ 
                success: false,
                message: 'Error creating item. Please try again.' 
            });
        }
    }
);

// Update item
router.put('/:id',
    param('id').isUUID(),
    authenticateToken,
    setItemsUploadFolder,
    upload.array('images', 10),
    processImages,
    createItemValidation,
    validateRequest,
    async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            
            // Check if user owns the item
            const ownerCheck = await pool.query(
                'SELECT seller_id FROM items WHERE id = $1',
                [id]
            );

            if (ownerCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Item not found'
                });
            }

            if (ownerCheck.rows[0].seller_id !== userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this item'
                });
            }

            const {
                title,
                description,
                price,
                condition,
                category_id,
                is_negotiable,
                isbn,
                brand,
                model,
                location_address,
                latitude,
                longitude,
                existing_images // Array of existing image URLs to keep
            } = req.body;

            // Process uploaded images
            const newImages = [];
            if (req.processedFiles && req.processedFiles.length > 0) {
                req.processedFiles.forEach(file => {
                    newImages.push({
                        url: file.original.location,
                        key: file.original.key,
                        thumbnail_url: file.thumbnail ? file.thumbnail.url : file.original.location
                    });
                });
            }

            // Combine existing and new images
            const existingImageArray = existing_images ? JSON.parse(existing_images) : [];
            const finalImages = [...existingImageArray, ...newImages];

            const updateResult = await pool.query(
                `UPDATE items 
                 SET title = $1, description = $2, price = $3, condition = $4,
                     category_id = $5, is_negotiable = $6, isbn = $7, brand = $8,
                     model = $9, images = $10, location_address = $11,
                     latitude = $12, longitude = $13, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $14
                 RETURNING *`,
                [
                    title, description, parseFloat(price), condition, category_id,
                    is_negotiable, isbn || null, brand || null, model || null,
                    JSON.stringify(finalImages), location_address || null,
                    latitude ? parseFloat(latitude) : null,
                    longitude ? parseFloat(longitude) : null,
                    id
                ]
            );

            const item = {
                ...updateResult.rows[0],
                images: JSON.parse(updateResult.rows.images || '[]'),
                price: parseFloat(updateResult.rows.price)
            };

            res.json({
                success: true,
                message: 'Item updated successfully! ✨',
                data: { item }
            });

        } catch (error) {
            console.error('Error updating item:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating item'
            });
        }
    }
);

// Update item status (mark as sold, etc.)
router.patch('/:id/status', 
    param('id').isUUID(), 
    authenticateToken,
    body('status').isIn(['available', 'sold', 'reserved', 'inactive']),
    validateRequest,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const userId = req.user.userId;

            // Check ownership
            const ownerCheck = await pool.query(
                'SELECT seller_id FROM items WHERE id = $1',
                [id]
            );

            if (ownerCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Item not found'
                });
            }

            if (ownerCheck.rows[0].seller_id !== userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this item'
                });
            }

            // Update status
            const updateData = { status };
            if (status === 'sold') {
                updateData.sold_at = 'CURRENT_TIMESTAMP';
            }

            const query = status === 'sold' ?
                'UPDATE items SET status = $1, sold_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *' :
                'UPDATE items SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';

            const result = await pool.query(query, [status, id]);

            res.json({
                success: true,
                message: `Item marked as ${status} successfully! ${status === 'sold' ? '🎉' : ''}`,
                data: { item: result.rows[0] }
            });

        } catch (error) {
            console.error('Error updating item status:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating item status'
            });
        }
    }
);

// Delete item
router.delete('/:id', 
    param('id').isUUID(), 
    authenticateToken,
    validateRequest,
    async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.userId;

            // Check ownership and get item details
            const itemResult = await pool.query(
                'SELECT seller_id, images FROM items WHERE id = $1',
                [id]
            );

            if (itemResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Item not found'
                });
            }

            const item = itemResult.rows[0];

            if (item.seller_id !== userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to delete this item'
                });
            }

            // Use transaction for deletion
            await withTransaction(async (client) => {
                // Soft delete - update status instead of actual deletion
                await client.query(
                    'UPDATE items SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                    ['inactive', id]
                );

                // Remove from saved items
                await client.query(
                    'DELETE FROM saved_items WHERE item_id = $1',
                    [id]
                );
            });

            // TODO: Delete images from S3 (async, don't wait)
            if (item.images) {
                try {
                    const images = JSON.parse(item.images);
                    images.forEach(image => {
                        if (image.key) {
                            // deleteFromS3(image.key).catch(console.error);
                            console.log('TODO: Delete image from S3:', image.key);
                        }
                    });
                } catch (parseError) {
                    console.error('Error parsing images for deletion:', parseError);
                }
            }

            res.json({
                success: true,
                message: 'Item deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting item:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting item'
            });
        }
    }
);

// Toggle save/unsave item
router.post('/:id/save', 
    param('id').isUUID(),
    authenticateToken,
    validateRequest,
    async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.userId;

            // Check if item exists
            const itemCheck = await pool.query(
                'SELECT seller_id FROM items WHERE id = $1 AND status = $2',
                [id, 'available']
            );

            if (itemCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Item not found or not available'
                });
            }

            // Don't allow saving own items
            if (itemCheck.rows[0].seller_id === userId) {
                return res.status(400).json({
                    success: false,
                    message: "You can't save your own items"
                });
            }

            // Check if already saved
            const existingSave = await pool.query(
                'SELECT id FROM saved_items WHERE item_id = $1 AND user_id = $2',
                [id, userId]
            );

            if (existingSave.rows.length > 0) {
                // Remove from saved
                await pool.query(
                    'DELETE FROM saved_items WHERE item_id = $1 AND user_id = $2',
                    [id, userId]
                );

                res.json({
                    success: true,
                    message: 'Item removed from saved items',
                    data: { saved: false }
                });
            } else {
                // Add to saved
                await pool.query(
                    'INSERT INTO saved_items (item_id, user_id) VALUES ($1, $2)',
                    [id, userId]
                );

                res.json({
                    success: true,
                    message: 'Item saved successfully! ❤️',
                    data: { saved: true }
                });
            }

        } catch (error) {
            console.error('Error toggling save item:', error);
            res.status(500).json({
                success: false,
                message: 'Error saving item'
            });
        }
    }
);

// Get user's saved items
router.get('/saved/list', 
    authenticateToken,
    searchValidation,
    validateRequest,
    async (req, res) => {
        try {
            const userId = req.user.userId;
            const { 
                q: search, 
                category_id, 
                sort: sortBy = 'newest_saved', 
                page = 1, 
                limit = 20 
            } = req.query;
            
            const offset = (parseInt(page) - 1) * parseInt(limit);

            let query = `
                SELECT i.*, c.name as category_name, c.slug as category_slug,
                       u.first_name, u.last_name, u.profile_picture_url,
                       si.created_at as saved_at,
                       true as is_saved
                FROM saved_items si
                JOIN items i ON si.item_id = i.id
                LEFT JOIN categories c ON i.category_id = c.id
                LEFT JOIN users u ON i.seller_id = u.id
                WHERE si.user_id = $1 AND i.status = 'available'
            `;

            const params = [userId];
            let paramCount = 1;

            // Search filter
            if (search) {
                paramCount++;
                query += ` AND (i.title ILIKE $${paramCount} OR i.description ILIKE $${paramCount})`;
                params.push(`%${search}%`);
            }

            // Category filter
            if (category_id) {
                paramCount++;
                query += ` AND i.category_id = $${paramCount}`;
                params.push(category_id);
            }

            // Sorting
            const sortOptions = {
                'newest_saved': 'si.created_at DESC',
                'oldest_saved': 'si.created_at ASC',
                'price_low': 'i.price ASC',
                'price_high': 'i.price DESC',
                'newest_posted': 'i.created_at DESC'
            };

            const orderBy = sortOptions[sortBy] || 'si.created_at DESC';
            query += ` ORDER BY ${orderBy}`;

            // Pagination
            query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
            params.push(parseInt(limit), offset);

            const result = await pool.query(query, params);

            // Get total count
            let countQuery = `
                SELECT COUNT(*) as total
                FROM saved_items si
                JOIN items i ON si.item_id = i.id
                WHERE si.user_id = $1 AND i.status = 'available'
            `;
            
            const countParams = [userId];
            let countParamIndex = 1;

            if (search) {
                countParamIndex++;
                countQuery += ` AND (i.title ILIKE $${countParamIndex} OR i.description ILIKE $${countParamIndex})`;
                countParams.push(`%${search}%`);
            }

            if (category_id) {
                countParamIndex++;
                countQuery += ` AND i.category_id = $${countParamIndex}`;
                countParams.push(category_id);
            }

            const countResult = await pool.query(countQuery, countParams);
            const total = parseInt(countResult.rows[0].total);

            const items = result.rows.map(item => ({
                ...item,
                images: typeof item.images === 'string' ? JSON.parse(item.images || '[]') : (item.images || []),
                price: parseFloat(item.price)
            }));

            res.json({
                success: true,
                data: {
                    items,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        pages: Math.ceil(total / parseInt(limit))
                    }
                }
            });

        } catch (error) {
            console.error('Error fetching saved items:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching saved items'
            });
        }
    }
);

// Get user's listings
router.get('/user/listings', 
    authenticateToken,
    searchValidation,
    validateRequest,
    async (req, res) => {
        try {
            const userId = req.user.userId;
            const { 
                status = 'active', 
                q: search, 
                category_id, 
                sort: sortBy = 'newest', 
                page = 1, 
                limit = 20 
            } = req.query;
            
            const offset = (parseInt(page) - 1) * parseInt(limit);

            let query = `
                SELECT i.*, c.name as category_name, c.slug as category_slug,
                       (SELECT COUNT(*) FROM saved_items WHERE item_id = i.id) as saves_count,
                       false as is_saved
                FROM items i
                LEFT JOIN categories c ON i.category_id = c.id
                WHERE i.seller_id = $1
            `;

            const params = [userId];
            let paramCount = 1;

            // Status filter
            if (status === 'active') {
                query += ` AND i.status = 'available'`;
            } else if (status === 'sold') {
                query += ` AND i.status = 'sold'`;
            } else if (status === 'all') {
                query += ` AND i.status != 'inactive'`;
            } else {
                paramCount++;
                query += ` AND i.status = $${paramCount}`;
                params.push(status);
            }

            // Search filter
            if (search) {
                paramCount++;
                query += ` AND (i.title ILIKE $${paramCount} OR i.description ILIKE $${paramCount})`;
                params.push(`%${search}%`);
            }

            // Category filter
            if (category_id) {
                paramCount++;
                query += ` AND i.category_id = $${paramCount}`;
                params.push(category_id);
            }

            // Sorting
            const sortOptions = {
                'newest': 'i.created_at DESC',
                'oldest': 'i.created_at ASC',
                'price_low': 'i.price ASC',
                'price_high': 'i.price DESC',
                'popular': 'i.view_count DESC'
            };

            const orderBy = sortOptions[sortBy] || 'i.created_at DESC';
            query += ` ORDER BY ${orderBy}`;

            // Pagination
            query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
            params.push(parseInt(limit), offset);

            const result = await pool.query(query, params);

            // Get stats
            const statsQuery = `
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'available') as available,
                    COUNT(*) FILTER (WHERE status = 'sold') as sold,
                    COUNT(*) FILTER (WHERE status = 'reserved') as reserved,
                    COALESCE(SUM(view_count), 0) as total_views
                FROM items
                WHERE seller_id = $1 AND status != 'inactive'
            `;

            const statsResult = await pool.query(statsQuery, [userId]);
            const stats = {
                ...statsResult.rows[0],
                total: parseInt(statsResult.rows.total),
                available: parseInt(statsResult.rows.available),
                sold: parseInt(statsResult.rows.sold),
                reserved: parseInt(statsResult.rows.reserved),
                total_views: parseInt(statsResult.rows.total_views)
            };

            const items = result.rows.map(item => ({
                ...item,
                images: typeof item.images === 'string' ? JSON.parse(item.images || '[]') : (item.images || []),
                price: parseFloat(item.price),
                saves_count: parseInt(item.saves_count)
            }));

            res.json({
                success: true,
                data: {
                    items,
                    stats,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: stats.total,
                        pages: Math.ceil(stats.total / parseInt(limit))
                    }
                }
            });

        } catch (error) {
            console.error('Error fetching user listings:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching your listings'
            });
        }
    }
);

export default router;
