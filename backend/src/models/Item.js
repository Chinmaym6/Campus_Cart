import { pool } from '../config/database.js';
import { deleteFromS3 } from '../config/aws.js';

class Item {
    constructor(itemData) {
        Object.assign(this, itemData);
        
        // Parse images if they're a string
        if (this.images && typeof this.images === 'string') {
            this.images = JSON.parse(this.images);
        }
        
        // Convert numeric fields
        if (this.price) this.price = parseFloat(this.price);
        if (this.view_count) this.view_count = parseInt(this.view_count);
        if (this.latitude) this.latitude = parseFloat(this.latitude);
        if (this.longitude) this.longitude = parseFloat(this.longitude);
    }

    // Create new item (your existing logic enhanced)
    static async create(itemData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const query = `
                INSERT INTO items (
                    seller_id, category_id, title, description, price, condition,
                    isbn, brand, model, images, location_address, latitude, longitude,
                    is_negotiable, is_featured, expires_at, status, view_count
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                RETURNING *
            `;

            const values = [
                itemData.seller_id,
                itemData.category_id,
                itemData.title,
                itemData.description,
                parseFloat(itemData.price),
                itemData.condition,
                itemData.isbn || null,
                itemData.brand || null,
                itemData.model || null,
                JSON.stringify(itemData.images || []),
                itemData.location_address || null,
                itemData.latitude ? parseFloat(itemData.latitude) : null,
                itemData.longitude ? parseFloat(itemData.longitude) : null,
                itemData.is_negotiable !== undefined ? itemData.is_negotiable : true,
                itemData.is_featured || false,
                itemData.expires_at || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
                'available',
                0 // Initial view count
            ];

            const result = await client.query(query, values);
            await client.query('COMMIT');

            return new Item(result.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Find item by ID with comprehensive seller info (enhanced from your version)
    static async findById(id, userId = null) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT i.*, 
                       u.first_name, u.last_name, u.profile_picture_url, u.email_verified,
                       u.university_id, un.name as university_name, u.bio as seller_bio,
                       u.created_at as seller_joined,
                       c.name as category_name, c.slug as category_slug,
                       ${userId ? `(SELECT COUNT(*) FROM saved_items WHERE item_id = i.id AND user_id = $2) > 0 as is_saved,` : 'false as is_saved,'}
                       (SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id) as seller_rating,
                       (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as seller_review_count,
                       (SELECT COUNT(*) FROM saved_items WHERE item_id = i.id) as total_saves
                FROM items i
                JOIN users u ON i.seller_id = u.id
                LEFT JOIN universities un ON u.university_id = un.id
                LEFT JOIN categories c ON i.category_id = c.id
                WHERE i.id = $1
            `;
            
            const values = userId ? [id, userId] : [id];
            const result = await client.query(query, values);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            const item = new Item(result.rows[0]);
            
            // Enhanced data processing
            item.seller_rating = item.seller_rating ? parseFloat(item.seller_rating) : null;
            item.seller_review_count = parseInt(item.seller_review_count || 0);
            item.total_saves = parseInt(item.total_saves || 0);
            item.is_saved = Boolean(item.is_saved);
            
            // Increment view count (async, don't wait) - only if not owner
            if (!userId || userId !== item.seller_id) {
                this.incrementViewCount(id).catch(console.error);
            }
            
            return item;
        } finally {
            client.release();
        }
    }

    // Enhanced search with all filters from your controllers
    static async search(searchParams, userId = null) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT i.*, 
                       u.first_name, u.last_name, u.profile_picture_url, u.email_verified,
                       u.university_id, un.name as university_name,
                       c.name as category_name, c.slug as category_slug,
                       ${userId ? `(SELECT COUNT(*) FROM saved_items WHERE item_id = i.id AND user_id = $1) > 0 as is_saved,` : 'false as is_saved,'}
                       ${searchParams.latitude && searchParams.longitude ? 
                         `(6371 * acos(cos(radians($${searchParams.latitude})) * cos(radians(i.latitude)) * 
                           cos(radians(i.longitude) - radians($${searchParams.longitude})) + 
                           sin(radians($${searchParams.latitude})) * sin(radians(i.latitude)))) as distance,` : ''
                       }
                       (SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id) as seller_rating
                FROM items i
                JOIN users u ON i.seller_id = u.id
                LEFT JOIN universities un ON u.university_id = un.id
                LEFT JOIN categories c ON i.category_id = c.id
                WHERE i.status = 'available' AND i.expires_at > CURRENT_TIMESTAMP
            `;
            
            const values = [];
            let paramCount = 0;

            // Add user ID for saved items check
            if (userId) {
                paramCount++;
                values.push(userId);
            }

            // Search query (enhanced to include brand and model)
            if (searchParams.q) {
                paramCount++;
                query += ` AND (i.title ILIKE $${paramCount} OR i.description ILIKE $${paramCount} OR i.brand ILIKE $${paramCount} OR i.model ILIKE $${paramCount})`;
                values.push(`%${searchParams.q}%`);
            }

            // Category filter (support both ID and slug)
            if (searchParams.category_id) {
                paramCount++;
                query += ` AND i.category_id = $${paramCount}`;
                values.push(searchParams.category_id);
            } else if (searchParams.category) {
                paramCount++;
                query += ` AND c.slug = $${paramCount}`;
                values.push(searchParams.category);
            }

            // Price range
            if (searchParams.min_price) {
                paramCount++;
                query += ` AND i.price >= $${paramCount}`;
                values.push(parseFloat(searchParams.min_price));
            }

            if (searchParams.max_price) {
                paramCount++;
                query += ` AND i.price <= $${paramCount}`;
                values.push(parseFloat(searchParams.max_price));
            }

            // Condition filter (support multiple conditions)
            if (searchParams.condition && searchParams.condition.length > 0) {
                const conditions = Array.isArray(searchParams.condition) 
                    ? searchParams.condition 
                    : [searchParams.condition];
                
                const conditionPlaceholders = conditions.map(() => `$${++paramCount}`).join(',');
                query += ` AND i.condition IN (${conditionPlaceholders})`;
                values.push(...conditions);
            }

            // Location filter (within radius)
            if (searchParams.latitude && searchParams.longitude && searchParams.radius) {
                paramCount += 3;
                query += ` AND (
                    6371 * acos(
                        cos(radians($${paramCount - 2})) * cos(radians(i.latitude)) *
                        cos(radians(i.longitude) - radians($${paramCount - 1})) +
                        sin(radians($${paramCount - 2})) * sin(radians(i.latitude))
                    )
                ) <= $${paramCount}`;
                values.push(
                    parseFloat(searchParams.latitude), 
                    parseFloat(searchParams.longitude), 
                    parseFloat(searchParams.radius)
                );
            }

            // University filter
            if (searchParams.university_id) {
                paramCount++;
                query += ` AND u.university_id = $${paramCount}`;
                values.push(searchParams.university_id);
            }

            // Exclude seller's own items
            if (searchParams.exclude_seller_id || (userId && !searchParams.include_own)) {
                const excludeId = searchParams.exclude_seller_id || userId;
                paramCount++;
                query += ` AND i.seller_id != $${paramCount}`;
                values.push(excludeId);
            }

            // Featured items filter
            if (searchParams.featured_only) {
                query += ` AND i.is_featured = true`;
            }

            // Sorting with distance support
            const sortOptions = {
                'newest': 'i.created_at DESC',
                'oldest': 'i.created_at ASC',
                'price_low': 'i.price ASC',
                'price_high': 'i.price DESC',
                'popular': 'i.view_count DESC',
                'ending_soon': 'i.expires_at ASC'
            };

            const sortBy = sortOptions[searchParams.sort] || 'i.created_at DESC';
            
            // Add distance sorting if location provided
            if (searchParams.latitude && searchParams.longitude) {
                query += ` ORDER BY distance ASC, ${sortBy}`;
            } else {
                query += ` ORDER BY ${sortBy}`;
            }

            // Pagination
            const limit = Math.min(parseInt(searchParams.limit) || 20, 100);
            const offset = (parseInt(searchParams.page) - 1 || 0) * limit;
            
            query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
            values.push(limit, offset);

            const result = await client.query(query, values);
            
            // Process items
            const items = result.rows.map(row => {
                const item = new Item(row);
                item.seller_rating = item.seller_rating ? parseFloat(item.seller_rating) : null;
                item.distance = item.distance ? parseFloat(item.distance).toFixed(2) : null;
                return item;
            });

            // Get total count with same filters
            let countQuery = `
                SELECT COUNT(*) as total
                FROM items i
                JOIN users u ON i.seller_id = u.id
                LEFT JOIN categories c ON i.category_id = c.id
                WHERE i.status = 'available' AND i.expires_at > CURRENT_TIMESTAMP
            `;
            
            const countValues = [];
            let countParamIndex = 0;

            // Apply same filters for count (excluding user-specific and pagination params)
            if (searchParams.q) {
                countParamIndex++;
                countQuery += ` AND (i.title ILIKE $${countParamIndex} OR i.description ILIKE $${countParamIndex} OR i.brand ILIKE $${countParamIndex} OR i.model ILIKE $${countParamIndex})`;
                countValues.push(`%${searchParams.q}%`);
            }

            if (searchParams.category_id) {
                countParamIndex++;
                countQuery += ` AND i.category_id = $${countParamIndex}`;
                countValues.push(searchParams.category_id);
            } else if (searchParams.category) {
                countParamIndex++;
                countQuery += ` AND c.slug = $${countParamIndex}`;
                countValues.push(searchParams.category);
            }

            if (searchParams.min_price) {
                countParamIndex++;
                countQuery += ` AND i.price >= $${countParamIndex}`;
                countValues.push(parseFloat(searchParams.min_price));
            }

            if (searchParams.max_price) {
                countParamIndex++;
                countQuery += ` AND i.price <= $${countParamIndex}`;
                countValues.push(parseFloat(searchParams.max_price));
            }

            if (searchParams.condition && searchParams.condition.length > 0) {
                const conditions = Array.isArray(searchParams.condition) 
                    ? searchParams.condition 
                    : [searchParams.condition];
                
                const conditionPlaceholders = conditions.map(() => `$${++countParamIndex}`).join(',');
                countQuery += ` AND i.condition IN (${conditionPlaceholders})`;
                countValues.push(...conditions);
            }

            if (searchParams.university_id) {
                countParamIndex++;
                countQuery += ` AND u.university_id = $${countParamIndex}`;
                countValues.push(searchParams.university_id);
            }

            if (searchParams.exclude_seller_id || (userId && !searchParams.include_own)) {
                const excludeId = searchParams.exclude_seller_id || userId;
                countParamIndex++;
                countQuery += ` AND i.seller_id != $${countParamIndex}`;
                countValues.push(excludeId);
            }

            if (searchParams.featured_only) {
                countQuery += ` AND i.is_featured = true`;
            }

            const countResult = await client.query(countQuery, countValues);
            const total = parseInt(countResult.rows[0].total);

            return {
                items,
                pagination: {
                    total,
                    page: parseInt(searchParams.page) || 1,
                    limit,
                    pages: Math.ceil(total / limit),
                    hasNext: parseInt(searchParams.page || 1) < Math.ceil(total / limit),
                    hasPrev: parseInt(searchParams.page || 1) > 1
                },
                filters: {
                    applied: Object.keys(searchParams).filter(key => 
                        searchParams[key] && !['page', 'limit', 'sort'].includes(key)
                    ),
                    total_results: total
                }
            };
        } finally {
            client.release();
        }
    }

    // Enhanced update with better error handling
    async update(updateData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const fields = [];
            const values = [];
            let paramCount = 1;

            // Build dynamic update query
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined && key !== 'id') {
                    if (key === 'images') {
                        fields.push(`${key} = $${paramCount}`);
                        values.push(JSON.stringify(updateData[key]));
                    } else if (key === 'price') {
                        fields.push(`${key} = $${paramCount}`);
                        values.push(parseFloat(updateData[key]));
                    } else if (['latitude', 'longitude'].includes(key)) {
                        fields.push(`${key} = $${paramCount}`);
                        values.push(updateData[key] ? parseFloat(updateData[key]) : null);
                    } else {
                        fields.push(`${key} = $${paramCount}`);
                        values.push(updateData[key]);
                    }
                    paramCount++;
                }
            });

            if (fields.length === 0) {
                throw new Error('No fields to update');
            }

            fields.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(this.id);

            const query = `
                UPDATE items 
                SET ${fields.join(', ')}
                WHERE id = $${paramCount}
                RETURNING *
            `;

            const result = await client.query(query, values);
            
            if (result.rows.length === 0) {
                throw new Error('Item not found');
            }

            await client.query('COMMIT');

            // Update current instance
            Object.assign(this, result.rows[0]);
            
            // Parse images
            if (this.images && typeof this.images === 'string') {
                this.images = JSON.parse(this.images);
            }
            
            return this;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Enhanced delete with better image cleanup
    async delete() {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get current images to delete from S3
            const imageQuery = 'SELECT images FROM items WHERE id = $1';
            const imageResult = await client.query(imageQuery, [this.id]);
            
            if (imageResult.rows.length > 0) {
                const images = JSON.parse(imageResult.rows[0].images || '[]');
                
                // Delete images from S3 (async, don't wait)
                images.forEach(image => {
                    if (image.key) {
                        deleteFromS3(image.key).catch(console.error);
                        // Also delete thumbnail if exists
                        const thumbnailKey = image.key.replace(/\.[^/.]+$/, '_thumb.jpg');
                        deleteFromS3(thumbnailKey).catch(console.error);
                    }
                });
            }

            // Remove from saved items
            await client.query('DELETE FROM saved_items WHERE item_id = $1', [this.id]);

            // Soft delete - update status instead of actual deletion
            const deleteQuery = `
                UPDATE items 
                SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `;
            
            const result = await client.query(deleteQuery, [this.id]);
            await client.query('COMMIT');
            
            Object.assign(this, result.rows[0]);
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Enhanced mark as sold with buyer tracking
    async markAsSold(buyerId = null) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const query = `
                UPDATE items 
                SET status = 'sold', 
                    sold_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `;
            
            const result = await client.query(query, [this.id]);
            
            // Create transaction record if buyer provided
            if (buyerId) {
                await client.query(
                    `INSERT INTO transactions (item_id, buyer_id, seller_id, amount, status)
                     VALUES ($1, $2, $3, $4, 'completed')`,
                    [this.id, buyerId, this.seller_id, this.price]
                );
            }

            await client.query('COMMIT');
            Object.assign(this, result.rows[0]);
            
            return this;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Mark as reserved
    async markAsReserved() {
        const client = await pool.connect();
        try {
            const query = `
                UPDATE items 
                SET status = 'reserved', updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `;
            
            const result = await client.query(query, [this.id]);
            Object.assign(this, result.rows[0]);
            
            return this;
        } finally {
            client.release();
        }
    }

    // Increment view count (enhanced with rate limiting)
    static async incrementViewCount(itemId, userId = null) {
        const client = await pool.connect();
        try {
            // Simple rate limiting - only increment if not incremented in last hour for this user/IP
            if (userId) {
                const recentView = await client.query(
                    `SELECT id FROM item_views 
                     WHERE item_id = $1 AND user_id = $2 AND created_at > NOW() - INTERVAL '1 hour'`,
                    [itemId, userId]
                );
                
                if (recentView.rows.length > 0) {
                    return; // Already viewed recently
                }
                
                // Log the view
                await client.query(
                    'INSERT INTO item_views (item_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [itemId, userId]
                );
            }

            const query = `
                UPDATE items 
                SET view_count = view_count + 1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `;
            
            await client.query(query, [itemId]);
        } finally {
            client.release();
        }
    }

    // Get featured items
    static async getFeatured(limit = 12, userId = null) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT i.*, u.first_name, u.last_name, u.profile_picture_url,
                       c.name as category_name, c.slug as category_slug,
                       ${userId ? `(SELECT COUNT(*) FROM saved_items WHERE item_id = i.id AND user_id = $1) > 0 as is_saved` : 'false as is_saved'}
                FROM items i
                JOIN users u ON i.seller_id = u.id
                LEFT JOIN categories c ON i.category_id = c.id
                WHERE i.status = 'available' AND (i.is_featured = true OR i.view_count > 50)
                ${userId ? 'AND i.seller_id != $1' : ''}
                ORDER BY i.is_featured DESC, i.view_count DESC, i.created_at DESC
                LIMIT $${userId ? 2 : 1}
            `;

            const params = userId ? [userId, limit] : [limit];
            const result = await client.query(query, params);

            return result.rows.map(row => new Item(row));
        } finally {
            client.release();
        }
    }

    // Get similar items (enhanced algorithm)
    async getSimilarItems(limit = 8, userId = null) {
        const client = await pool.connect();
        try {
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
            
            const priceRange = this.price * 0.5;
            const minPrice = Math.max(0, this.price - priceRange);
            const maxPrice = this.price + priceRange;
            
            const params = [
                this.category_id, this.id, this.seller_id,
                minPrice, this.price, limit
            ];

            if (userId) {
                params.splice(5, 0, userId);
            }

            const result = await client.query(query, params);
            
            return result.rows.map(row => new Item(row));
        } finally {
            client.release();
        }
    }

    // Enhanced save/unsave with better error handling
    static async toggleSave(itemId, userId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Verify item exists and is not user's own
            const itemCheck = await client.query(
                'SELECT seller_id, status FROM items WHERE id = $1',
                [itemId]
            );

            if (itemCheck.rows.length === 0) {
                throw new Error('Item not found');
            }

            const item = itemCheck.rows[0];

            if (item.seller_id === userId) {
                throw new Error("Cannot save your own items");
            }

            if (item.status !== 'available') {
                throw new Error('Item is no longer available');
            }

            // Check if already saved
            const checkQuery = 'SELECT id FROM saved_items WHERE item_id = $1 AND user_id = $2';
            const checkResult = await client.query(checkQuery, [itemId, userId]);
            
            if (checkResult.rows.length > 0) {
                // Remove from saved
                await client.query('DELETE FROM saved_items WHERE item_id = $1 AND user_id = $2', [itemId, userId]);
                await client.query('COMMIT');
                return { saved: false, message: 'Item removed from saved items' };
            } else {
                // Add to saved
                await client.query(
                    'INSERT INTO saved_items (item_id, user_id, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
                    [itemId, userId]
                );
                await client.query('COMMIT');
                return { saved: true, message: 'Item saved successfully! ❤️' };
            }
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Enhanced saved items with better filtering
    static async getSavedItems(userId, searchParams = {}) {
        const client = await pool.connect();
        try {
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
            
            const values = [userId];
            let paramCount = 2;

            // Category filter
            if (searchParams.category_id) {
                query += ` AND i.category_id = $${paramCount}`;
                values.push(searchParams.category_id);
                paramCount++;
            }

            // Search query
            if (searchParams.q) {
                query += ` AND (i.title ILIKE $${paramCount} OR i.description ILIKE $${paramCount})`;
                values.push(`%${searchParams.q}%`);
                paramCount++;
            }

            // Price filters
            if (searchParams.min_price) {
                query += ` AND i.price >= $${paramCount}`;
                values.push(parseFloat(searchParams.min_price));
                paramCount++;
            }

            if (searchParams.max_price) {
                query += ` AND i.price <= $${paramCount}`;
                values.push(parseFloat(searchParams.max_price));
                paramCount++;
            }

            // Sorting
            const sortOptions = {
                'newest_saved': 'si.created_at DESC',
                'oldest_saved': 'si.created_at ASC',
                'price_low': 'i.price ASC',
                'price_high': 'i.price DESC',
                'newest_posted': 'i.created_at DESC'
            };

            const sortBy = sortOptions[searchParams.sort] || 'si.created_at DESC';
            query += ` ORDER BY ${sortBy}`;

            // Pagination
            const limit = Math.min(parseInt(searchParams.limit) || 20, 100);
            const offset = (parseInt(searchParams.page) - 1 || 0) * limit;
            
            query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
            values.push(limit, offset);

            const result = await client.query(query, values);
            
            const items = result.rows.map(row => new Item(row));

            // Get total count
            const countQuery = `
                SELECT COUNT(*) as total
                FROM saved_items si
                JOIN items i ON si.item_id = i.id
                WHERE si.user_id = $1 AND i.status = 'available'
                ${searchParams.category_id ? `AND i.category_id = $2` : ''}
                ${searchParams.q ? `AND (i.title ILIKE $${searchParams.category_id ? 3 : 2} OR i.description ILIKE $${searchParams.category_id ? 3 : 2})` : ''}
            `;
            
            const countValues = [userId];
            if (searchParams.category_id) countValues.push(searchParams.category_id);
            if (searchParams.q) countValues.push(`%${searchParams.q}%`);
            
            const countResult = await client.query(countQuery, countValues);
            const total = parseInt(countResult.rows[0].total);

            return {
                items,
                pagination: {
                    total,
                    page: parseInt(searchParams.page) || 1,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            };
        } finally {
            client.release();
        }
    }

    // Enhanced user listings with comprehensive stats
    static async getUserListings(userId, searchParams = {}) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT i.*, c.name as category_name, c.slug as category_slug,
                       (SELECT COUNT(*) FROM saved_items WHERE item_id = i.id) as saves_count,
                       false as is_saved
                FROM items i
                LEFT JOIN categories c ON i.category_id = c.id
                WHERE i.seller_id = $1
            `;
            
            const values = [userId];
            let paramCount = 2;

            // Status filter
            if (searchParams.status === 'active') {
                query += ` AND i.status = 'available'`;
            } else if (searchParams.status === 'sold') {
                query += ` AND i.status = 'sold'`;
            } else if (searchParams.status === 'all') {
                query += ` AND i.status != 'inactive'`;
            } else if (searchParams.status) {
                query += ` AND i.status = $${paramCount}`;
                values.push(searchParams.status);
                paramCount++;
            } else {
                query += ` AND i.status != 'inactive'`; // Default: exclude deleted
            }

            // Category filter
            if (searchParams.category_id) {
                query += ` AND i.category_id = $${paramCount}`;
                values.push(searchParams.category_id);
                paramCount++;
            }

            // Search query
            if (searchParams.q) {
                query += ` AND (i.title ILIKE $${paramCount} OR i.description ILIKE $${paramCount})`;
                values.push(`%${searchParams.q}%`);
                paramCount++;
            }

            // Sorting
            query += ` ORDER BY i.created_at DESC`;

            // Pagination
            const limit = Math.min(parseInt(searchParams.limit) || 20, 100);
            const offset = (parseInt(searchParams.page) - 1 || 0) * limit;
            
            query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
            values.push(limit, offset);

            const result = await client.query(query, values);
            
            const items = result.rows.map(row => {
                const item = new Item(row);
                item.saves_count = parseInt(item.saves_count || 0);
                return item;
            });

            // Get comprehensive stats
            const statsQuery = `
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'available') as available,
                    COUNT(*) FILTER (WHERE status = 'sold') as sold,
                    COUNT(*) FILTER (WHERE status = 'reserved') as reserved,
                    COALESCE(SUM(view_count), 0) as total_views,
                    COALESCE(AVG(price), 0) as avg_price
                FROM items
                WHERE seller_id = $1 AND status != 'inactive'
            `;
            
            const statsResult = await client.query(statsQuery, [userId]);
            const stats = {
                ...statsResult.rows[0],
                total: parseInt(statsResult.rows.total),
                available: parseInt(statsResult.rows.available),
                sold: parseInt(statsResult.rows.sold),
                reserved: parseInt(statsResult.rows.reserved),
                total_views: parseInt(statsResult.rows.total_views),
                avg_price: parseFloat(statsResult.rows.avg_price)
            };

            return {
                items,
                stats,
                pagination: {
                    total: stats.total,
                    page: parseInt(searchParams.page) || 1,
                    limit,
                    pages: Math.ceil(stats.total / limit)
                }
            };
        } finally {
            client.release();
        }
    }

    // Enhanced conversion to safe object
    toSafeObject() {
        const safeObj = {
            ...this,
            images: typeof this.images === 'string' ? JSON.parse(this.images) : (this.images || []),
            price: parseFloat(this.price || 0),
            view_count: parseInt(this.view_count || 0),
            latitude: this.latitude ? parseFloat(this.latitude) : null,
            longitude: this.longitude ? parseFloat(this.longitude) : null,
            is_saved: Boolean(this.is_saved),
            seller_rating: this.seller_rating ? parseFloat(this.seller_rating) : null,
            saves_count: parseInt(this.saves_count || 0)
        };

        // Remove sensitive seller info if not owner
        if (!this.is_owner) {
            delete safeObj.seller_email;
            delete safeObj.seller_phone;
        }

        return safeObj;
    }

    // Utility methods
    isAvailable() {
        return this.status === 'available' && new Date(this.expires_at) > new Date();
    }

    isSold() {
        return this.status === 'sold';
    }

    isReserved() {
        return this.status === 'reserved';
    }

    isExpired() {
        return new Date(this.expires_at) <= new Date();
    }

    getImageUrls() {
        const images = typeof this.images === 'string' ? JSON.parse(this.images) : this.images;
        return images.map(img => img.url || img);
    }

    getThumbnailUrls() {
        const images = typeof this.images === 'string' ? JSON.parse(this.images) : this.images;
        return images.map(img => img.thumbnail_url || img.url || img);
    }
}

export default Item;
