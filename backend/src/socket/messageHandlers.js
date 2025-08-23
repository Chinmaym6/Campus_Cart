import { getIO } from './index.js';
import { pool } from '../config/database.js';

export const setupMessageHandlers = () => {
    const io = getIO();

    io.on('connection', (socket) => {
        
        // Join conversation room
        socket.on('join_conversation', async (data) => {
            try {
                const { recipientId, itemId } = data;
                
                // Create a unique room name for the conversation
                const roomId = [socket.userId, recipientId].sort().join('-');
                socket.join(roomId);
                
                console.log(`👥 User ${socket.user.first_name} joined conversation room: ${roomId}`);
                
                // Notify that user joined the conversation
                socket.to(roomId).emit('user_joined_conversation', {
                    userId: socket.userId,
                    userName: socket.user.first_name,
                    itemId
                });

                // Send recent messages for this conversation
                const messagesResult = await pool.query(`
                    SELECT m.*, 
                           sender.first_name as sender_name,
                           recipient.first_name as recipient_name,
                           i.title as item_title
                    FROM messages m
                    JOIN users sender ON m.sender_id = sender.id
                    JOIN users recipient ON m.recipient_id = recipient.id
                    LEFT JOIN items i ON m.item_id = i.id
                    WHERE (m.sender_id = $1 AND m.recipient_id = $2) 
                       OR (m.sender_id = $2 AND m.recipient_id = $1)
                    ORDER BY m.created_at DESC
                    LIMIT 50
                `, [socket.userId, recipientId]);

                socket.emit('conversation_history', messagesResult.rows.reverse());

            } catch (error) {
                console.error('Error joining conversation:', error);
                socket.emit('error', { message: 'Failed to join conversation' });
            }
        });

        // Send message
        socket.on('send_message', async (data) => {
            try {
                const { recipientId, content, itemId, roommatePostId } = data;

                // Validate message content
                if (!content || content.trim().length === 0) {
                    socket.emit('error', { message: 'Message content is required' });
                    return;
                }

                if (content.length > 2000) {
                    socket.emit('error', { message: 'Message too long (max 2000 characters)' });
                    return;
                }

                // Save message to database
                const messageResult = await pool.query(`
                    INSERT INTO messages (sender_id, recipient_id, content, item_id, roommate_post_id)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id, created_at
                `, [socket.userId, recipientId, content.trim(), itemId || null, roommatePostId || null]);

                const message = {
                    id: messageResult.rows[0].id,
                    senderId: socket.userId,
                    recipientId: recipientId,
                    content: content.trim(),
                    itemId: itemId || null,
                    roommatePostId: roommatePostId || null,
                    createdAt: messageResult.rows[0].created_at,
                    senderName: socket.user.first_name,
                    senderLastName: socket.user.last_name
                };

                // Send to conversation room
                const roomId = [socket.userId, recipientId].sort().join('-');
                io.to(roomId).emit('receive_message', message);

                // Send push notification to recipient if they're not in the conversation
                const recipientSockets = await io.in(recipientId.toString()).fetchSockets();
                const isRecipientInConversation = recipientSockets.some(s => 
                    s.rooms.has(roomId)
                );

                if (!isRecipientInConversation) {
                    io.to(recipientId.toString()).emit('new_message_notification', {
                        messageId: message.id,
                        senderId: socket.userId,
                        senderName: socket.user.first_name,
                        preview: content.substring(0, 100),
                        itemId: itemId || null,
                        timestamp: message.createdAt
                    });
                }

                console.log(`💬 Message sent from ${socket.user.first_name} to ${recipientId}`);

            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Typing indicator
        socket.on('typing_start', (data) => {
            const { recipientId } = data;
            const roomId = [socket.userId, recipientId].sort().join('-');
            
            socket.to(roomId).emit('user_typing', {
                userId: socket.userId,
                userName: socket.user.first_name,
                isTyping: true
            });
        });

        socket.on('typing_stop', (data) => {
            const { recipientId } = data;
            const roomId = [socket.userId, recipientId].sort().join('-');
            
            socket.to(roomId).emit('user_typing', {
                userId: socket.userId,
                userName: socket.user.first_name,
                isTyping: false
            });
        });

        // Mark messages as read
        socket.on('mark_messages_read', async (data) => {
            try {
                const { senderId } = data;

                await pool.query(`
                    UPDATE messages 
                    SET read_at = CURRENT_TIMESTAMP 
                    WHERE sender_id = $1 AND recipient_id = $2 AND read_at IS NULL
                `, [senderId, socket.userId]);

                // Notify sender that messages were read
                io.to(senderId.toString()).emit('messages_read', {
                    readByUserId: socket.userId,
                    readByUserName: socket.user.first_name
                });

                console.log(`📖 Messages marked as read by ${socket.user.first_name}`);

            } catch (error) {
                console.error('Error marking messages as read:', error);
            }
        });

        // Leave conversation
        socket.on('leave_conversation', (data) => {
            const { recipientId } = data;
            const roomId = [socket.userId, recipientId].sort().join('-');
            
            socket.leave(roomId);
            socket.to(roomId).emit('user_left_conversation', {
                userId: socket.userId,
                userName: socket.user.first_name
            });

            console.log(`👋 User ${socket.user.first_name} left conversation room: ${roomId}`);
        });
    });
};

// Helper function to send message notification via socket
export const sendMessageNotification = (recipientId, messageData) => {
    const io = getIO();
    io.to(recipientId.toString()).emit('new_message_notification', messageData);
};

export default setupMessageHandlers;
