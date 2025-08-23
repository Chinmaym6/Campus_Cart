// roommateHandlers.js - Socket handlers for roommate functionality
import { pool } from '../config/database.js';

// Setup roommate-related socket handlers
export const setupRoommateHandlers = (io, socket) => {
    // Add proper validation to prevent the error
    if (!socket || !socket.id) {
        console.error('❌ Invalid socket object provided to roommate handlers');
        return;
    }

    console.log('✓ Setting up roommate handlers for socket:', socket.id);

    // Join roommate room
    socket.on('join_roommate_room', async (data) => {
        try {
            const { userId } = data;
            if (!userId) {
                socket.emit('error', { message: 'User ID is required' });
                return;
            }

            const roomName = `roommate_${userId}`;
            socket.join(roomName);
            console.log(`✓ User ${userId} joined roommate room: ${roomName}`);
            
            // Acknowledge successful join
            socket.emit('roommate_room_joined', { roomName, userId });
        } catch (error) {
            console.error('Error joining roommate room:', error);
            socket.emit('error', { message: 'Failed to join roommate room' });
        }
    });

    // Leave roommate room
    socket.on('leave_roommate_room', async (data) => {
        try {
            const { userId } = data;
            if (!userId) {
                return; // Silent fail for leave operations
            }

            const roomName = `roommate_${userId}`;
            socket.leave(roomName);
            console.log(`✓ User ${userId} left roommate room: ${roomName}`);
        } catch (error) {
            console.error('Error leaving roommate room:', error);
        }
    });

    // Handle roommate post updates
    socket.on('roommate_post_update', async (data) => {
        try {
            const { postId, userId, action } = data;
            
            if (!postId || !userId || !action) {
                socket.emit('error', { message: 'Missing required fields for roommate post update' });
                return;
            }
            
            // Broadcast to all users interested in roommate posts
            socket.broadcast.emit('roommate_post_updated', {
                postId,
                userId,
                action,
                timestamp: new Date().toISOString()
            });
            
            console.log(`✓ Roommate post ${postId} updated by user ${userId}: ${action}`);
        } catch (error) {
            console.error('Error handling roommate post update:', error);
            socket.emit('error', { message: 'Failed to update roommate post' });
        }
    });

    // Handle roommate match notifications
    socket.on('roommate_match', async (data) => {
        try {
            const { fromUserId, toUserId, postId } = data;
            
            if (!fromUserId || !toUserId || !postId) {
                socket.emit('error', { message: 'Missing required fields for roommate match' });
                return;
            }

            const targetRoom = `roommate_${toUserId}`;
            
            // Send match notification to target user
            io.to(targetRoom).emit('roommate_match_notification', {
                fromUserId,
                postId,
                message: 'You have a new roommate match!',
                timestamp: new Date().toISOString()
            });
            
            console.log(`✓ Roommate match notification sent from ${fromUserId} to ${toUserId}`);
        } catch (error) {
            console.error('Error handling roommate match:', error);
            socket.emit('error', { message: 'Failed to send match notification' });
        }
    });

    // Handle roommate interest
    socket.on('roommate_interest', async (data) => {
        try {
            const { fromUserId, toUserId, postId, message } = data;
            
            if (!fromUserId || !toUserId || !postId) {
                socket.emit('error', { message: 'Missing required fields for roommate interest' });
                return;
            }

            const targetRoom = `roommate_${toUserId}`;
            
            // Send interest notification to post owner
            io.to(targetRoom).emit('roommate_interest_notification', {
                fromUserId,
                postId,
                message: message || 'Someone is interested in your roommate post!',
                timestamp: new Date().toISOString()
            });
            
            console.log(`✓ Roommate interest sent from ${fromUserId} to ${toUserId}`);
        } catch (error) {
            console.error('Error handling roommate interest:', error);
            socket.emit('error', { message: 'Failed to send interest notification' });
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('✓ User disconnected from roommate handlers:', socket.id);
    });
};

export default setupRoommateHandlers;