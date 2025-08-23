import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { pool } from './database.js';

// Socket.IO instance
let io = null;

// Initialize Socket.IO server
export const initSocket = (server) => {
    if (io) {
        console.log('⚠️ Socket.IO already initialized');
        return io;
    }

    io = new Server(server, {
        cors: {
            origin: [
                process.env.FRONTEND_URL || 'http://localhost:3000',
                'http://localhost:3001', // For development
                'https://campuscart.com', // Production domain
                'https://www.campuscart.com' // Production www domain
            ],
            methods: ['GET', 'POST'],
            credentials: true,
            allowedHeaders: ['Authorization']
        },
        // Transport configuration
        transports: ['websocket', 'polling'],
        allowEIO3: true, // Allow Engine.IO v3 clients
        
        // Connection limits and timeouts
        pingTimeout: 60000, // 60 seconds
        pingInterval: 25000, // 25 seconds
        maxHttpBufferSize: 1e6, // 1MB
        
        // Enable compression
        compression: true,
        
        // Performance settings
        perMessageDeflate: {
            threshold: 1024,
            concurrencyLimit: 10,
            windowBits: 15,
            memLevel: 8
        }
    });

    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            // Extract token from auth or query
            const token = socket.handshake.auth?.token || 
                         socket.handshake.query?.token ||
                         socket.request.headers?.authorization?.replace('Bearer ', '');

            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            // Verify JWT token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            if (!decoded.userId) {
                return next(new Error('Authentication error: Invalid token payload'));
            }

            // Get user from database
            const client = await pool.connect();
            try {
                const userResult = await client.query(`
                    SELECT u.id, u.first_name, u.last_name, u.email, u.role, 
                           u.status, u.email_verified, u.university_id,
                           un.name as university_name
                    FROM users u
                    LEFT JOIN universities un ON u.university_id = un.id
                    WHERE u.id = $1
                `, [decoded.userId]);

                if (userResult.rows.length === 0) {
                    return next(new Error('Authentication error: User not found'));
                }

                const user = userResult.rows[0];

                // Check user status
                if (user.status !== 'active') {
                    return next(new Error('Authentication error: User account not active'));
                }

                if (!user.email_verified) {
                    return next(new Error('Authentication error: Email not verified'));
                }

                // Attach user info to socket
                socket.userId = user.id;
                socket.user = {
                    id: user.id,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    email: user.email,
                    role: user.role,
                    universityId: user.university_id,
                    universityName: user.university_name
                };

                console.log(`🔐 Socket authenticated: ${user.first_name} (${user.id})`);
                next();

            } finally {
                client.release();
            }

        } catch (error) {
            console.error('❌ Socket authentication error:', error.message);
            
            if (error.name === 'TokenExpiredError') {
                return next(new Error('Authentication error: Token expired'));
            } else if (error.name === 'JsonWebTokenError') {
                return next(new Error('Authentication error: Invalid token'));
            } else {
                return next(new Error('Authentication error: Token verification failed'));
            }
        }
    });

    // Connection event handler
    io.on('connection', (socket) => {
        console.log(`✅ User connected: ${socket.user.firstName} (${socket.id})`);

        // Join user to their personal room for notifications
        socket.join(socket.userId.toString());
        
        // Join user to their university room (for university-wide notifications)
        if (socket.user.universityId) {
            socket.join(`university_${socket.user.universityId}`);
        }

        // Send connection confirmation
        socket.emit('connected', {
            success: true,
            message: 'Successfully connected to Campus Cart',
            user: socket.user,
            timestamp: new Date().toISOString()
        });

        // Handle user status updates
        socket.on('user_status_update', (data) => {
            socket.broadcast.emit('user_status_change', {
                userId: socket.userId,
                status: data.status,
                timestamp: new Date().toISOString()
            });
        });

        // Handle typing indicators
        socket.on('typing_start', (data) => {
            if (data.recipientId) {
                socket.to(data.recipientId.toString()).emit('user_typing', {
                    userId: socket.userId,
                    userName: socket.user.firstName,
                    isTyping: true
                });
            }
        });

        socket.on('typing_stop', (data) => {
            if (data.recipientId) {
                socket.to(data.recipientId.toString()).emit('user_typing', {
                    userId: socket.userId,
                    userName: socket.user.firstName,
                    isTyping: false
                });
            }
        });

        // Handle disconnect
        socket.on('disconnect', (reason) => {
            console.log(`❌ User disconnected: ${socket.user.firstName} (${reason})`);
            
            // Notify others of user going offline
            socket.broadcast.emit('user_status_change', {
                userId: socket.userId,
                status: 'offline',
                timestamp: new Date().toISOString()
            });
        });

        // Handle connection errors
        socket.on('error', (error) => {
            console.error(`💥 Socket error for user ${socket.user.firstName}:`, error);
        });

        // Custom event for heartbeat/keep-alive
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: Date.now() });
        });
    });

    // Server-level error handling
    io.engine.on('connection_error', (err) => {
        console.error('❌ Socket.IO connection error:', {
            code: err.code,
            message: err.message,
            context: err.context,
            type: err.type
        });
    });

    console.log('🔌 Socket.IO server initialized successfully');
    return io;
};

// Get Socket.IO instance
export const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized. Call initSocket() first.');
    }
    return io;
};

// Send notification to specific user
export const sendToUser = (userId, event, data) => {
    try {
        const socketIO = getIO();
        socketIO.to(userId.toString()).emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });
        console.log(`📤 Sent '${event}' to user ${userId}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to send '${event}' to user ${userId}:`, error);
        return false;
    }
};

// Send notification to multiple users
export const sendToUsers = (userIds, event, data) => {
    try {
        const socketIO = getIO();
        const userRooms = userIds.map(id => id.toString());
        socketIO.to(userRooms).emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });
        console.log(`📤 Sent '${event}' to ${userIds.length} users`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to send '${event}' to multiple users:`, error);
        return false;
    }
};

// Send notification to all users in a university
export const sendToUniversity = (universityId, event, data) => {
    try {
        const socketIO = getIO();
        socketIO.to(`university_${universityId}`).emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });
        console.log(`📤 Sent '${event}' to university ${universityId}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to send '${event}' to university ${universityId}:`, error);
        return false;
    }
};

// Broadcast to all connected users
export const broadcastToAll = (event, data) => {
    try {
        const socketIO = getIO();
        socketIO.emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });
        console.log(`📢 Broadcasted '${event}' to all users`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to broadcast '${event}':`, error);
        return false;
    }
};

// Get connection statistics
export const getSocketStats = () => {
    try {
        const socketIO = getIO();
        const sockets = socketIO.sockets.sockets;
        
        return {
            totalConnections: sockets.size,
            connectedUsers: Array.from(sockets.values()).map(socket => ({
                id: socket.userId,
                name: `${socket.user.firstName} ${socket.user.lastName}`,
                connectedAt: socket.handshake.time,
                universityId: socket.user.universityId
            })),
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('❌ Failed to get socket stats:', error);
        return null;
    }
};

// Check if user is online
export const isUserOnline = (userId) => {
    try {
        const socketIO = getIO();
        const userRoom = socketIO.sockets.adapter.rooms.get(userId.toString());
        return userRoom && userRoom.size > 0;
    } catch (error) {
        console.error(`❌ Failed to check if user ${userId} is online:`, error);
        return false;
    }
};

export default {
    initSocket,
    getIO,
    sendToUser,
    sendToUsers,
    sendToUniversity,
    broadcastToAll,
    getSocketStats,
    isUserOnline
};
