import rateLimit from 'express-rate-limit';
import { pool } from '../config/database.js';

// Default rate limiter
export const defaultLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: 15 * 60 // seconds
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Rate limit exceeded. Please slow down.',
            retryAfter: Math.round(req.rateLimit.msBeforeNext / 1000) || 1
        });
    }
});

// Authentication rate limiter (stricter)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth attempts per windowMs
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req, res) => {
        console.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            message: 'Too many login attempts. Please try again in 15 minutes.',
            code: 'AUTH_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.round(req.rateLimit.msBeforeNext / 1000)
        });
    }
});

// Registration rate limiter (very strict)
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 registration attempts per hour
    message: {
        success: false,
        message: 'Too many registration attempts. Please try again in 1 hour.',
        code: 'REGISTER_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`Registration rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            message: 'Too many registration attempts. Please try again later.',
            code: 'REGISTER_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.round(req.rateLimit.msBeforeNext / 1000)
        });
    }
});

// Password reset rate limiter
export const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // Limit each IP to 3 password reset attempts per windowMs
    message: {
        success: false,
        message: 'Too many password reset attempts. Please try again in 15 minutes.',
        code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`Password reset rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            message: 'Too many password reset requests. Please try again later.',
            code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.round(req.rateLimit.msBeforeNext / 1000)
        });
    }
});

// API rate limiter (for general API usage)
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
        success: false,
        message: 'API rate limit exceeded. Please try again later.',
        code: 'API_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for certain routes or users
        return req.user?.role === 'admin' || req.path.startsWith('/health');
    }
});

// Upload rate limiter
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Limit each IP to 50 upload requests per hour
    message: {
        success: false,
        message: 'Too many file uploads. Please try again later.',
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Upload rate limit exceeded. Please try again later.',
            code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.round(req.rateLimit.msBeforeNext / 1000)
        });
    }
});

// Message rate limiter
// Message rate limiter - FIXED VERSION
// SIMPLEST FIX: Remove the custom keyGenerator entirely from messageLimiter
export const messageLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Limit each IP to 10 messages per minute
    message: {
        success: false,
        message: 'Too many messages sent. Please slow down.',
        code: 'MESSAGE_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
    // Remove keyGenerator completely - let express-rate-limit handle it
});

// Search rate limiter
export const searchLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // Limit each IP to 30 search requests per minute
    message: {
        success: false,
        message: 'Too many search requests. Please slow down.',
        code: 'SEARCH_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Admin rate limiter (more permissive)
export const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Higher limit for admin users
    message: {
        success: false,
        message: 'Admin rate limit exceeded.',
        code: 'ADMIN_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Custom rate limiter with database storage (for production)
export const createDatabaseRateLimiter = (options = {}) => {
    return async (req, res, next) => {
        const {
            windowMs = 15 * 60 * 1000,
            max = 100,
            message = 'Rate limit exceeded'
        } = options;

        // Simple key generation - use user ID or IP
        const key = req.user?.userId || req.ip;
        const now = new Date();
        const windowStart = new Date(now.getTime() - windowMs);

        try {
            // Clean up old records
            await pool.query(
                'DELETE FROM rate_limit_logs WHERE created_at < $1',
                [windowStart]
            );

            // Count requests in current window
            const countResult = await pool.query(
                'SELECT COUNT(*) FROM rate_limit_logs WHERE key = $1 AND created_at >= $2',
                [key, windowStart]
            );

            const count = parseInt(countResult.rows[0].count);

            if (count >= max) {
                return res.status(429).json({
                    success: false,
                    message,
                    retryAfter: Math.round(windowMs / 1000)
                });
            }

            // Log this request
            await pool.query(
                'INSERT INTO rate_limit_logs (key, created_at) VALUES ($1, $2)',
                [key, now]
            );

            // Add rate limit headers
            res.set({
                'X-RateLimit-Limit': max,
                'X-RateLimit-Remaining': Math.max(0, max - count - 1),
                'X-RateLimit-Reset': new Date(now.getTime() + windowMs)
            });

            next();
        } catch (error) {
            console.error('Database rate limiter error:', error);
            // Fall back to allowing the request if database fails
            next();
        }
    };
};

// Dynamic rate limiting based on user type
export const dynamicRateLimiter = (req, res, next) => {
    if (req.user?.role === 'admin') {
        return adminLimiter(req, res, next);
    } else if (req.path.includes('/auth/')) {
        return authLimiter(req, res, next);
    } else if (req.path.includes('/upload')) {
        return uploadLimiter(req, res, next);
    } else {
        return defaultLimiter(req, res, next);
    }
};

export default defaultLimiter;
