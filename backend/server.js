// server.js - Complete Campus Cart Backend Server
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Database and configs
import { pool } from "./src/config/database.js";
import "./src/config/aws.js";

// Socket setup
import { initializeSocket } from "./src/socket/index.js";
import { setupMessageHandlers } from "./src/socket/messageHandlers.js";
import { setupNotificationHandlers } from "./src/socket/notificationHandlers.js";
import { setupRoommateHandlers } from "./src/socket/roommateHandlers.js";

// Middleware imports
import { corsWithLogging } from "./src/middleware/cors.js";
import { errorHandler, notFoundHandler } from "./src/middleware/errorHandler.js";
import { defaultLimiter, authLimiter, uploadLimiter } from "./src/middleware/rateLimit.js";
import { requestLogger } from "./src/middleware/logger.js";
import { validateContentType } from "./src/middleware/validation.js";

// Security middleware
import { authMiddleware } from "./src/middleware/auth.js";
import { adminMiddleware } from "./src/middleware/adminAuth.js";

// Route imports
import authRoutes from "./src/routes/auth.js";
import itemRoutes from "./src/routes/items.js";
import userRoutes from "./src/routes/users.js";
import categoryRoutes from "./src/routes/categories.js";
import messageRoutes from "./src/routes/messages.js";
import conversationRoutes from "./src/routes/conversations.js";
import roommateRoutes from "./src/routes/roommates.js";
import reviewRoutes from "./src/routes/reviews.js";
import reportRoutes from "./src/routes/reports.js";
import uploadRoutes from "./src/routes/uploads.js";
import notificationRoutes from "./src/routes/notifications.js";
import searchRoutes from "./src/routes/search.js";
import analyticsRoutes from "./src/routes/analytics.js";
import universityRoutes from "./src/routes/universities.js";
import adminRoutes from "./src/routes/admin/index.js";

// Utility imports
import { createDirectories } from "./src/utils/fileSystem.js";
import { initializeDatabase } from "./src/utils/dbInit.js";
import { setupCronJobs } from "./src/utils/cronJobs.js";

// Load environment variables
dotenv.config();

// ES6 __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create HTTP server for Socket.IO integration
const server = http.createServer(app);

// Trust proxy for production deployment
if (NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: NODE_ENV === 'production' ? {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", process.env.FRONTEND_URL].filter(Boolean)
        }
    } : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Compression middleware
app.use(compression({
    threshold: 1024,
    level: 6,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

// Enhanced CORS configuration
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173', // Vite default
        process.env.FRONTEND_URL,
        process.env.CLIENT_URL,
        process.env.ADMIN_URL
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'X-Socket-Id'
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400 // 24 hours
}));

// Request logging
if (NODE_ENV === 'development') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('combined', {
        stream: fs.createWriteStream(path.join(__dirname, 'logs', 'access.log'), { flags: 'a' })
    }));
}

// Rate limiting with different levels
app.use('/api/auth', authLimiter);
app.use('/api/uploads', uploadLimiter);
app.use('/api/', defaultLimiter);

// Body parsing middleware with size limits
app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb',
    parameterLimit: 50
}));

// Cookie parsing middleware
app.use(cookieParser(process.env.COOKIE_SECRET));

// Custom request logging for development
app.use(requestLogger);

// Content type validation for API routes
app.use('/api', validateContentType);

// Static file serving with caching
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: NODE_ENV === 'production' ? '7d' : '1h',
    etag: true,
    lastModified: true
}));

// Serve static files for documentation
app.use('/docs', express.static(path.join(__dirname, 'docs'), {
    maxAge: '1d'
}));

// API Documentation endpoint
app.get('/api-docs', (req, res) => {
    res.sendFile(path.join(__dirname, 'docs', 'index.html'));
});

// Enhanced health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        // Test database connection
        const dbStart = Date.now();
        const dbResult = await pool.query('SELECT NOW() as timestamp, version() as version');
        const dbTime = Date.now() - dbStart;
        
        // Memory usage
        const memUsage = process.memoryUsage();
        
        // System information
        const systemInfo = {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            uptime: process.uptime(),
            pid: process.pid
        };
        
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: NODE_ENV,
            version: process.env.APP_VERSION || '1.0.0',
            database: {
                status: 'connected',
                responseTime: `${dbTime}ms`,
                timestamp: dbResult.rows[0].timestamp,
                version: dbResult.rows.version.split(' ')
            },
            memory: {
                used: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
                total: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
                external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100,
                unit: 'MB'
            },
            system: systemInfo,
            services: {
                socketio: 'active',
                cloudinary: process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : 'not configured',
                email: process.env.EMAIL_SERVICE ? 'configured' : 'not configured'
            }
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
            database: 'disconnected'
        });
    }
});

// API status endpoint
app.get('/api/status', async (req, res) => {
    try {
        const activeConnections = await pool.query(
            'SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = $1',
            ['active']
        );
        
        res.json({
            status: 'operational',
            timestamp: new Date().toISOString(),
            version: process.env.APP_VERSION || '1.0.0',
            environment: NODE_ENV,
            database: {
                activeConnections: parseInt(activeConnections.rows[0].active_connections)
            },
            endpoints: {
                auth: '/api/auth',
                items: '/api/items',
                users: '/api/users',
                categories: '/api/categories',
                messages: '/api/messages',
                conversations: '/api/conversations',
                roommates: '/api/roommates',
                reviews: '/api/reviews',
                reports: '/api/reports',
                uploads: '/api/uploads',
                notifications: '/api/notifications',
                search: '/api/search',
                analytics: '/api/analytics',
                universities: '/api/universities',
                admin: '/api/admin'
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'degraded',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// API info endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'Campus Cart API',
        description: 'A comprehensive marketplace platform for university students',
        version: process.env.APP_VERSION || '1.0.0',
        status: 'active',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        features: [
            'User Authentication & Authorization',
            'Item Marketplace',
            'Real-time Messaging',
            'Roommate Finder',
            'Review System',
            'Admin Dashboard',
            'File Uploads',
            'Push Notifications',
            'Advanced Search',
            'Analytics & Reporting'
        ],
        endpoints: {
            documentation: `${req.protocol}://${req.get('host')}/api-docs`,
            health: `${req.protocol}://${req.get('host')}/api/health`,
            status: `${req.protocol}://${req.get('host')}/api/status`
        }
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Campus Cart API! 🎒📚',
        description: 'Your university marketplace platform',
        version: process.env.APP_VERSION || '1.0.0',
        timestamp: new Date().toISOString(),
        links: {
            api: `${req.protocol}://${req.get('host')}/api`,
            documentation: `${req.protocol}://${req.get('host')}/api-docs`,
            health: `${req.protocol}://${req.get('host')}/api/health`
        }
    });
});

// API Routes - Public routes (no authentication required)
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/search', searchRoutes);

// API Routes - Protected routes (authentication required)
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/items', authMiddleware, itemRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/conversations', authMiddleware, conversationRoutes);
app.use('/api/roommates', authMiddleware, roommateRoutes);
app.use('/api/reviews', authMiddleware, reviewRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/uploads', authMiddleware, uploadRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);

// API Routes - Admin only routes
app.use('/api/admin', authMiddleware, adminMiddleware, adminRoutes);
app.use('/api/analytics', authMiddleware, adminMiddleware, analyticsRoutes);

// Webhook endpoints (for external services)
app.post('/webhooks/cloudinary', express.raw({ type: 'application/json' }), (req, res) => {
    // Handle Cloudinary webhooks
    console.log('Cloudinary webhook received');
    res.status(200).send('OK');
});

app.post('/webhooks/payments', express.raw({ type: 'application/json' }), (req, res) => {
    // Handle payment webhooks (if implementing payments)
    console.log('Payment webhook received');
    res.status(200).send('OK');
});

// API metrics endpoint (for monitoring)
app.get('/api/metrics', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const metrics = {
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            activeConnections: server.listening ? server._connections : 0,
            environment: NODE_ENV
        };
        
        res.json(metrics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Handle 404 for API routes
app.use('/api/*', notFoundHandler);

// Serve frontend in production
if (NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, 'dist');
    if (fs.existsSync(frontendPath)) {
        app.use(express.static(frontendPath));
        app.get('*', (req, res) => {
            res.sendFile(path.join(frontendPath, 'index.html'));
        });
    }
}

// Global error handling middleware
app.use(errorHandler);

// Database connection test
const testConnection = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW(), version()');
        client.release();
        
        console.log("✅ Database connected successfully!");
        console.log(`📊 PostgreSQL version: ${result.rows[0].version.split(' ')}`);
        console.log(`⏰ Database time: ${result.rows.now}`);
        return true;
    } catch (error) {
        console.error("❌ Database connection error:", error.message);
        throw error;
    }
};

// Initialize required directories
const initializeDirectories = () => {
    const directories = [
        'uploads',
        'uploads/images',
        'uploads/documents',
        'uploads/temp',
        'logs'
    ];
    
    createDirectories(directories);
    console.log("✅ Required directories initialized!");
};

// Socket.IO initialization
const initializeSockets = () => {
    try {
        console.log('🔌 Initializing Socket.IO...');
        const io = initializeSocket(server);
        
        // Setup all socket handlers
        setupMessageHandlers(io);
        setupNotificationHandlers(io);
        setupRoommateHandlers(io);
        
        console.log('✅ Socket.IO initialized successfully!');
        return io;
    } catch (error) {
        console.error('❌ Socket.IO initialization failed:', error);
        throw error;
    }
};

// Initialize database schema and seed data
const initializeApp = async () => {
    try {
        console.log('🔄 Initializing application...');
        await initializeDatabase();
        console.log('✅ Database schema initialized!');
        
        // Setup cron jobs for cleanup and maintenance
        setupCronJobs();
        console.log('✅ Cron jobs configured!');
        
    } catch (error) {
        console.error('❌ Application initialization failed:', error);
        throw error;
    }
};

// Enhanced server startup
const startServer = async () => {
    try {
        console.log('🚀 =====================================================');
        console.log('🎒 Starting Campus Cart Server...');
        console.log('🚀 =====================================================');
        
        // Initialize directories
        initializeDirectories();
        
        // Test database connection
        await testConnection();
        
        // Initialize application
        await initializeApp();
        
        // Initialize Socket.IO
        const io = initializeSockets();
        
        // Start server
        server.listen(port, () => {
            console.log('🚀 =====================================================');
            console.log(`✅ Campus Cart Server is running!`);
            console.log(`📍 Server URL: http://localhost:${port}`);
            console.log(`🏥 Health Check: http://localhost:${port}/api/health`);
            console.log(`📊 API Status: http://localhost:${port}/api/status`);
            console.log(`📚 API Documentation: http://localhost:${port}/api-docs`);
            console.log(`🔌 Socket.IO: Enabled`);
            console.log(`🌍 Environment: ${NODE_ENV}`);
            console.log(`📦 Node Version: ${process.version}`);
            console.log(`📊 Process ID: ${process.pid}`);
            console.log(`💾 Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
            
            if (NODE_ENV === 'production') {
                console.log(`🔒 Security: Enhanced`);
                console.log(`📈 Monitoring: Active`);
            }
            
            console.log('🚀 =====================================================');
            console.log('🎓 Campus Cart is ready for students! 📚');
            console.log('🚀 =====================================================');
        });

        // Store io instance globally for use in routes
        app.locals.io = io;

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        console.error('💡 Please check your configuration and try again.');
        
        if (error.code === 'ECONNREFUSED') {
            console.error('🔍 Database connection refused. Please ensure PostgreSQL is running.');
        } else if (error.code === 'EADDRINUSE') {
            console.error(`🔍 Port ${port} is already in use. Please use a different port.`);
        }
        
        process.exit(1);
    }
};

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
    console.log(`\n⚠️  Received ${signal}. Starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close(async (err) => {
        if (err) {
            console.error('❌ Error during server shutdown:', err);
            process.exit(1);
        }
        
        console.log('✅ Server stopped accepting new connections');
        
        try {
            // Close database connections
            await pool.end();
            console.log('✅ Database connections closed');
            
            // Cleanup temp files
            const tempDir = path.join(__dirname, 'uploads', 'temp');
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                console.log('✅ Temporary files cleaned up');
            }
            
            console.log('👋 Campus Cart server shutdown complete!');
            process.exit(0);
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
            process.exit(1);
        }
    });
    
    // Force close after 15 seconds
    setTimeout(() => {
        console.error('⚡ Forcing shutdown after 15 seconds...');
        process.exit(1);
    }, 15000);
};

// Process signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Enhanced error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('📊 Reason:', reason);
    
    if (reason instanceof Error) {
        console.error('📊 Stack trace:', reason.stack);
    }
    
    // Don't crash in production, just log the error
    if (NODE_ENV === 'production') {
        console.error('⚠️  Unhandled rejection in production, continuing...');
        return;
    }
    
    // Close server gracefully in development
    server.close(() => {
        console.error('💥 Server closed due to unhandled rejection');
        process.exit(1);
    });
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    console.error('📊 Stack trace:', err.stack);
    
    // Always exit on uncaught exceptions
    console.error('💥 Exiting due to uncaught exception...');
    process.exit(1);
});

// Process warnings handler
process.on('warning', (warning) => {
    if (NODE_ENV === 'development') {
        console.warn('⚠️  Process Warning:', warning.name);
        console.warn('📄 Message:', warning.message);
        if (warning.stack) {
            console.warn('📊 Stack:', warning.stack);
        }
    }
});

// Memory usage monitoring in development
if (NODE_ENV === 'development') {
    setInterval(() => {
        const memUsage = process.memoryUsage();
        const used = Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100;
        if (used > 100) { // Alert if using more than 100MB
            console.warn(`⚠️  High memory usage: ${used}MB`);
        }
    }, 60000); // Check every minute
}

// Start the server
startServer();

// Export for testing
export { app, server };
