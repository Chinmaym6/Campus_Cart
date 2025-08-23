import { getIO } from '../socket/index.js';
import { pool } from '../config/database.js';
import { sendItemSoldNotification, sendEmail } from './emailService.js';

// Save notification to database
const saveNotification = async (userId, notification) => {
    try {
        const result = await pool.query(`
            INSERT INTO notifications (user_id, type, title, message, data, read_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [
            userId,
            notification.type,
            notification.title,
            notification.message,
            JSON.stringify(notification.data || {}),
            null
        ]);

        return result.rows[0];
    } catch (error) {
        console.error('❌ Error saving notification:', error);
        throw error;
    }
};

// Send notification via socket and save to database
export const sendNotification = async (userId, notification) => {
    try {
        // Save to database
        const savedNotification = await saveNotification(userId, notification);

        // Send via socket if user is online
        const io = getIO();
        io.to(userId.toString()).emit('notification', savedNotification);

        console.log(`🔔 Notification sent to user ${userId}: ${notification.title}`);
        return savedNotification;

    } catch (error) {
        console.error('❌ Error sending notification:', error);
        throw error;
    }
};

// Send notification to multiple users
export const sendBulkNotification = async (userIds, notification) => {
    const notifications = [];
    
    for (const userId of userIds) {
        try {
            const sent = await sendNotification(userId, notification);
            notifications.push(sent);
        } catch (error) {
            console.error(`❌ Failed to send notification to user ${userId}:`, error);
        }
    }

    return notifications;
};

// Specific notification types

// Item sold notification
export const sendItemSoldNotificationService = async (sellerId, buyerId, item) => {
    try {
        // Get buyer info
        const buyerResult = await pool.query(`
            SELECT first_name, last_name, email FROM users WHERE id = $1
        `, [buyerId]);

        if (buyerResult.rows.length === 0) {
            throw new Error('Buyer not found');
        }

        const buyer = buyerResult.rows[0];
        const buyerName = `${buyer.first_name} ${buyer.last_name}`;

        // Send in-app notification
        await sendNotification(sellerId, {
            type: 'item_sold',
            title: 'Item Sold! 🎉',
            message: `Your item "${item.title}" has been sold to ${buyerName}`,
            data: {
                itemId: item.id,
                itemTitle: item.title,
                buyerId: buyerId,
                buyerName: buyerName,
                price: item.price
            }
        });

        // Send email notification (optional, can be disabled in user preferences)
        const sellerResult = await pool.query(`
            SELECT first_name, email FROM users WHERE id = $1
        `, [sellerId]);

        if (sellerResult.rows.length > 0) {
            const seller = sellerResult.rows[0];
            await sendItemSoldNotification(seller, buyer, item);
        }

        return true;

    } catch (error) {
        console.error('❌ Error sending item sold notification:', error);
        throw error;
    }
};

// Item saved notification
export const sendItemSavedNotification = async (sellerId, saverId, item) => {
    try {
        const saverResult = await pool.query(`
            SELECT first_name, last_name FROM users WHERE id = $1
        `, [saverId]);

        if (saverResult.rows.length === 0) return false;

        const saver = saverResult.rows[0];
        const saverName = `${saver.first_name} ${saver.last_name}`;

        await sendNotification(sellerId, {
            type: 'item_saved',
            title: 'Someone saved your item! ❤️',
            message: `${saverName} saved your item "${item.title}"`,
            data: {
                itemId: item.id,
                itemTitle: item.title,
                saverId: saverId,
                saverName: saverName
            }
        });

        return true;

    } catch (error) {
        console.error('❌ Error sending item saved notification:', error);
        return false;
    }
};

// New message notification
export const sendNewMessageNotification = async (recipientId, senderId, message) => {
    try {
        const senderResult = await pool.query(`
            SELECT first_name, last_name FROM users WHERE id = $1
        `, [senderId]);

        if (senderResult.rows.length === 0) return false;

        const sender = senderResult.rows[0];
        const senderName = `${sender.first_name} ${sender.last_name}`;

        await sendNotification(recipientId, {
            type: 'new_message',
            title: `New message from ${senderName}`,
            message: message.content.length > 100 
                ? `${message.content.substring(0, 100)}...` 
                : message.content,
            data: {
                messageId: message.id,
                senderId: senderId,
                senderName: senderName,
                conversationId: message.conversationId || null
            }
        });

        return true;

    } catch (error) {
        console.error('❌ Error sending message notification:', error);
        return false;
    }
};

// Roommate match notification
export const sendRoommateMatchNotification = async (userId, matchId, compatibilityScore) => {
    try {
        const matchResult = await pool.query(`
            SELECT u.first_name, u.last_name, rp.title 
            FROM users u
            JOIN roommate_posts rp ON u.id = rp.user_id
            WHERE u.id = $1
        `, [matchId]);

        if (matchResult.rows.length === 0) return false;

        const match = matchResult.rows[0];
        const matchName = `${match.first_name} ${match.last_name}`;

        await sendNotification(userId, {
            type: 'roommate_match',
            title: 'New Roommate Match! 🏠',
            message: `You have a ${compatibilityScore}% compatibility match with ${matchName}`,
            data: {
                matchId: matchId,
                matchName: matchName,
                compatibilityScore: compatibilityScore,
                postTitle: match.title
            }
        });

        return true;

    } catch (error) {
        console.error('❌ Error sending roommate match notification:', error);
        return false;
    }
};

// Review notification
export const sendReviewNotification = async (revieweeId, reviewerId, review) => {
    try {
        const reviewerResult = await pool.query(`
            SELECT first_name, last_name FROM users WHERE id = $1
        `, [reviewerId]);

        if (reviewerResult.rows.length === 0) return false;

        const reviewer = reviewerResult.rows[0];
        const reviewerName = `${reviewer.first_name} ${reviewer.last_name}`;

        const stars = '⭐'.repeat(review.rating);

        await sendNotification(revieweeId, {
            type: 'new_review',
            title: 'New Review Received ⭐',
            message: `${reviewerName} left you a ${review.rating}-star review: "${review.comment || 'No comment'}"`,
            data: {
                reviewId: review.id,
                reviewerId: reviewerId,
                reviewerName: reviewerName,
                rating: review.rating,
                comment: review.comment
            }
        });

        return true;

    } catch (error) {
        console.error('❌ Error sending review notification:', error);
        return false;
    }
};

// System notifications
export const sendSystemNotification = async (userId, title, message, data = {}) => {
    return await sendNotification(userId, {
        type: 'system',
        title,
        message,
        data
    });
};

// Broadcast to all users
export const broadcastNotification = async (notification) => {
    try {
        const io = getIO();
        io.emit('broadcast_notification', notification);
        
        console.log(`📢 Broadcast notification sent: ${notification.title}`);
        return true;

    } catch (error) {
        console.error('❌ Error broadcasting notification:', error);
        return false;
    }
};

// University-wide notifications
export const sendUniversityNotification = async (universityId, notification) => {
    try {
        const usersResult = await pool.query(`
            SELECT id FROM users 
            WHERE university_id = $1 AND status = 'active'
        `, [universityId]);

        const userIds = usersResult.rows.map(user => user.id);
        
        if (userIds.length === 0) return [];

        return await sendBulkNotification(userIds, notification);

    } catch (error) {
        console.error('❌ Error sending university notification:', error);
        return [];
    }
};

// Get user's notifications with pagination
export const getUserNotifications = async (userId, page = 1, limit = 20) => {
    try {
        const offset = (page - 1) * limit;

        const result = await pool.query(`
            SELECT * FROM notifications 
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);

        const countResult = await pool.query(`
            SELECT COUNT(*) as total FROM notifications WHERE user_id = $1
        `, [userId]);

        return {
            notifications: result.rows,
            pagination: {
                page,
                limit,
                total: parseInt(countResult.rows[0].total),
                pages: Math.ceil(parseInt(countResult.rows.total) / limit)
            }
        };

    } catch (error) {
        console.error('❌ Error getting user notifications:', error);
        throw error;
    }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId, userId) => {
    try {
        const result = await pool.query(`
            UPDATE notifications 
            SET read_at = CURRENT_TIMESTAMP 
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `, [notificationId, userId]);

        return result.rows[0] || null;

    } catch (error) {
        console.error('❌ Error marking notification as read:', error);
        throw error;
    }
};

export default {
    sendNotification,
    sendBulkNotification,
    sendItemSoldNotificationService,
    sendItemSavedNotification,
    sendNewMessageNotification,
    sendRoommateMatchNotification,
    sendReviewNotification,
    sendSystemNotification,
    broadcastNotification,
    sendUniversityNotification,
    getUserNotifications,
    markNotificationAsRead
};
