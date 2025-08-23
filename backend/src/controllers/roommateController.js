import { pool, withTransaction } from '../config/database.js';

// Search Roommate Posts
export const searchPosts = async (req, res) => {
    try {
        const {
            q: search,
            min_budget,
            max_budget,
            housing_type,
            preferred_location,
            gender_preference,
            latitude,
            longitude,
            radius,
            sort: sortBy = 'newest',
            page = 1,
            limit = 20
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const userId = req.user?.userId;

        let query = `
            SELECT rp.*, u.first_name, u.last_name, u.profile_picture_url,
                   u.university_id, un.name as university_name,
                   ${latitude && longitude ? 
                     `(6371 * acos(cos(radians(${latitude})) * cos(radians(rp.latitude)) * 
                       cos(radians(rp.longitude) - radians(${longitude})) + 
                       sin(radians(${latitude})) * sin(radians(rp.latitude)))) as distance,` : ''
                   }
                   (SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id) as user_rating,
                   (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as review_count
            FROM roommate_posts rp
            JOIN users u ON rp.user_id = u.id
            LEFT JOIN universities un ON u.university_id = un.id
            WHERE rp.status = 'looking' AND rp.expires_at > CURRENT_TIMESTAMP
        `;

        const params = [];
        let paramCount = 0;

        // Exclude user's own posts
        if (userId) {
            paramCount++;
            query += ` AND rp.user_id != $${paramCount}`;
            params.push(userId);
        }

        // Search filter
        if (search) {
            paramCount++;
            query += ` AND (rp.title ILIKE $${paramCount} OR rp.description ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        // Budget filters
        if (min_budget) {
            paramCount++;
            query += ` AND rp.budget_max >= $${paramCount}`;
            params.push(parseFloat(min_budget));
        }

        if (max_budget) {
            paramCount++;
            query += ` AND rp.budget_min <= $${paramCount}`;
            params.push(parseFloat(max_budget));
        }

        // Housing type filter
        if (housing_type) {
            paramCount++;
            query += ` AND rp.housing_type = $${paramCount}`;
            params.push(housing_type);
        }

        // Location preference filter
        if (preferred_location) {
            paramCount++;
            query += ` AND rp.preferred_location = $${paramCount}`;
            params.push(preferred_location);
        }

        // Gender preference filter
        if (gender_preference && gender_preference !== 'any') {
            paramCount++;
            query += ` AND (rp.gender_preference = $${paramCount} OR rp.gender_preference = 'any')`;
            params.push(gender_preference);
        }

        // Location radius filter
        if (latitude && longitude && radius) {
            paramCount++;
            query += ` AND (6371 * acos(cos(radians($${paramCount-2})) * cos(radians(rp.latitude)) * 
                       cos(radians(rp.longitude) - radians($${paramCount-1})) + 
                       sin(radians($${paramCount-2})) * sin(radians(rp.latitude)))) <= $${paramCount}`;
            params.push(parseFloat(radius));
        }

        // Sorting
        const sortOptions = {
            'newest': 'rp.created_at DESC',
            'budget_low': 'rp.budget_min ASC',
            'budget_high': 'rp.budget_max DESC',
            'move_in_date': 'rp.move_in_date ASC'
        };

        const orderBy = sortOptions[sortBy] || 'rp.created_at DESC';
        
        if (latitude && longitude) {
            query += ` ORDER BY distance ASC, ${orderBy}`;
        } else {
            query += ` ORDER BY ${orderBy}`;
        }

        // Pagination
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(parseInt(limit), offset);

        const result = await pool.query(query, params);

        // Get total count
        const countResult = await pool.query(
            'SELECT COUNT(*) as total FROM roommate_posts WHERE status = $1',
            ['looking']
        );

        const posts = result.rows.map(post => ({
            ...post,
            images: typeof post.images === 'string' ? JSON.parse(post.images || '[]') : (post.images || []),
            user_rating: post.user_rating ? parseFloat(post.user_rating) : null,
            distance: post.distance ? parseFloat(post.distance).toFixed(2) : null
        }));

        res.json({
            success: true,
            data: {
                posts,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(countResult.rows[0].total),
                    pages: Math.ceil(parseInt(countResult.rows.total) / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Error searching roommate posts:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching roommate posts'
        });
    }
};

// Get Roommate Post by ID
export const getPostById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;

        const query = `
            SELECT rp.*, u.first_name, u.last_name, u.profile_picture_url, u.bio,
                   u.university_id, un.name as university_name, u.created_at as user_joined,
                   (SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id) as user_rating,
                   (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as review_count
            FROM roommate_posts rp
            JOIN users u ON rp.user_id = u.id
            LEFT JOIN universities un ON u.university_id = un.id
            WHERE rp.id = $1
        `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Roommate post not found'
            });
        }

        const post = {
            ...result.rows[0],
            images: typeof result.rows.images === 'string' ? 
                JSON.parse(result.rows.images || '[]') : 
                (result.rows.images || []),
            user_rating: result.rows.user_rating ? parseFloat(result.rows.user_rating) : null
        };

        // Increment view count
        if (!userId || userId !== post.user_id) {
            pool.query('UPDATE roommate_posts SET view_count = view_count + 1 WHERE id = $1', [id])
                .catch(console.error);
        }

        res.json({
            success: true,
            data: { post }
        });

    } catch (error) {
        console.error('Error fetching roommate post:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching roommate post'
        });
    }
};

// Create Roommate Post
export const createPost = async (req, res) => {
    try {
        const {
            title, description, budget_min, budget_max, housing_type,
            preferred_location, move_in_date, lease_duration_months,
            gender_preference, age_preference, location_address,
            latitude, longitude, cleanliness_level, noise_tolerance,
            guest_policy, sleep_schedule, study_habits, social_level,
            smoking_allowed, pets_allowed, alcohol_friendly
        } = req.body;

        const user_id = req.user.userId;

        // Process uploaded images
        const imageUrls = [];
        if (req.processedFiles && req.processedFiles.length > 0) {
            req.processedFiles.forEach(file => {
                imageUrls.push({
                    url: file.original.location,
                    key: file.original.key,
                    caption: file.caption || null
                });
            });
        }

        const result = await pool.query(
            `INSERT INTO roommate_posts (
                user_id, title, description, budget_min, budget_max, housing_type,
                preferred_location, move_in_date, lease_duration_months,
                gender_preference, location_address, latitude, longitude,
                cleanliness_level, noise_tolerance, guest_policy, sleep_schedule,
                study_habits, social_level, smoking_allowed, pets_allowed,
                alcohol_friendly, images, expires_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
            RETURNING *`,
            [
                user_id, title, description, parseFloat(budget_min), parseFloat(budget_max),
                housing_type, preferred_location, move_in_date, lease_duration_months,
                gender_preference, location_address, latitude ? parseFloat(latitude) : null,
                longitude ? parseFloat(longitude) : null, cleanliness_level,
                noise_tolerance, guest_policy, sleep_schedule, study_habits,
                social_level, smoking_allowed, pets_allowed, alcohol_friendly,
                JSON.stringify(imageUrls),
                new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
            ]
        );

        const post = {
            ...result.rows[0],
            images: JSON.parse(result.rows.images || '[]')
        };

        res.status(201).json({
            success: true,
            message: 'Roommate post created successfully! 🏠',
            data: { post }
        });

    } catch (error) {
        console.error('Error creating roommate post:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating roommate post'
        });
    }
};

// Update Roommate Post
export const updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        // Check ownership
        const ownerCheck = await pool.query(
            'SELECT user_id FROM roommate_posts WHERE id = $1',
            [id]
        );

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Roommate post not found'
            });
        }

        if (ownerCheck.rows[0].user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this post'
            });
        }

        const {
            title, description, budget_min, budget_max, housing_type,
            preferred_location, move_in_date, lease_duration_months,
            gender_preference, location_address, latitude, longitude,
            cleanliness_level, noise_tolerance, guest_policy,
            sleep_schedule, study_habits, social_level,
            smoking_allowed, pets_allowed, alcohol_friendly, existing_images
        } = req.body;

        // Process new images
        const newImages = [];
        if (req.processedFiles && req.processedFiles.length > 0) {
            req.processedFiles.forEach(file => {
                newImages.push({
                    url: file.original.location,
                    key: file.original.key,
                    caption: file.caption || null
                });
            });
        }

        const existingImageArray = existing_images ? JSON.parse(existing_images) : [];
        const finalImages = [...existingImageArray, ...newImages];

        const updateResult = await pool.query(
            `UPDATE roommate_posts 
             SET title = $1, description = $2, budget_min = $3, budget_max = $4,
                 housing_type = $5, preferred_location = $6, move_in_date = $7,
                 lease_duration_months = $8, gender_preference = $9,
                 location_address = $10, latitude = $11, longitude = $12,
                 cleanliness_level = $13, noise_tolerance = $14, guest_policy = $15,
                 sleep_schedule = $16, study_habits = $17, social_level = $18,
                 smoking_allowed = $19, pets_allowed = $20, alcohol_friendly = $21,
                 images = $22, updated_at = CURRENT_TIMESTAMP
             WHERE id = $23
             RETURNING *`,
            [
                title, description, parseFloat(budget_min), parseFloat(budget_max),
                housing_type, preferred_location, move_in_date, lease_duration_months,
                gender_preference, location_address, latitude ? parseFloat(latitude) : null,
                longitude ? parseFloat(longitude) : null, cleanliness_level,
                noise_tolerance, guest_policy, sleep_schedule, study_habits,
                social_level, smoking_allowed, pets_allowed, alcohol_friendly,
                JSON.stringify(finalImages), id
            ]
        );

        const post = {
            ...updateResult.rows[0],
            images: JSON.parse(updateResult.rows.images || '[]')
        };

        res.json({
            success: true,
            message: 'Roommate post updated successfully! ✨',
            data: { post }
        });

    } catch (error) {
        console.error('Error updating roommate post:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating roommate post'
        });
    }
};

// Delete Roommate Post
export const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        // Check ownership
        const ownerCheck = await pool.query(
            'SELECT user_id FROM roommate_posts WHERE id = $1',
            [id]
        );

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Roommate post not found'
            });
        }

        if (ownerCheck.rows[0].user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this post'
            });
        }

        // Soft delete
        await pool.query(
            'UPDATE roommate_posts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['inactive', id]
        );

        res.json({
            success: true,
            message: 'Roommate post deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting roommate post:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting roommate post'
        });
    }
};

// Get User's Roommate Posts
export const getUserPosts = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { status = 'active', page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT rp.*, 
                   (SELECT COUNT(*) FROM messages WHERE roommate_post_id = rp.id) as message_count
            FROM roommate_posts rp
            WHERE rp.user_id = $1
        `;

        const params = [userId];
        let paramCount = 1;

        // Status filter
        if (status === 'active') {
            query += ` AND rp.status = 'looking'`;
        } else if (status === 'all') {
            query += ` AND rp.status != 'inactive'`;
        } else {
            paramCount++;
            query += ` AND rp.status = $${paramCount}`;
            params.push(status);
        }

        query += ` ORDER BY rp.created_at DESC`;
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(parseInt(limit), offset);

        const result = await pool.query(query, params);

        const posts = result.rows.map(post => ({
            ...post,
            images: typeof post.images === 'string' ? JSON.parse(post.images || '[]') : (post.images || []),
            message_count: parseInt(post.message_count)
        }));

        res.json({
            success: true,
            data: { posts }
        });

    } catch (error) {
        console.error('Error fetching user roommate posts:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching your roommate posts'
        });
    }
};

// Save Compatibility Preferences
export const savePreferences = async (req, res) => {
    try {
        const userId = req.user.userId;
        const preferences = req.body;

        // Store in user profile or separate preferences table
        await pool.query(
            `INSERT INTO user_roommate_preferences (user_id, preferences, created_at, updated_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id) 
             DO UPDATE SET preferences = $2, updated_at = CURRENT_TIMESTAMP`,
            [userId, JSON.stringify(preferences)]
        );

        res.json({
            success: true,
            message: 'Compatibility preferences saved successfully! 🎯',
            data: { preferences }
        });

    } catch (error) {
        console.error('Error saving compatibility preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving preferences'
        });
    }
};

// Get Compatibility Preferences
export const getPreferences = async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            'SELECT preferences FROM user_roommate_preferences WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                data: { preferences: null }
            });
        }

        const preferences = JSON.parse(result.rows[0].preferences);

        res.json({
            success: true,
            data: { preferences }
        });

    } catch (error) {
        console.error('Error fetching compatibility preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching preferences'
        });
    }
};

// Update Compatibility Preferences
export const updatePreferences = async (req, res) => {
    try {
        const userId = req.user.userId;
        const preferences = req.body;

        // Update preferences in the database
        await pool.query(
            `UPDATE user_roommate_preferences 
             SET preferences = $1, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $2`,
            [JSON.stringify(preferences), userId]
        );

        res.json({
            success: true,
            message: 'Compatibility preferences updated successfully! 🎯',
            data: { preferences }
        });

    } catch (error) {
        console.error('Error updating compatibility preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating preferences'
        });
    }
};

// Get Compatibility Matches
export const getCompatibilityMatches = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { limit = 10 } = req.query;

        // Get user's preferences
        const prefsResult = await pool.query(
            'SELECT preferences FROM user_roommate_preferences WHERE user_id = $1',
            [userId]
        );

        if (prefsResult.rows.length === 0) {
            return res.json({
                success: true,
                data: { matches: [] },
                message: 'Complete your compatibility quiz first!'
            });
        }

        const userPrefs = JSON.parse(prefsResult.rows[0].preferences);

        // Find compatible roommate posts
        const query = `
            SELECT rp.*, u.first_name, u.last_name, u.profile_picture_url,
                   up.preferences as compatibility_preferences
            FROM roommate_posts rp
            JOIN users u ON rp.user_id = u.id
            LEFT JOIN user_roommate_preferences up ON u.id = up.user_id
            WHERE rp.status = 'looking' AND rp.user_id != $1
            ORDER BY rp.created_at DESC
            LIMIT $2
        `;

        const result = await pool.query(query, [userId, parseInt(limit)]);

        // Calculate compatibility scores
        const matches = result.rows.map(post => {
            let compatibilityScore = 50; // Base score

            if (post.compatibility_preferences) {
                const otherPrefs = JSON.parse(post.compatibility_preferences);
                compatibilityScore = calculateCompatibilityScore(userPrefs, otherPrefs);
            }

            return {
                ...post,
                images: typeof post.images === 'string' ? JSON.parse(post.images || '[]') : (post.images || []),
                compatibility_score: compatibilityScore,
                compatibility_preferences: undefined // Remove from response
            };
        }).sort((a, b) => b.compatibility_score - a.compatibility_score);

        res.json({
            success: true,
            data: { matches }
        });

    } catch (error) {
        console.error('Error fetching compatibility matches:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching compatibility matches'
        });
    }
};

// Helper function to calculate compatibility score
const calculateCompatibilityScore = (userPrefs, otherPrefs) => {
    let score = 0;
    let totalWeight = 0;
    
    const weights = {
        cleanliness: 0.2,
        noise_level: 0.15,
        social_level: 0.15,
        sleep_schedule: 0.1,
        study_habits: 0.1,
        cooking_habits: 0.1,
        sharing_comfort: 0.1,
        pet_preference: 0.05,
        deal_breakers: 0.05
    };

    Object.entries(weights).forEach(([key, weight]) => {
        if (userPrefs[key] !== undefined && otherPrefs[key] !== undefined) {
            let compatibility = 1;
            
            if (key === 'deal_breakers') {
                const userBreakers = Array.isArray(userPrefs[key]) ? userPrefs[key] : [];
                const otherBreakers = Array.isArray(otherPrefs[key]) ? otherPrefs[key] : [];
                const conflicts = userBreakers.filter(item => otherBreakers.includes(item));
                compatibility = conflicts.length === 0 ? 1 : 0.3;
            } else if (typeof userPrefs[key] === 'number' && typeof otherPrefs[key] === 'number') {
                const diff = Math.abs(userPrefs[key] - otherPrefs[key]);
                compatibility = Math.max(0, 1 - (diff / 4));
            } else if (userPrefs[key] === otherPrefs[key]) {
                compatibility = 1;
            } else {
                compatibility = 0.5;
            }
            
            score += compatibility * weight;
            totalWeight += weight;
        }
    });

    return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 50;
};

// Get Matching Analytics
export const getMatchingAnalytics = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get user's posts and their performance
        const postsResult = await pool.query(
            `SELECT COUNT(*) as total_posts,
                    COUNT(*) FILTER (WHERE status = 'looking') as active_posts,
                    COALESCE(SUM(view_count), 0) as total_views,
                    COALESCE(SUM(interests), 0) as total_interests
             FROM roommate_posts 
             WHERE user_id = $1 AND status != 'inactive'`,
            [userId]
        );

        // Get compatibility stats
        const compatibilityResult = await pool.query(
            'SELECT preferences FROM user_roommate_preferences WHERE user_id = $1',
            [userId]
        );

        const analytics = {
            post_stats: {
                total_posts: parseInt(postsResult.rows[0].total_posts),
                active_posts: parseInt(postsResult.rows.active_posts),
                total_views: parseInt(postsResult.rows.total_views),
                total_interests: parseInt(postsResult.rows.total_interests)
            },
            has_compatibility_profile: compatibilityResult.rows.length > 0,
            compatibility_factors: compatibilityResult.rows.length > 0 ? 
                Object.keys(JSON.parse(compatibilityResult.rows[0].preferences)) : []
        };

        res.json({
            success: true,
            data: { analytics }
        });

    } catch (error) {
        console.error('Error fetching matching analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching analytics'
        });
    }
};
