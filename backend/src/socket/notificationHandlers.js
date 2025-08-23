import { getIO } from './index.js';
import { pool } from '../config/database.js';

export const setupNotificationHandlers = () => {
    const io = getIO();

    io.on('connection', (socket) => {
        
        // Subscribe to notifications (automatically handled in main connection)
        socket.on('subscribe_notifications', () => {
            // User is automatically subscribed to their user room in main connection handler
            socket.emit('notification_subscription_confirmed', {
                message: 'Successfully subscribed to notifications',
                userId: socket.userId
            });
        });

        // Get unread notifications count
        socket.on('get_unread_notifications', async () => {
            try {
                const unreadResult = await pool.query(`
                    SELECT COUNT(*) as count
                    FROM notifications 
                    WHERE user_id = $1 AND read_at IS NULL
                `, [socket.userId]);

                const unreadMessages = await pool.query(`
                    SELECT COUNT(*) as count
                    FROM messages 
                    WHERE recipient_id = $1 AND read_at IS NULL
                `, [socket.userId]);

                socket.emit('unread_counts', {
                    notifications: parseInt(unreadResult.rows[0].count),
                    messages: parseInt(unreadMessages.rows.count)
                });

            } catch (error) {
                console.error('Error fetching unread notifications:', error);
                socket.emit('error', { message: 'Failed to fetch notifications' });
            }
        });

        // Get notification history
        socket.on('get_notifications', async (data) => {
            try {
                const { page = 1, limit = 20 } = data;
                const offset = (page - 1) * limit;

                const notificationsResult = await pool.query(`
                    SELECT id, type, title, message, data, read_at, created_at
                    FROM notifications 
                    WHERE user_id = $1
                    ORDER BY created_at DESC
                    LIMIT $2 OFFSET $3
                `, [socket.userId, limit, offset]);

                socket.emit('notifications_history', {
                    notifications: notificationsResult.rows,
                    page,
                    hasMore: notificationsResult.rows.length === limit
                });

            } catch (error) {
                console.error('Error fetching notifications:', error);
                socket.emit('error', { message: 'Failed to fetch notifications' });
            }
        });

        // Mark notification as read
        socket.on('mark_notification_read', async (data) => {
            try {
                const { notificationId } = data;

                await pool.query(`
                    UPDATE notifications 
                    SET read_at = CURRENT_TIMESTAMP 
                    WHERE id = $1 AND user_id = $2
                `, [notificationId, socket.userId]);

                socket.emit('notification_marked_read', { notificationId });

            } catch (error) {
                console.error('Error marking notification as read:', error);
                socket.emit('error', { message: 'Failed to mark notification as read' });
            }
        });

        // Mark all notifications as read
        socket.on('mark_all_notifications_read', async () => {
            try {
                await pool.query(`
                    UPDATE notifications 
                    SET read_at = CURRENT_TIMESTAMP 
                    WHERE user_id = $1 AND read_at IS NULL
                `, [socket.userId]);

                socket.emit('all_notifications_marked_read');

            } catch (error) {
                console.error('Error marking all notifications as read:', error);
                socket.emit('error', { message: 'Failed to mark all notifications as read' });
            }
        });
    });
};

// Helper functions to send different types of notifications
export const sendNotification = async (userId, notificationData) => {
    const io = getIO();
    
    try {
        // Save notification to database
        const result = await pool.query(`
            INSERT INTO notifications (user_id, type, title, message, data)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, created_at
        `, [
            userId, 
            notificationData.type, 
            notificationData.title, 
            notificationData.message, 
            JSON.stringify(notificationData.data || {})
        ]);

        const notification = {
            id: result.rows.id,
            type: notificationData.type,
            title: notificationData.title,
            message: notificationData.message,
            data: notificationData.data || {},
            createdAt: result.rows.created_at,
            readAt: null
        };

        // Send via socket
        io.to(userId.toString()).emit('notification', notification);
        
        console.log(`🔔 Notification sent to user ${userId}: ${notificationData.title}`);
        return notification;

    } catch (error) {
        console.error('Error sending notification:', error);
        throw error;
    }
};

// Specific notification types
export const sendItemSoldNotification = (sellerId, itemTitle, buyerName) => {
    return sendNotification(sellerId, {
        type: 'item_sold',
        title: 'Item Sold! 🎉',
        message: `Your item "${itemTitle}" has been sold to ${buyerName}`,
        data: { itemTitle, buyerName }
    });
};

export const sendItemSavedNotification = (sellerId, itemTitle, saverName) => {
    return sendNotification(sellerId, {
        type: 'item_saved',
        title: 'Someone saved your item! ❤️',
        message: `${saverName} saved your item "${itemTitle}"`,
        data: { itemTitle, saverName }
    });
};

export const sendRoommateMatchNotification = (userId, matchName, matchDetails) => {
    return sendNotification(userId, {
        type: 'roommate_match',
        title: 'New Roommate Match! 🏠',
        message: `You have a potential match with ${matchName}`,
        data: { matchName, ...matchDetails }
    });
};

export const sendReviewNotification = (userId, reviewerName, rating, itemTitle) => {
    return sendNotification(userId, {
        type: 'review_received',
        title: 'New Review Received ⭐',
        message: `${reviewerName} left you a ${rating}-star review for "${itemTitle}"`,
        data: { reviewerName, rating, itemTitle }
    });
};

export const sendSystemNotification = (userId, title, message, data = {}) => {
    return sendNotification(userId, {
        type: 'system',
        title,
        message,
        data
    });
};

// Broadcast notification to all connected users
export const broadcastNotification = (notificationData) => {
    const io = getIO();
    io.emit('broadcast_notification', notificationData);
};

// Send notification to users in a university
export const sendUniversityNotification = async (universityId, notificationData) => {
    const io = getIO();
    
    try {
        const usersResult = await pool.query(
            'SELECT id FROM users WHERE university_id = $1 AND status = $2',
            [universityId, 'active']
        );

        for (const user of usersResult.rows) {
            await sendNotification(user.id, notificationData);
        }

    } catch (error) {
        console.error('Error sending university notification:', error);
    }
};

export default setupNotificationHandlers;
