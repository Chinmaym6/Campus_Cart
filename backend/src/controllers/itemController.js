import { pool, withTransaction } from '../config/database.js';
import { deleteFromS3 } from '../config/aws.js';

// Search Items with Filters (matches your enhanced items.js route)
export const searchItems = async (req, res) => {
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
        
        let query = `
            SELECT i.*, u.first_name, u.last_name, u.profile_picture_url, u.email_verified,
                   u.university_id, un.name as university_name,
                   c.name as category_name, c.slug as category_slug,
                   ${userId ? `(SELECT COUNT(*) FROM saved_items WHERE item_id = i.id AND user_id = $1) > 0 as is_saved` : 'false as is_saved'}
            FROM items i
            JOIN users u ON i.seller_id = u.id
            LEFT JOIN universities un ON u.university_id = un.id
            LEFT JOIN categories c ON i.category_id = c.id
            WHERE i.status = 'available' AND i.expires_at > CURRENT_TIMESTAMP
        `;
        
        const params = [];
        let paramCount = 0;

        if (userId) {
            paramCount++;
            params.push(userId);
        }

        // Search filter
        if (search) {
            paramCount++;
            query += ` AND (i.title ILIKE $${paramCount} OR i.description ILIKE $${paramCount} OR i.brand ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        // Category filter
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
        
        // Condition filter
        if (condition) {
            const conditions = Array.isArray(condition) ? condition : [condition];
            const conditionPlaceholders = conditions.map(() => `$${++paramCount}`).join(',');
            query += ` AND i.condition IN (${conditionPlaceholders})`;
            params.push(...conditions);
        }

        // University filter
        if (university_id) {
            paramCount++;
            query += ` AND u.university_id = $${paramCount}`;
            params.push(university_id);
        }

        // Exclude user's own items
        if (userId) {
            paramCount++;
            query += ` AND i.seller_id != $${paramCount}`;
            params.push(userId);
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
        query += ` ORDER BY ${orderBy}`;

        // Pagination
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(parseInt(limit), offset);

        const result = await pool.query(query, params);
        
        // Get total count
        const countResult = await pool.query(
            'SELECT COUNT(*) as total FROM items WHERE status = $1',
            ['available']
        );
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
        console.error('Error searching items:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error searching items' 
        });
    }
};

// Get Single Item by ID
export const getItemById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;

        const query = `
            SELECT i.*, u.first_name, u.last_name, u.profile_picture_url, u.email_verified,
                   u.university_id, un.name as university_name, u.bio as seller_bio,
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

        // Increment view count
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
};

// Create New Item
export const createItem = async (req, res) => {
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

        const result = await withTransaction(async (client) => {
            const itemResult = await client.query(
                `INSERT INTO items (
                    seller_id, category_id, title, description, price, condition,
                    isbn, brand, model, images, location_address, latitude, longitude,
                    is_negotiable, expires_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING *`,
                [
                    seller_id, category_id, title, description, parseFloat(price), condition,
                    isbn || null, brand || null, model || null, JSON.stringify(imageUrls),
                    location_address || null, latitude ? parseFloat(latitude) : null,
                    longitude ? parseFloat(longitude) : null, is_negotiable,
                    new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                ]
            );

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
};

// Update Item
export const updateItem = async (req, res) => {
    try {
        const { id } = req.params;
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

        const {
            title, description, price, condition, category_id,
            is_negotiable, isbn, brand, model, location_address,
            latitude, longitude, existing_images
        } = req.body;

        // Process new images
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
                longitude ? parseFloat(longitude) : null, id
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
};

// Delete Item
export const deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

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

        await withTransaction(async (client) => {
            // Soft delete
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
};

// Toggle Save Item
export const toggleSaveItem = async (req, res) => {
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

        if (itemCheck.rows[0].seller_id === userId) {
            return res.status(400).json({
                success: false,
                message: "You can't save your own items"
            });
        }

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
};

// Get User's Saved Items
export const getSavedItems = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { q: search, category_id, sort: sortBy = 'newest_saved', page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT i.*, c.name as category_name, c.slug as category_slug,
                   u.first_name, u.last_name, u.profile_picture_url,
                   si.created_at as saved_at, true as is_saved
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
        console.error('Error fetching saved items:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching saved items'
        });
    }
};

// Get User's Listings
export const getUserListings = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { status = 'active', q: search, category_id, sort: sortBy = 'newest', page = 1, limit = 20 } = req.query;
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
            data: { items, stats }
        });

    } catch (error) {
        console.error('Error fetching user listings:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching your listings'
        });
    }
};

// Get Featured Items
export const getFeaturedItems = async (req, res) => {
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
};

// Get Similar Items
export const getSimilarItems = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 8 } = req.query;
        const userId = req.user?.userId;

        // Get current item details
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
        const priceRange = parseFloat(currentItem.price) * 0.5;
        const minPrice = parseFloat(currentItem.price) - priceRange;
        const maxPrice = parseFloat(currentItem.price) + priceRange;

        const query = `
            SELECT i.*, u.first_name, u.last_name, u.profile_picture_url,
                   c.name as category_name, c.slug as category_slug,
                   ${userId ? `(SELECT COUNT(*) FROM saved_items WHERE item_id = i.id AND user_id = $6) > 0 as is_saved,` : 'false as is_saved,'}
                   ABS(i.price - $5) as price_diff
            FROM items i
            JOIN users u ON i.seller_id = u.id
            LEFT JOIN categories c ON i.category_id = c.id
            WHERE i.category_id = $1 AND i.id != $2 AND i.status = 'available'
            AND i.seller_id != $3 AND i.price BETWEEN $4 AND $5
            ORDER BY price_diff ASC, i.view_count DESC, i.created_at DESC
            LIMIT $${userId ? 7 : 6}
        `;

        const params = [
            currentItem.category_id, id, currentItem.seller_id,
            minPrice, parseFloat(currentItem.price), parseInt(limit)
        ];

        if (userId) {
            params.splice(5, 0, userId);
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
};

// Update Item Status
export const updateItemStatus = async (req, res) => {
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
};
