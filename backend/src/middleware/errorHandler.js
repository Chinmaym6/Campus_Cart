// Global error handling middleware
export const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error details
    console.error('Error Details:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.userId || 'Unauthenticated'
    });

    // Mongoose/MongoDB duplicate key error
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = {
            message,
            statusCode: 400
        };
    }

    // PostgreSQL duplicate key error
    if (err.code === '23505') {
        const message = 'Duplicate value. Resource already exists.';
        error = {
            message,
            statusCode: 400
        };
    }

    // PostgreSQL foreign key constraint error
    if (err.code === '23503') {
        const message = 'Referenced resource not found';
        error = {
            message,
            statusCode: 404
        };
    }

    // PostgreSQL invalid input syntax
    if (err.code === '22P02') {
        const message = 'Invalid input format';
        error = {
            message,
            statusCode: 400
        };
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token';
        error = {
            message,
            statusCode: 401
        };
    }

    if (err.name === 'TokenExpiredError') {
        const message = 'Token expired';
        error = {
            message,
            statusCode: 401
        };
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = {
            message: `Validation Error: ${message}`,
            statusCode: 400
        };
    }

    // Express validator errors
    if (err.type === 'entity.parse.failed') {
        const message = 'Invalid JSON format';
        error = {
            message,
            statusCode: 400
        };
    }

    // Multer errors (file upload)
    if (err.code === 'LIMIT_FILE_SIZE') {
        const message = 'File too large. Maximum size is 10MB.';
        error = {
            message,
            statusCode: 400
        };
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
        const message = 'Too many files. Maximum is 10 files.';
        error = {
            message,
            statusCode: 400
        };
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        const message = 'Unexpected field in file upload';
        error = {
            message,
            statusCode: 400
        };
    }

    // Rate limiting errors
    if (err.status === 429) {
        const message = 'Too many requests. Please try again later.';
        error = {
            message,
            statusCode: 429
        };
    }

    // CORS errors
    if (err.message.includes('CORS')) {
        const message = 'Cross-origin request blocked';
        error = {
            message,
            statusCode: 403
        };
    }

    // Default error response
    const statusCode = error.statusCode || err.statusCode || 500;
    const message = error.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        error: {
            message,
            ...(process.env.NODE_ENV === 'development' && {
                stack: err.stack,
                details: err
            })
        },
        timestamp: new Date().toISOString(),
        path: req.url,
        method: req.method
    });
};

// 404 handler (should be used before error handler)
export const notFoundHandler = (req, res, next) => {
    const error = new Error(`Route ${req.originalUrl} not found`);
    error.statusCode = 404;
    next(error);
};

// Async error wrapper
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Custom error class
export class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

// Database connection error handler
export const handleDatabaseError = (err, req, res, next) => {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        console.error('Database connection error:', err);
        return res.status(503).json({
            success: false,
            message: 'Database connection failed. Please try again later.',
            error: 'SERVICE_UNAVAILABLE'
        });
    }
    next(err);
};

export default errorHandler;
