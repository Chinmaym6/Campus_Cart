import { pool, withTransaction } from '../config/database.js';

// Get Admin Dashboard
export const getDashboard = async (req, res) => {
    try {
        const dashboardQuery = `
            SELECT 
                -- User stats
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
                (SELECT COUNT(*) FROM users WHERE status = 'pending_verification') as pending_users,
                (SELECT COUNT(*) FROM users WHERE status = 'suspended') as suspended_users,
                (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_week,
                
                -- Item stats  
                (SELECT COUNT(*) FROM items) as total_items,
                (SELECT COUNT(*) FROM items WHERE status = 'available') as available_items,
                (SELECT COUNT(*) FROM items WHERE status = 'sold') as sold_items,
                (SELECT COUNT(*) FROM items WHERE created_at >= NOW() - INTERVAL '7 days') as new_items_week,
                
                -- Roommate stats
                (SELECT COUNT(*) FROM roommate_posts) as total_roommate_posts,
                (SELECT COUNT(*) FROM roommate_posts WHERE status = 'looking') as active_roommate_posts,
                (SELECT COUNT(*) FROM roommate_posts WHERE created_at >= NOW() - INTERVAL '7 days') as new_roommate_posts_week,
                
                -- Message stats
                (SELECT COUNT(*) FROM messages) as total_messages,
                (SELECT COUNT(*) FROM messages WHERE created_at >= NOW() - INTERVAL '7 days') as new_messages_week,
                
                -- Review stats
                (SELECT COUNT(*) FROM reviews) as total_reviews,
                (SELECT AVG(rating) FROM reviews) as average_rating,
                
                -- Report stats
                (SELECT COUNT(*) FROM reports WHERE status = 'pending') as pending_reports,
                (SELECT COUNT(*) FROM reports) as total_reports
        `;

        const result = await pool.query(dashboardQuery);
        
        const stats = {
            ...result.rows[0],
            total_users: parseInt(result.rows.total_users),
            active_users: parseInt(result.rows.active_users),
            pending_users: parseInt(result.rows.pending_users),
            suspended_users: parseInt(result.rows.suspended_users),
            new_users_week: parseInt(result.rows.new_users_week),
            total_items: parseInt(result.rows.total_items),
            available_items: parseInt(result.rows.available_items),
            sold_items: parseInt(result.rows.sold_items),
            new_items_week: parseInt(result.rows.new_items_week),
            total_roommate_posts: parseInt(result.rows.total_roommate_posts),
            active_roommate_posts: parseInt(result.rows.active_roommate_posts),
            new_roommate_posts_week: parseInt(result.rows.new_roommate_posts_week),
            total_messages: parseInt(result.rows.total_messages),
            new_messages_week: parseInt(result.rows.new_messages_week),
            total_reviews: parseInt(result.rows.total_reviews),
            pending_reports: parseInt(result.rows.pending_reports),
            total_reports: parseInt(result.rows.total_reports),
            average_rating: result.rows.average_rating ? parseFloat(result.rows.average_rating) : null
        };

        // Get recent activity
        const recentActivityQuery = `
            SELECT activity_type, activity_data, created_at, user_id
            FROM (
                SELECT 'user_registered' as activity_type,
                       json_build_object('name', first_name || ' ' || last_name, 'email', email) as activity_data,
                       created_at, id as user_id
                FROM users WHERE created_at > NOW() - INTERVAL '24 hours'
                UNION ALL
                SELECT 'item_created' as activity_type,
                       json_build_object('title', title, 'price', price) as activity_data,
                       created_at, seller_id as user_id
                FROM items WHERE created_at > NOW() - INTERVAL '24 hours'
                UNION ALL
                SELECT 'report_submitted' as activity_type,
                       json_build_object('type', type, 'description', LEFT(description, 50)) as activity_data,
                       created_at, reporter_id as user_id
                FROM reports WHERE created_at > NOW() - INTERVAL '24 hours'
            ) activities
            ORDER BY created_at DESC
            LIMIT 20
        `;

        const activityResult = await pool.query(recentActivityQuery);

        res.json({
            success: true,
            data: {
                stats,
                recent_activity: activityResult.rows
            }
        });

    } catch (error) {
        console.error('Error fetching admin dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard data'
        });
    }
};

// Get Users (Admin)
export const getUsers = async (req, res) => {
    try {
        const { status, page = 1, limit = 50, search } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT u.*, un.name as university_name,
                   (SELECT COUNT(*) FROM items WHERE seller_id = u.id) as total_items,
                   (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as total_reviews,
                   (SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id) as average_rating
            FROM users u
            LEFT JOIN universities un ON u.university_id = un.id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 0;

        // Status filter
        if (status && status !== 'all') {
            paramCount++;
            query += ` AND u.status = $${paramCount}`;
            params.push(status);
        }

        // Search filter
        if (search) {
            paramCount++;
            query += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY u.created_at DESC`;
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(parseInt(limit), offset);

        const result = await pool.query(query, params);

        const users = result.rows.map(user => ({
            ...user,
            total_items: parseInt(user.total_items),
            total_reviews: parseInt(user.total_reviews),
            average_rating: user.average_rating ? parseFloat(user.average_rating) : null,
            // Remove sensitive data
            password_hash: undefined,
            email_verification_token: undefined,
            password_reset_token: undefined
        }));

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
        const countParams = [];
        let countParamCount = 0;

        if (status && status !== 'all') {
            countParamCount++;
            countQuery += ` AND status = $${countParamCount}`;
            countParams.push(status);
        }

        if (search) {
            countParamCount++;
            countQuery += ` AND (first_name ILIKE $${countParamCount} OR last_name ILIKE $${countParamCount} OR email ILIKE $${countParamCount})`;
            countParams.push(`%${search}%`);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users'
        });
    }
};

// Get User Details (Admin)
export const getUserDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT u.*, un.name as university_name,
                   (SELECT COUNT(*) FROM items WHERE seller_id = u.id) as total_items,
                   (SELECT COUNT(*) FROM items WHERE seller_id = u.id AND status = 'sold') as sold_items,
                   (SELECT COUNT(*) FROM roommate_posts WHERE user_id = u.id) as total_roommate_posts,
                   (SELECT COUNT(*) FROM messages WHERE sender_id = u.id OR recipient_id = u.id) as total_messages,
                   (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as reviews_received,
                   (SELECT COUNT(*) FROM reviews WHERE reviewer_id = u.id) as reviews_given,
                   (SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id) as average_rating,
                   (SELECT COUNT(*) FROM reports WHERE reported_user_id = u.id) as reports_against
            FROM users u
            LEFT JOIN universities un ON u.university_id = un.id
            WHERE u.id = $1
        `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = {
            ...result.rows[0],
            total_items: parseInt(result.rows.total_items),
            sold_items: parseInt(result.rows.sold_items),
            total_roommate_posts: parseInt(result.rows.total_roommate_posts),
            total_messages: parseInt(result.rows.total_messages),
            reviews_received: parseInt(result.rows.reviews_received),
            reviews_given: parseInt(result.rows.reviews_given),
            reports_against: parseInt(result.rows.reports_against),
            average_rating: result.rows.average_rating ? parseFloat(result.rows.average_rating) : null,
            // Remove sensitive data
            password_hash: undefined
        };

        // Get recent items
        const itemsQuery = `
            SELECT id, title, price, status, created_at
            FROM items WHERE seller_id = $1
            ORDER BY created_at DESC LIMIT 5
        `;
        const itemsResult = await pool.query(itemsQuery, [id]);

        // Get recent reports about this user
        const reportsQuery = `
            SELECT r.*, reporter.first_name as reporter_name
            FROM reports r
            JOIN users reporter ON r.reporter_id = reporter.id
            WHERE r.reported_user_id = $1
            ORDER BY r.created_at DESC LIMIT 5
        `;
        const reportsResult = await pool.query(reportsQuery, [id]);

        res.json({
            success: true,
            data: {
                user,
                recent_items: itemsResult.rows,
                recent_reports: reportsResult.rows
            }
        });

    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user details'
        });
    }
};

// Update User Status
export const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, admin_notes } = req.body;

        const result = await pool.query(
            `UPDATE users 
             SET status = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING id, first_name, last_name, email, status`,
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Log admin action
        await pool.query(
            `INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
             VALUES ($1, 'user_status_change', 'user', $2, $3)`,
            [req.user.userId, id, JSON.stringify({ new_status: status, admin_notes })]
        );

        res.json({
            success: true,
            message: `User status updated to ${status}`,
            data: { user: result.rows[0] }
        });

    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user status'
        });
    }
};

// Get Reports
export const getReports = async (req, res) => {
    try {
        const { status, type, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT r.*, 
                   reporter.first_name as reporter_first_name,
                   reporter.last_name as reporter_last_name,
                   reported_user.first_name as reported_user_first_name,
                   reported_user.last_name as reported_user_last_name,
                   resolver.first_name as resolver_first_name,
                   resolver.last_name as resolver_last_name
            FROM reports r
            JOIN users reporter ON r.reporter_id = reporter.id
            LEFT JOIN users reported_user ON r.reported_user_id = reported_user.id
            LEFT JOIN users resolver ON r.resolved_by = resolver.id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 0;

        if (status && status !== 'all') {
            paramCount++;
            query += ` AND r.status = $${paramCount}`;
            params.push(status);
        }

        if (type && type !== 'all') {
            paramCount++;
            query += ` AND r.type = $${paramCount}`;
            params.push(type);
        }

        query += ` ORDER BY r.created_at DESC`;
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(parseInt(limit), offset);

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: { reports: result.rows }
        });

    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching reports'
        });
    }
};

// Update Report Status
export const updateReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, admin_notes } = req.body;

        const result = await pool.query(
            `UPDATE reports 
             SET status = $1, 
                 admin_notes = $2,
                 resolved_by = $3,
                 resolved_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [status, admin_notes, req.user.userId, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        // Log admin action
        await pool.query(
            `INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
             VALUES ($1, 'report_resolved', 'report', $2, $3)`,
            [req.user.userId, id, JSON.stringify({ new_status: status, admin_notes })]
        );

        res.json({
            success: true,
            message: 'Report updated successfully',
            data: { report: result.rows[0] }
        });

    } catch (error) {
        console.error('Error updating report:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating report'
        });
    }
};

// Get Universities
export const getUniversities = async (req, res) => {
    try {
        const query = `
            SELECT u.*, 
                   (SELECT COUNT(*) FROM users WHERE university_id = u.id) as user_count
            FROM universities u
            ORDER BY u.name ASC
        `;

        const result = await pool.query(query);

        const universities = result.rows.map(uni => ({
            ...uni,
            user_count: parseInt(uni.user_count)
        }));

        res.json({
            success: true,
            data: { universities }
        });

    } catch (error) {
        console.error('Error fetching universities:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching universities'
        });
    }
};

// Create University
export const createUniversity = async (req, res) => {
    try {
        const { name, domain, city, state, country = 'USA', latitude, longitude } = req.body;

        const result = await pool.query(
            `INSERT INTO universities (name, domain, city, state, country, latitude, longitude)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [name, domain, city, state, country, latitude, longitude]
        );

        res.status(201).json({
            success: true,
            message: 'University created successfully',
            data: { university: result.rows[0] }
        });

    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
            return res.status(400).json({
                success: false,
                message: 'University with this domain already exists'
            });
        }

        console.error('Error creating university:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating university'
        });
    }
};

// Create Category
export const createCategory = async (req, res) => {
    try {
        const { name, slug, description, parent_id, icon_url, sort_order = 0 } = req.body;

        const result = await pool.query(
            `INSERT INTO categories (name, slug, description, parent_id, icon_url, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [name, slug, description, parent_id || null, icon_url || null, sort_order]
        );

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: { category: result.rows[0] }
        });

    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'Category with this name or slug already exists'
            });
        }

        console.error('Error creating category:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating category'
        });
    }
};

// Get Analytics
export const getAnalytics = async (req, res) => {
    try {
        const { period = '30' } = req.query; // days

        const analyticsQuery = `
            SELECT 
                -- Daily user registrations
                (SELECT json_agg(daily_data ORDER BY date)
                 FROM (
                     SELECT DATE(created_at) as date, COUNT(*) as users
                     FROM users 
                     WHERE created_at >= NOW() - INTERVAL '${period} days'
                     GROUP BY DATE(created_at)
                 ) daily_data) as daily_registrations,
                
                -- Daily item creation
                (SELECT json_agg(daily_data ORDER BY date)
                 FROM (
                     SELECT DATE(created_at) as date, COUNT(*) as items
                     FROM items 
                     WHERE created_at >= NOW() - INTERVAL '${period} days'
                     GROUP BY DATE(created_at)
                 ) daily_data) as daily_items,
                
                -- Top categories
                (SELECT json_agg(cat_data ORDER BY item_count DESC)
                 FROM (
                     SELECT c.name, COUNT(i.id) as item_count
                     FROM categories c
                     LEFT JOIN items i ON c.id = i.category_id
                     WHERE c.parent_id IS NULL
                     GROUP BY c.id, c.name
                     LIMIT 10
                 ) cat_data) as top_categories,
                
                -- Top universities
                (SELECT json_agg(uni_data ORDER BY user_count DESC)
                 FROM (
                     SELECT u.name, COUNT(users.id) as user_count
                     FROM universities u
                     LEFT JOIN users ON u.id = users.university_id
                     GROUP BY u.id, u.name
                     HAVING COUNT(users.id) > 0
                     LIMIT 10
                 ) uni_data) as top_universities
        `;

        const result = await pool.query(analyticsQuery);

        res.json({
            success: true,
            data: {
                period: parseInt(period),
                analytics: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching analytics'
        });
    }
};

// Get Items (Admin)
export const getItems = async (req, res) => {
    try {
        const { status, page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT i.*, u.first_name, u.last_name, u.email,
                   c.name as category_name
            FROM items i
            JOIN users u ON i.seller_id = u.id
            LEFT JOIN categories c ON i.category_id = c.id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 0;

        if (status && status !== 'all') {
            paramCount++;
            query += ` AND i.status = $${paramCount}`;
            params.push(status);
        }

        query += ` ORDER BY i.created_at DESC`;
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
        console.error('Error fetching items:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching items'
        });
    }
};

// Update Item Status (Admin)
export const updateItemStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const result = await pool.query(
            `UPDATE items 
             SET status = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        // Log admin action
        await pool.query(
            `INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
             VALUES ($1, 'item_status_change', 'item', $2, $3)`,
            [req.user.userId, id, JSON.stringify({ new_status: status })]
        );

        res.json({
            success: true,
            message: `Item status updated to ${status}`,
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
