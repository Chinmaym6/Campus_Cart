// 

import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

// Main authentication middleware (enhanced version of your existing code)
const authenticateToken = async (req, res, next) => {
    try {
        // Get token from multiple sources (preserving your original logic + cookies)
        const authHeader = req.headers['authorization'];
        const cookieToken = req.cookies?.accessToken;
        const headerToken = authHeader && authHeader.split(' ')[1];
        
        // Prioritize cookie token for web app, fallback to header for API calls
        const token = cookieToken || headerToken;

        // Your original validation logic preserved
        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'Access token is missing or invalid',
                code: 'TOKEN_MISSING'
            });
        }

        // Enhanced JWT verification with specific error handling
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token has expired',
                    code: 'TOKEN_EXPIRED'
                });
            } else if (jwtError.name === 'JsonWebTokenError') {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid or expired token',
                    code: 'TOKEN_INVALID'
                });
            } else {
                return res.status(403).json({
                    success: false,
                    message: 'Token verification failed',
                    code: 'TOKEN_ERROR'
                });
            }
        }

        // Enhanced user fetching with comprehensive user data
        const userQuery = `
            SELECT u.id, u.email, u.first_name, u.last_name, u.role, 
                   u.status, u.email_verified, u.profile_picture_url,
                   u.university_id, un.name as university_name,
                   u.created_at, u.last_login
            FROM users u
            LEFT JOIN universities un ON u.university_id = un.id
            WHERE u.id = $1
        `;

        const userResult = await pool.query(userQuery, [decoded.userId || decoded.id]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        const user = userResult.rows[0];

        // Enhanced account status validation
        if (user.status === 'suspended') {
            return res.status(403).json({
                success: false,
                message: 'Account suspended. Contact support.',
                code: 'ACCOUNT_SUSPENDED'
            });
        }

        if (user.status === 'inactive') {
            return res.status(403).json({
                success: false,
                message: 'Account deactivated',
                code: 'ACCOUNT_INACTIVE'
            });
        }

        if (user.status === 'pending_verification') {
            return res.status(403).json({
                success: false,
                message: 'Please verify your email address',
                code: 'EMAIL_NOT_VERIFIED'
            });
        }

        // Enhanced user object (backward compatible with your existing code)
        req.user = {
            // Your original fields preserved
            id: user.id,
            userId: user.id,
            email: user.email,
            role: user.role,
            
            // Enhanced fields for frontend integration
            firstName: user.first_name,
            lastName: user.last_name,
            fullName: `${user.first_name} ${user.last_name}`,
            status: user.status,
            verified: user.email_verified,
            profilePicture: user.profile_picture_url,
            universityId: user.university_id,
            universityName: user.university_name,
            createdAt: user.created_at,
            lastLogin: user.last_login,
            
            // Helper properties
            isAdmin: user.role === 'admin',
            isModerator: user.role === 'moderator',
            isVerified: user.email_verified,
            hasProfilePicture: !!user.profile_picture_url
        };

        // Update last activity (async, don't wait)
        pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        ).catch(console.error);

        next();

    } catch (error) {
        console.error('Authentication middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during authentication',
            code: 'SERVER_ERROR'
        });
    }
};

// Optional authentication middleware (for public routes that benefit from user info)
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const cookieToken = req.cookies?.accessToken;
        const headerToken = authHeader && authHeader.split(' ')[1];
        const token = cookieToken || headerToken;

        if (!token) {
            return next(); // Continue without user info
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userResult = await pool.query(
            `SELECT id, email, first_name, last_name, role, status, email_verified, profile_picture_url
             FROM users WHERE id = $1 AND status = 'active'`,
            [decoded.userId || decoded.id]
        );

        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            req.user = {
                id: user.id,
                userId: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                verified: user.email_verified,
                profilePicture: user.profile_picture_url
            };
        }

        next();
    } catch (error) {
        // Continue without authentication if token is invalid
        next();
    }
};

// Refresh token validation
export const validateRefreshToken = async (req, res, next) => {
    try {
        const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token required',
                code: 'REFRESH_TOKEN_MISSING'
            });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
        
        const userResult = await pool.query(
            'SELECT id, email, role, status FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (userResult.rows.length === 0 || userResult.rows[0].status !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token',
                code: 'REFRESH_TOKEN_INVALID'
            });
        }

        req.user = {
            userId: userResult.rows[0].id,
            email: userResult.rows.email,
            role: userResult.rows.role
        };

        next();
    } catch (error) {
        console.error('Refresh token validation error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid or expired refresh token',
            code: 'REFRESH_TOKEN_ERROR'
        });
    }
};

// Legacy support function (exact copy of your original for backward compatibility)
export const legacyAuthenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token is missing or invalid' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }

        req.user = user; // Attach the user object to the request
        next();
    });
};

// Role-based authorization middleware
export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        next();
    };
};

// Email verification requirement
export const requireVerifiedEmail = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (!req.user.verified) {
        return res.status(403).json({
            success: false,
            message: 'Email verification required',
            code: 'EMAIL_NOT_VERIFIED'
        });
    }

    next();
};

// Check if user owns resource
export const requireOwnership = (resourceType) => {
    return async (req, res, next) => {
        try {
            const { id } = req.params;
            const userId = req.user.userId;

            let query;
            let ownerField;

            switch (resourceType) {
                case 'item':
                    query = 'SELECT seller_id FROM items WHERE id = $1';
                    ownerField = 'seller_id';
                    break;
                case 'roommate_post':
                    query = 'SELECT user_id FROM roommate_posts WHERE id = $1';
                    ownerField = 'user_id';
                    break;
                case 'review':
                    query = 'SELECT reviewer_id FROM reviews WHERE id = $1';
                    ownerField = 'reviewer_id';
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid resource type'
                    });
            }

            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Resource not found'
                });
            }

            if (result.rows[0][ownerField] !== userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to access this resource'
                });
            }

            next();
        } catch (error) {
            console.error('Ownership check error:', error);
            res.status(500).json({
                success: false,
                message: 'Error checking resource ownership'
            });
        }
    };
};

// Utility function to generate tokens
export const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { 
            userId: user.id, 
            email: user.email, 
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
};

export default authenticateToken;
