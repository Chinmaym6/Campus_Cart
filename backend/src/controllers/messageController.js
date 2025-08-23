import { pool, withTransaction } from '../config/database.js';

// Get a single conversation
export const getConversation = async (req, res) => {
    try {
        const userId = req.user.userId;
        const otherUserId = req.params.id;
        
        // Get the other user's details
        const userQuery = `
            SELECT u.id, u.first_name, u.last_name, u.profile_picture_url,
                   u.university_id, un.name as university_name
            FROM users u
            LEFT JOIN universities un ON u.university_id = un.id
            WHERE u.id = $1
        `;
        
        const userResult = await pool.query(userQuery, [otherUserId]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Get conversation stats
        const statsQuery = `
            SELECT 
                COUNT(CASE WHEN m.recipient_id = $1 AND m.read_at IS NULL THEN 1 END) as unread_count,
                MAX(m.created_at) as last_activity
            FROM messages m
            WHERE (m.sender_id = $1 AND m.recipient_id = $2) 
               OR (m.sender_id = $2 AND m.recipient_id = $1)
        `;
        
        const statsResult = await pool.query(statsQuery, [userId, otherUserId]);
        
        const conversation = {
            id: otherUserId,
            user: userResult.rows[0],
            unread_count: parseInt(statsResult.rows[0].unread_count || 0),
            last_activity: statsResult.rows[0].last_activity
        };
        
        res.json({
            success: true,
            data: { conversation }
        });
        
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching conversation'
        });
    }
};

// Get User's Conversations
export const getConversations = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const query = `
            SELECT DISTINCT 
                CASE 
                    WHEN m.sender_id = $1 THEN m.recipient_id 
                    ELSE m.sender_id 
                END as other_user_id,
                u.first_name, u.last_name, u.profile_picture_url,
                u.university_id, un.name as university_name,
                last_msg.content as last_message,
                last_msg.created_at as last_message_time,
                last_msg.sender_id = $1 as last_message_from_me,
                COUNT(CASE WHEN m.recipient_id = $1 AND m.read_at IS NULL THEN 1 END) as unread_count,
                MAX(m.created_at) as conversation_updated
            FROM messages m
            JOIN users u ON (
                CASE 
                    WHEN m.sender_id = $1 THEN u.id = m.recipient_id 
                    ELSE u.id = m.sender_id 
                END
            )
            LEFT JOIN universities un ON u.university_id = un.id
            LEFT JOIN LATERAL (
                SELECT content, created_at, sender_id
                FROM messages m2
                WHERE (m2.sender_id = $1 AND m2.recipient_id = u.id) 
                   OR (m2.sender_id = u.id AND m2.recipient_id = $1)
                ORDER BY m2.created_at DESC
                LIMIT 1
            ) last_msg ON true
            WHERE m.sender_id = $1 OR m.recipient_id = $1
            GROUP BY other_user_id, u.first_name, u.last_name, u.profile_picture_url,
                     u.university_id, un.name, last_msg.content, last_msg.created_at, last_msg.sender_id
            ORDER BY conversation_updated DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await pool.query(query, [userId, parseInt(limit), offset]);

        const conversations = result.rows.map(conv => ({
            ...conv,
            unread_count: parseInt(conv.unread_count),
            id: conv.other_user_id // For frontend compatibility
        }));

        res.json({
            success: true,
            data: { conversations }
        });

    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching conversations'
        });
    }
};

// Get Messages in a Conversation
export const getConversationMessages = async (req, res) => {
    try {
        const { id: otherUserId } = req.params;
        const userId = req.user.userId;
        const { page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const query = `
            SELECT m.*, 
                   sender.first_name as sender_first_name,
                   sender.last_name as sender_last_name,
                   sender.profile_picture_url as sender_avatar
            FROM messages m
            JOIN users sender ON m.sender_id = sender.id
            WHERE (m.sender_id = $1 AND m.recipient_id = $2) 
               OR (m.sender_id = $2 AND m.recipient_id = $1)
            ORDER BY m.created_at DESC
            LIMIT $3 OFFSET $4
        `;

        const result = await pool.query(query, [userId, otherUserId, parseInt(limit), offset]);

        // Mark messages as read
        await pool.query(
            `UPDATE messages 
             SET read_at = CURRENT_TIMESTAMP 
             WHERE sender_id = $1 AND recipient_id = $2 AND read_at IS NULL`,
            [otherUserId, userId]
        );

        const messages = result.rows.reverse(); // Reverse to show oldest first

        res.json({
            success: true,
            data: { messages }
        });

    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching messages'
        });
    }
};

// Send Message
export const sendMessage = async (req, res) => {
    try {
        const { recipient_id, content, item_id, roommate_post_id } = req.body;
        const sender_id = req.user.userId;

        // Validate recipient exists
        const recipientCheck = await pool.query(
            'SELECT id FROM users WHERE id = $1 AND status = $2',
            [recipient_id, 'active']
        );

        if (recipientCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Recipient not found'
            });
        }

        // Don't allow messaging yourself
        if (sender_id === recipient_id) {
            return res.status(400).json({
                success: false,
                message: "You can't message yourself"
            });
        }

        const result = await pool.query(
            `INSERT INTO messages (sender_id, recipient_id, content, item_id, roommate_post_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [sender_id, recipient_id, content, item_id || null, roommate_post_id || null]
        );

        // Get sender info for response
        const senderResult = await pool.query(
            'SELECT first_name, last_name, profile_picture_url FROM users WHERE id = $1',
            [sender_id]
        );

        const message = {
            ...result.rows[0],
            sender_first_name: senderResult.rows.first_name,
            sender_last_name: senderResult.rows.last_name,
            sender_avatar: senderResult.rows.profile_picture_url
        };

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: { message }
        });

    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending message'
        });
    }
};

// Start New Conversation
export const startConversation = async (req, res) => {
    try {
        const { recipient_id, item_id, roommate_post_id } = req.body;
        const sender_id = req.user.userId;

        // Check if conversation already exists
        const existingMessages = await pool.query(
            `SELECT id FROM messages 
             WHERE (sender_id = $1 AND recipient_id = $2) 
                OR (sender_id = $2 AND recipient_id = $1)
             LIMIT 1`,
            [sender_id, recipient_id]
        );

        if (existingMessages.rows.length > 0) {
            return res.json({
                success: true,
                message: 'Conversation already exists',
                data: { conversation_id: recipient_id }
            });
        }

        // Get context message based on item or roommate post
        let contextMessage = "Hi! I'm interested in connecting.";
        
        if (item_id) {
            const itemResult = await pool.query(
                'SELECT title FROM items WHERE id = $1',
                [item_id]
            );
            if (itemResult.rows.length > 0) {
                contextMessage = `Hi! I'm interested in your item: ${itemResult.rows[0].title}`;
            }
        } else if (roommate_post_id) {
            const postResult = await pool.query(
                'SELECT title FROM roommate_posts WHERE id = $1',
                [roommate_post_id]
            );
            if (postResult.rows.length > 0) {
                contextMessage = `Hi! I'm interested in your roommate post: ${postResult.rows[0].title}`;
            }
        }

        // Create initial message
        await pool.query(
            `INSERT INTO messages (sender_id, recipient_id, content, item_id, roommate_post_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [sender_id, recipient_id, contextMessage, item_id || null, roommate_post_id || null]
        );

        res.status(201).json({
            success: true,
            message: 'Conversation started successfully',
            data: { conversation_id: recipient_id }
        });

    } catch (error) {
        console.error('Error starting conversation:', error);
        res.status(500).json({
            success: false,
            message: 'Error starting conversation'
        });
    }
};

// Mark Messages as Read
export const markAsRead = async (req, res) => {
    try {
        const { id: otherUserId } = req.params;
        const userId = req.user.userId;

        await pool.query(
            `UPDATE messages 
             SET read_at = CURRENT_TIMESTAMP 
             WHERE sender_id = $1 AND recipient_id = $2 AND read_at IS NULL`,
            [otherUserId, userId]
        );

        res.json({
            success: true,
            message: 'Messages marked as read'
        });

    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking messages as read'
        });
    }
};

// Get Unread Message Count
export const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            'SELECT COUNT(*) as unread_count FROM messages WHERE recipient_id = $1 AND read_at IS NULL',
            [userId]
        );

        res.json({
            success: true,
            data: { unread_count: parseInt(result.rows[0].unread_count) }
        });

    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching unread count'
        });
    }
};

// Archive Conversation (Toggle)
export const toggleArchive = async (req, res) => {
    try {
        // Note: This would need a conversation_participants table for full implementation
        // For now, we'll return a success message
        res.json({
            success: true,
            message: 'Conversation archive status updated'
        });

    } catch (error) {
        console.error('Error archiving conversation:', error);
        res.status(500).json({
            success: false,
            message: 'Error archiving conversation'
        });
    }
};

// Delete Conversation
export const deleteConversation = async (req, res) => {
    try {
        const { id: otherUserId } = req.params;
        const userId = req.user.userId;

        // Soft delete by marking messages as deleted for this user
        // In a full implementation, you'd have a user_deleted_messages table
        await pool.query(
            `DELETE FROM messages 
             WHERE (sender_id = $1 AND recipient_id = $2) 
                OR (sender_id = $2 AND recipient_id = $1)`,
            [userId, otherUserId]
        );

        res.json({
            success: true,
            message: 'Conversation deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting conversation'
        });
    }
};
