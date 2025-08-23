import { pool, withTransaction } from '../config/database.js';
import { deleteFromS3 } from '../config/aws.js';

// Get User Profile (Public)
export const getUserProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const viewerId = req.user?.userId;

        const query = `
            SELECT u.id, u.first_name, u.last_name, u.profile_picture_url, u.bio,
                   u.university_id, un.name as university_name, u.graduation_year,
                   u.location_address, u.created_at,
                   CASE 
                       WHEN u.id = $2 OR u.profile_visibility = 'public' THEN true
                       WHEN u.profile_visibility = 'students_only' AND $2 IS NOT NULL THEN true
                       ELSE false
                   END as can_view_full_profile,
                   (SELECT COUNT(*) FROM items WHERE seller_id = u.id AND status = 'available') as active_listings,
                   (SELECT COUNT(*) FROM items WHERE seller_id = u.id AND status = 'sold') as sold_items,
                   (SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id) as average_rating,
                   (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as total_reviews,
                   (SELECT COUNT(*) FROM roommate_posts WHERE user_id = u.id AND status = 'looking') as active_roommate_posts
            FROM users u
            LEFT JOIN universities un ON u.university_id = un.id
            WHERE u.id = $1 AND u.status = 'active'
        `;

        const result = await pool.query(query, [id, viewerId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found or profile not accessible'
            });
        }

        const user = {
            ...result.rows[0],
            active_listings: parseInt(result.rows.active_listings),
            sold_items: parseInt(result.rows.sold_items),
            total_reviews: parseInt(result.rows.total_reviews),
            active_roommate_posts: parseInt(result.rows.active_roommate_posts),
            average_rating: result.rows.average_rating ? parseFloat(result.rows.average_rating) : null
        };

        // Hide sensitive info if viewer can't see full profile
        if (!user.can_view_full_profile) {
            delete user.bio;
            delete user.location_address;
            delete user.graduation_year;
        }

        res.json({
            success: true,
            data: { user }
        });

    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user profile'
        });
    }
};

// Update User Profile
export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const {
            first_name, last_name, bio, phone, student_id,
            graduation_year, location_address, latitude, longitude
        } = req.body;

        // Process profile picture if uploaded
        let profile_picture_url = null;
        if (req.processedFiles && req.processedFiles.length > 0) {
            profile_picture_url = req.processedFiles[0].original.location;
            
            // Delete old profile picture
            const oldPictureResult = await pool.query(
                'SELECT profile_picture_url FROM users WHERE id = $1',
                [userId]
            );
            
            if (oldPictureResult.rows[0]?.profile_picture_url) {
                // Extract key from old URL and delete from S3
                const oldUrl = oldPictureResult.rows.profile_picture_url;
                const oldKey = oldUrl.split('/').pop();
                deleteFromS3(oldKey).catch(console.error);
            }
        }

        const updateResult = await pool.query(
            `UPDATE users 
             SET first_name = COALESCE($1, first_name),
                 last_name = COALESCE($2, last_name),
                 bio = COALESCE($3, bio),
                 phone = COALESCE($4, phone),
                 student_id = COALESCE($5, student_id),
                 graduation_year = COALESCE($6, graduation_year),
                 location_address = COALESCE($7, location_address),
                 latitude = COALESCE($8, latitude),
                 longitude = COALESCE($9, longitude),
                 profile_picture_url = COALESCE($10, profile_picture_url),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $11
             RETURNING id, first_name, last_name, bio, phone, student_id, 
                       graduation_year, location_address, profile_picture_url`,
            [
                first_name, last_name, bio, phone, student_id, graduation_year,
                location_address, latitude ? parseFloat(latitude) : null,
                longitude ? parseFloat(longitude) : null, profile_picture_url, userId
            ]
        );

        if (updateResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            message: "Profile updated successfully! ✨",
            data: { user: updateResult.rows[0] }
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to update profile"
        });
    }
};

// Update Privacy Settings
export const updatePrivacySettings = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { show_phone, show_email, profile_visibility } = req.body;

        const result = await pool.query(
            `UPDATE users 
             SET privacy_settings = jsonb_build_object(
                 'show_phone', COALESCE($1, (privacy_settings->>'show_phone')::boolean),
                 'show_email', COALESCE($2, (privacy_settings->>'show_email')::boolean),
                 'profile_visibility', COALESCE($3, privacy_settings->>'profile_visibility')
             ),
             updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING privacy_settings`,
            [show_phone, show_email, profile_visibility, userId]
        );

        res.json({
            success: true,
            message: 'Privacy settings updated successfully! 🔒',
            data: { privacy_settings: result.rows[0].privacy_settings }
        });

    } catch (error) {
        console.error('Error updating privacy settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update privacy settings'
        });
    }
};

// Update Notification Preferences
export const updateNotificationPreferences = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { email_notifications, push_notifications, marketing_emails } = req.body;

        const result = await pool.query(
            `UPDATE users 
             SET notification_preferences = jsonb_build_object(
                 'email_notifications', COALESCE($1, (notification_preferences->>'email_notifications')::boolean),
                 'push_notifications', COALESCE($2, (notification_preferences->>'push_notifications')::boolean),
                 'marketing_emails', COALESCE($3, (notification_preferences->>'marketing_emails')::boolean)
             ),
             updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING notification_preferences`,
            [email_notifications, push_notifications, marketing_emails, userId]
        );

        res.json({
            success: true,
            message: 'Notification preferences updated successfully! 🔔',
            data: { notification_preferences: result.rows[0].notification_preferences }
        });

    } catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update notification preferences'
        });
    }
};

// Upload Verification Documents
export const uploadVerificationDocuments = async (req, res) => {
    try {
        const userId = req.user.userId;

        if (!req.processedFiles || req.processedFiles.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No documents uploaded'
            });
        }

        const documents = req.processedFiles.map(file => ({
            type: req.body.document_type || 'student_id',
            url: file.original.location,
            key: file.original.key,
            status: 'pending'
        }));

        await pool.query(
            `UPDATE users 
             SET verification_documents = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [JSON.stringify(documents), userId]
        );

        res.json({
            success: true,
            message: 'Verification documents uploaded successfully! Documents are under review. ⏳',
            data: { documents }
        });

    } catch (error) {
        console.error('Error uploading verification documents:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload verification documents'
        });
    }
};

// Get Dashboard Statistics
export const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.userId;

        const statsQuery = `
            SELECT 
                -- Item stats
                (SELECT COUNT(*) FROM items WHERE seller_id = $1 AND status = 'available') as active_listings,
                (SELECT COUNT(*) FROM items WHERE seller_id = $1 AND status = 'sold') as sold_items,
                (SELECT COUNT(*) FROM items WHERE seller_id = $1 AND status = 'reserved') as reserved_items,
                (SELECT COALESCE(SUM(view_count), 0) FROM items WHERE seller_id = $1) as total_item_views,
                (SELECT COUNT(*) FROM saved_items si JOIN items i ON si.item_id = i.id WHERE i.seller_id = $1) as total_saves,
                
                -- Roommate stats
                (SELECT COUNT(*) FROM roommate_posts WHERE user_id = $1 AND status = 'looking') as active_roommate_posts,
                (SELECT COALESCE(SUM(view_count), 0) FROM roommate_posts WHERE user_id = $1) as total_roommate_views,
                
                -- Message stats
                (SELECT COUNT(*) FROM messages WHERE sender_id = $1 OR recipient_id = $1) as total_messages,
                (SELECT COUNT(*) FROM messages WHERE recipient_id = $1 AND read_at IS NULL) as unread_messages,
                
                -- Review stats
                (SELECT COUNT(*) FROM reviews WHERE reviewee_id = $1) as reviews_received,
                (SELECT AVG(rating) FROM reviews WHERE reviewee_id = $1) as average_rating,
                (SELECT COUNT(*) FROM reviews WHERE reviewer_id = $1) as reviews_given,
                
                -- Saved items
                (SELECT COUNT(*) FROM saved_items WHERE user_id = $1) as saved_items_count,
                
                -- Account info
                (SELECT created_at FROM users WHERE id = $1) as member_since
        `;

        const result = await pool.query(statsQuery, [userId]);
        
        const stats = {
            ...result.rows[0],
            active_listings: parseInt(result.rows.active_listings),
            sold_items: parseInt(result.rows.sold_items),
            reserved_items: parseInt(result.rows.reserved_items),
            total_item_views: parseInt(result.rows.total_item_views),
            total_saves: parseInt(result.rows.total_saves),
            active_roommate_posts: parseInt(result.rows.active_roommate_posts),
            total_roommate_views: parseInt(result.rows.total_roommate_views),
            total_messages: parseInt(result.rows.total_messages),
            unread_messages: parseInt(result.rows.unread_messages),
            reviews_received: parseInt(result.rows.reviews_received),
            reviews_given: parseInt(result.rows.reviews_given),
            saved_items_count: parseInt(result.rows.saved_items_count),
            average_rating: result.rows.average_rating ? parseFloat(result.rows.average_rating) : null
        };

        // Get recent activity
        const recentActivityQuery = `
            SELECT activity_type, activity_data, created_at
            FROM (
                SELECT 'item_created' as activity_type, 
                       json_build_object('title', title, 'id', id) as activity_data,
                       created_at
                FROM items WHERE seller_id = $1 AND created_at > NOW() - INTERVAL '30 days'
                UNION ALL
                SELECT 'roommate_post_created' as activity_type,
                       json_build_object('title', title, 'id', id) as activity_data,
                       created_at  
                FROM roommate_posts WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
                UNION ALL
                SELECT 'review_received' as activity_type,
                       json_build_object('rating', rating, 'comment', comment) as activity_data,
                       created_at
                FROM reviews WHERE reviewee_id = $1 AND created_at > NOW() - INTERVAL '30 days'
            ) activities
            ORDER BY created_at DESC
            LIMIT 10
        `;

        const activityResult = await pool.query(recentActivityQuery, [userId]);

        res.json({
            success: true,
            data: {
                stats,
                recent_activity: activityResult.rows
            }
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics'
        });
    }
};

// Search Users
export const searchUsers = async (req, res) => {
    try {
        const { 
            q: search, 
            university_id, 
            graduation_year, 
            page = 1, 
            limit = 20 
        } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT u.id, u.first_name, u.last_name, u.profile_picture_url,
                   u.bio, u.university_id, un.name as university_name,
                   u.graduation_year, u.created_at,
                   (SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id) as average_rating,
                   (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as review_count,
                   (SELECT COUNT(*) FROM items WHERE seller_id = u.id AND status = 'available') as active_listings
            FROM users u
            LEFT JOIN universities un ON u.university_id = un.id
            WHERE u.status = 'active' AND u.email_verified = true
            AND (u.profile_visibility = 'public' OR u.profile_visibility = 'students_only')
        `;
        
        const params = [];
        let paramCount = 0;

        // Search filter
        if (search) {
            paramCount++;
            query += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.bio ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        // University filter
        if (university_id) {
            paramCount++;
            query += ` AND u.university_id = $${paramCount}`;
            params.push(university_id);
        }

        // Graduation year filter
        if (graduation_year) {
            paramCount++;
            query += ` AND u.graduation_year = $${paramCount}`;
            params.push(parseInt(graduation_year));
        }

        query += ' ORDER BY u.created_at DESC';
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(parseInt(limit), offset);

        const result = await pool.query(query, params);

        const users = result.rows.map(user => ({
            ...user,
            average_rating: user.average_rating ? parseFloat(user.average_rating) : null,
            review_count: parseInt(user.review_count),
            active_listings: parseInt(user.active_listings)
        }));

        res.json({
            success: true,
            data: { users }
        });

    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching users'
        });
    }
};

// Get User Statistics (Public)
export const getUserStats = async (req, res) => {
    try {
        const { id } = req.params;

        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM items WHERE seller_id = $1 AND status = 'available') as active_listings,
                (SELECT COUNT(*) FROM items WHERE seller_id = $1 AND status = 'sold') as sold_items,
                (SELECT COUNT(*) FROM roommate_posts WHERE user_id = $1 AND status = 'looking') as active_roommate_posts,
                (SELECT COUNT(*) FROM reviews WHERE reviewee_id = $1) as total_reviews,
                (SELECT AVG(rating) FROM reviews WHERE reviewee_id = $1) as average_rating,
                (SELECT created_at FROM users WHERE id = $1) as member_since
        `;

        const result = await pool.query(statsQuery, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const stats = {
            ...result.rows[0],
            active_listings: parseInt(result.rows.active_listings),
            sold_items: parseInt(result.rows.sold_items),
            active_roommate_posts: parseInt(result.rows.active_roommate_posts),
            total_reviews: parseInt(result.rows.total_reviews),
            average_rating: result.rows.average_rating ? parseFloat(result.rows.average_rating) : null
        };

        res.json({
            success: true,
            data: { stats }
        });

    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user statistics'
        });
    }
};
