// conversations.js - Routes for conversation management
import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// Get all conversations for a user
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const query = `
            SELECT DISTINCT
                c.id,
                c.created_at,
                c.updated_at,
                CASE 
                    WHEN c.user1_id = $1 THEN u2.id
                    ELSE u1.id
                END as other_user_id,
                CASE 
                    WHEN c.user1_id = $1 THEN u2.first_name || ' ' || u2.last_name
                    ELSE u1.first_name || ' ' || u1.last_name
                END as other_user_name,
                CASE 
                    WHEN c.user1_id = $1 THEN u2.profile_picture
                    ELSE u1.profile_picture
                END as other_user_avatar,
                m.content as last_message,
                m.created_at as last_message_time,
                m.sender_id as last_message_sender_id,
                CASE 
                    WHEN m.sender_id != $1 AND m.read_at IS NULL THEN true
                    ELSE false
                END as has_unread
            FROM conversations c
            JOIN users u1 ON c.user1_id = u1.id
            JOIN users u2 ON c.user2_id = u2.id
            LEFT JOIN messages m ON c.last_message_id = m.id
            WHERE c.user1_id = $1 OR c.user2_id = $1
            ORDER BY COALESCE(m.created_at, c.created_at) DESC
        `;
        
        const result = await pool.query(query, [userId]);
        
        res.json({
            success: true,
            conversations: result.rows
        });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conversations'
        });
    }
});

// Get or create conversation between two users
router.post('/find-or-create', async (req, res) => {
    try {
        const { otherUserId } = req.body;
        const userId = req.user.id;
        
        if (!otherUserId) {
            return res.status(400).json({
                success: false,
                message: 'Other user ID is required'
            });
        }
        
        if (userId === otherUserId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot create conversation with yourself'
            });
        }
        
        // Check if conversation already exists
        const existingQuery = `
            SELECT id FROM conversations 
            WHERE (user1_id = $1 AND user2_id = $2) 
               OR (user1_id = $2 AND user2_id = $1)
        `;
        
        const existingResult = await pool.query(existingQuery, [userId, otherUserId]);
        
        if (existingResult.rows.length > 0) {
            return res.json({
                success: true,
                conversation: { id: existingResult.rows[0].id },
                created: false
            });
        }
        
        // Create new conversation
        const createQuery = `
            INSERT INTO conversations (user1_id, user2_id, created_at, updated_at)
            VALUES ($1, $2, NOW(), NOW())
            RETURNING id
        `;
        
        const createResult = await pool.query(createQuery, [userId, otherUserId]);
        
        res.json({
            success: true,
            conversation: { id: createResult.rows[0].id },
            created: true
        });
    } catch (error) {
        console.error('Error finding/creating conversation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to find or create conversation'
        });
    }
});

// Get conversation details
router.get('/:id', async (req, res) => {
    try {
        const conversationId = req.params.id;
        const userId = req.user.id;
        
        // Verify user is part of this conversation
        const verifyQuery = `
            SELECT 
                c.*,
                u1.first_name || ' ' || u1.last_name as user1_name,
                u1.profile_picture as user1_avatar,
                u2.first_name || ' ' || u2.last_name as user2_name,
                u2.profile_picture as user2_avatar
            FROM conversations c
            JOIN users u1 ON c.user1_id = u1.id
            JOIN users u2 ON c.user2_id = u2.id
            WHERE c.id = $1 AND (c.user1_id = $2 OR c.user2_id = $2)
        `;
        
        const verifyResult = await pool.query(verifyQuery, [conversationId, userId]);
        
        if (verifyResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found or access denied'
            });
        }
        
        const conversation = verifyResult.rows[0];
        
        res.json({
            success: true,
            conversation: {
                id: conversation.id,
                created_at: conversation.created_at,
                updated_at: conversation.updated_at,
                other_user: {
                    id: conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id,
                    name: conversation.user1_id === userId ? conversation.user2_name : conversation.user1_name,
                    avatar: conversation.user1_id === userId ? conversation.user2_avatar : conversation.user1_avatar
                }
            }
        });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conversation'
        });
    }
});

// Delete conversation
router.delete('/:id', async (req, res) => {
    try {
        const conversationId = req.params.id;
        const userId = req.user.id;
        
        // Verify user is part of this conversation
        const verifyQuery = `
            SELECT id FROM conversations 
            WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)
        `;
        
        const verifyResult = await pool.query(verifyQuery, [conversationId, userId]);
        
        if (verifyResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found or access denied'
            });
        }
        
        // Delete all messages in the conversation first
        await pool.query('DELETE FROM messages WHERE conversation_id = $1', [conversationId]);
        
        // Delete the conversation
        await pool.query('DELETE FROM conversations WHERE id = $1', [conversationId]);
        
        res.json({
            success: true,
            message: 'Conversation deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete conversation'
        });
    }
});

// Mark conversation as read
router.patch('/:id/read', async (req, res) => {
    try {
        const conversationId = req.params.id;
        const userId = req.user.id;
        
        // Mark all unread messages in this conversation as read
        const updateQuery = `
            UPDATE messages 
            SET read_at = NOW()
            WHERE conversation_id = $1 
              AND sender_id != $2 
              AND read_at IS NULL
        `;
        
        await pool.query(updateQuery, [conversationId, userId]);
        
        res.json({
            success: true,
            message: 'Conversation marked as read'
        });
    } catch (error) {
        console.error('Error marking conversation as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark conversation as read'
        });
    }
});

export default router;