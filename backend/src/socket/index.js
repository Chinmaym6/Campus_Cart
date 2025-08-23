import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

// Initialize Socket.IO server
let io;

export const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: [
                process.env.FRONTEND_URL || 'http://localhost:3000',
                'http://localhost:3001',
                'https://campuscart.com',
                'https://www.campuscart.com'
            ],
            methods: ['GET', 'POST'],
            credentials: true,
            allowedHeaders: ['Authorization']
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000
    });

    // Middleware for socket authentication
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.query.token;
            
            if (!token) {
                return next(new Error('Authentication token required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user info from database
            const userResult = await pool.query(
                'SELECT id, first_name, last_name, email, role, status FROM users WHERE id = $1',
                [decoded.userId]
            );

            if (userResult.rows.length === 0 || userResult.rows[0].status !== 'active') {
                return next(new Error('Invalid user or account not active'));
            }

            socket.userId = decoded.userId;
            socket.user = userResult.rows;
            next();
        } catch (error) {
            console.error('Socket authentication error:', error);
            next(new Error('Authentication failed'));
        }
    });

    // Connection event
    io.on('connection', (socket) => {
        console.log(`✅ User connected: ${socket.user.first_name} (${socket.id})`);
        
        // Join user to their personal notification room
        socket.join(socket.userId.toString());
        
        // Track online users
        socket.emit('connected', {
            message: 'Successfully connected to Campus Cart',
            user: {
                id: socket.user.id,
                firstName: socket.user.first_name,
                lastName: socket.user.last_name
            }
        });

        // Handle disconnection
        socket.on('disconnect', (reason) => {
            console.log(`❌ User disconnected: ${socket.user.first_name} (${reason})`);
        });

        // Handle connection errors
        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    });

    console.log('🔌 Socket.IO server initialized');
    return io;
};

// Getter function for io instance
export const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO has not been initialized. Call initializeSocket first.');
    }
    return io;
};

export { io };
