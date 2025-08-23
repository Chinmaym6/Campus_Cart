// notifications.js - Routes for notification management
import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// Get all notifications for a user
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const unreadOnly = req.query.unread === 'true';
        
        let query = `
            SELECT 
                n.*,
                CASE 
                    WHEN n.type = 'message' THEN sender.first_name || ' ' || sender.last_name
                    WHEN n.type = 'item_sold' THEN buyer.first_name || ' ' || buyer.last_name
                    WHEN n.type = 'item_interest' THEN interested.first_name || ' ' || interested.last_name
                    WHEN n.type = 'roommate_match' THEN matcher.first_name || ' ' || matcher.last_name
                    ELSE NULL
                END as related_user_name,
                i.title as item_title
            FROM notifications n
            LEFT JOIN users sender ON n.related_user_id = sender.id AND n.type = 'message'
            LEFT JOIN users buyer ON n.related_user_id = buyer.id AND n.type = 'item_sold'
            LEFT JOIN users interested ON n.related_user_id = interested.id AND n.type = 'item_interest'
            LEFT JOIN users matcher ON n.related_user_id = matcher.id AND n.type = 'roommate_match'
            LEFT JOIN items i ON n.item_id = i.id
            WHERE n.user_id = $1
        `;
        
        const queryParams = [userId];
        
        if (unreadOnly) {
            query += ' AND n.is_read = false';
        }
        
        query += ' ORDER BY n.created_at DESC LIMIT $2 OFFSET $3';
        queryParams.push(limit, offset);
        
        const result = await pool.query(query, queryParams);
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM notifications WHERE user_id = $1';
        const countParams = [userId];
        
        if (unreadOnly) {
            countQuery += ' AND is_read = false';
        }
        
        const countResult = await pool.query(countQuery, countParams);
        const totalNotifications = parseInt(countResult.rows[0].count);
        
        res.json({
            success: true,
            notifications: result.rows,
            pagination: {
                page,
                limit,
                total: totalNotifications,
                pages: Math.ceil(totalNotifications / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications'
        });
    }
});

// Get unread notification count
router.get('/unread-count', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const query = 'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false';
        const result = await pool.query(query, [userId]);
        
        res.json({
            success: true,
            count: parseInt(result.rows[0].count)
        });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch unread count'
        });
    }
});

// Mark all notifications as read
router.patch('/mark-all-read', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const query = `
            UPDATE notifications 
            SET is_read = true, read_at = NOW() 
            WHERE user_id = $1 AND is_read = false
            RETURNING COUNT(*)
        `;
        
        const result = await pool.query(query, [userId]);
        
        res.json({
            success: true,
            message: 'All notifications marked as read',
            updatedCount: result.rowCount
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read'
        });
    }
});

// Delete all read notifications
router.delete('/clear-read', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const query = 'DELETE FROM notifications WHERE user_id = $1 AND is_read = true RETURNING COUNT(*)';
        const result = await pool.query(query, [userId]);
        
        res.json({
            success: true,
            message: 'Read notifications cleared successfully',
            deletedCount: result.rowCount
        });
    } catch (error) {
        console.error('Error clearing read notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear read notifications'
        });
    }
});

// Create notification (internal use - typically called by other parts of the app)
router.post('/', async (req, res) => {
    try {
        const { userId, type, title, message, relatedUserId, itemId, data } = req.body;
        
        if (!userId || !type || !title || !message) {
            return res.status(400).json({
                success: false,
                message: 'User ID, type, title, and message are required'
            });
        }
        
        const query = `
            INSERT INTO notifications (
                user_id, type, title, message, related_user_id, 
                item_id, data, is_read, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            userId, type, title, message, relatedUserId || null, 
            itemId || null, data ? JSON.stringify(data) : null
        ]);
        
        res.status(201).json({
            success: true,
            message: 'Notification created successfully',
            notification: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create notification'
        });
    }
});

// Get notification preferences
router.get('/preferences', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const query = `
            SELECT 
                email_notifications,
                push_notifications,
                message_notifications,
                item_notifications,
                roommate_notifications
            FROM users 
            WHERE id = $1
        `;
        
        const result = await pool.query(query, [userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            preferences: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching notification preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notification preferences'
        });
    }
});

// Update notification preferences
router.patch('/preferences', async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            email_notifications,
            push_notifications,
            message_notifications,
            item_notifications,
            roommate_notifications
        } = req.body;
        
        const query = `
            UPDATE users 
            SET 
                email_notifications = COALESCE($1, email_notifications),
                push_notifications = COALESCE($2, push_notifications),
                message_notifications = COALESCE($3, message_notifications),
                item_notifications = COALESCE($4, item_notifications),
                roommate_notifications = COALESCE($5, roommate_notifications),
                updated_at = NOW()
            WHERE id = $6
            RETURNING 
                email_notifications,
                push_notifications,
                message_notifications,
                item_notifications,
                roommate_notifications
        `;
        
        const result = await pool.query(query, [
            email_notifications,
            push_notifications,
            message_notifications,
            item_notifications,
            roommate_notifications,
            userId
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Notification preferences updated successfully',
            preferences: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update notification preferences'
        });
    }
});

// Mark notification as read
router.patch('/:id/read', async (req, res) => {
    try {
        const notificationId = req.params.id;
        const userId = req.user.id;
        
        const query = `
            UPDATE notifications 
            SET is_read = true, read_at = NOW() 
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;
        
        const result = await pool.query(query, [notificationId, userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Notification marked as read',
            notification: result.rows[0]
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read'
        });
    }
});

// Delete notification
router.delete('/:id', async (req, res) => {
    try {
        const notificationId = req.params.id;
        const userId = req.user.id;
        
        const query = 'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *';
        const result = await pool.query(query, [notificationId, userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification'
        });
    }
});

export default router;