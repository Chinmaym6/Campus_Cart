import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./src/config/database.js";
import route from "./src/routes/auth.js";

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({ 
    origin: 'http://localhost:3000',
    credentials: true 
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Routes with proper prefix
app.use('/api/auth', route);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something broke!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// Handle 404 routes
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

const { connectToDatabase } = db;

// Start server with proper error handling
const startServer = async () => {
    try {
        await connectToDatabase();
        app.listen(port, () => {
            console.log(`✅ Server is running at http://localhost:${port}/`);
            console.log(`📚 API Documentation available at http://localhost:${port}/api-docs`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
    process.exit(1);
});
