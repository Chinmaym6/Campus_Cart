import express from 'express';
import { body, param, query } from 'express-validator';
import * as messagesController from '../controllers/messageController.js';
import { auth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

// All message routes require authentication
router.use(auth);

// Message validation
const sendMessageValidation = [
    body('recipient_id').isUUID().withMessage('Valid recipient ID required'),
    body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Message content is required (max 2000 chars)'),
    body('item_id').optional().isUUID(),
    body('roommate_post_id').optional().isUUID()
];

// Conversations
router.get('/conversations', messagesController.getConversations);
router.get('/conversations/:id', param('id').isUUID(), validateRequest, messagesController.getConversation);
router.get('/conversations/:id/messages', 
    param('id').isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    validateRequest,
    messagesController.getConversationMessages
);

// Send message
router.post('/send', sendMessageValidation, validateRequest, messagesController.sendMessage);

// Start new conversation
router.post('/conversations/start', 
    body('recipient_id').isUUID(),
    body('item_id').optional().isUUID(),
    body('roommate_post_id').optional().isUUID(),
    validateRequest,
    messagesController.startConversation
);

// Mark as read
router.put('/conversations/:id/read', param('id').isUUID(), validateRequest, messagesController.markAsRead);

// Archive/unarchive conversation
router.put('/conversations/:id/archive', param('id').isUUID(), validateRequest, messagesController.toggleArchive);

// Delete conversation
router.delete('/conversations/:id', param('id').isUUID(), validateRequest, messagesController.deleteConversation);

// Get unread count
router.get('/unread-count', messagesController.getUnreadCount);

export default router;
