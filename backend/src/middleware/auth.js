import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { pool } from '../config/database.js';
import crypto from 'crypto';
import { sendVerificationEmail } from '../utils/emailService.js';
import rateLimit from 'express-rate-limit';

// Optional auth middleware that doesn't require authentication
export const optionalAuth = async (req, res, next) => {
    try {
        // Get token from multiple sources
        const authHeader = req.headers['authorization'];
        const cookieToken = req.cookies?.accessToken;
        const headerToken = authHeader && authHeader.split(' ')[1];
        
        const token = cookieToken || headerToken;

        if (!token) {
            // No token, but that's okay - continue as unauthenticated
            req.user = null;
            return next();
        }

        // Verify token
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Check if user exists
            const userQuery = 'SELECT id, email, role, status FROM users WHERE id = $1';
            const userResult = await pool.query(userQuery, [decoded.id]);

            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                req.user = {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    status: user.status
                };
            } else {
                req.user = null;
            }
        } catch (err) {
            // Invalid token, but that's okay for optional auth
            req.user = null;
        }
        
        next();
    } catch (error) {
        req.user = null;
        next();
    }
};

// Main authentication middleware
export const authMiddleware = async (req, res, next) => {
    try {
        // Get token from multiple sources
        const authHeader = req.headers['authorization'];
        const cookieToken = req.cookies?.accessToken;
        const headerToken = authHeader && authHeader.split(' ')[1];
        
        const token = cookieToken || headerToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user exists and is active
        const userQuery = 'SELECT id, email, role, status FROM users WHERE id = $1';
        const userResult = await pool.query(userQuery, [decoded.id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = userResult.rows[0];

        // Check if user is active
        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Account is not active'
            });
        }

        // Add user info to request
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
        
        console.error('Authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error during authentication'
        });
    }
};

// Resource ownership check middleware
export const checkResourceOwnership = (resourceType, resourceIdParam, ownerField) => {
    return async (req, res, next) => {
        try {
            // Get resource ID from params
            const resourceId = req.params[resourceIdParam];
            
            if (!resourceId) {
                return res.status(400).json({
                    success: false,
                    message: `${resourceType} ID is required`
                });
            }

            // Get user ID from authenticated user
            const userId = req.user.id;
            
            // Query to check if resource exists and belongs to user
            const query = `SELECT * FROM ${resourceType} WHERE id = $1`;
            const result = await pool.query(query, [resourceId]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: `${resourceType} not found`
                });
            }

            // Allow if user is owner or admin
            if (result.rows[0][ownerField] === userId || req.user.role === 'admin') {
                next();
            } else {
                res.status(403).json({
                    success: false,
                    message: 'Not authorized to access this resource'
                });
            }

        } catch (error) {
            console.error('Resource ownership check error:', error);
            res.status(500).json({
                success: false,
                message: 'Error checking resource ownership'
            });
        }
    };
};

// Enhanced route for resend verification
export const enhancedResendVerification = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "Email address is required"
        });
    }

    try {
        const userResult = await pool.query(
            "SELECT id, first_name, email, email_verified FROM users WHERE email = $1",
            [email]
        );

        const user = userResult.rows[0];

        if (!user) {
            return res.json({
                success: true,
                message: "If an account with that email exists, we've sent a verification link."
            });
        }

        if (user.email_verified) {
            return res.json({
                success: true,
                message: "Your email is already verified. You can log in."
            });
        }

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        
        // Store token in database
        await pool.query(
            "UPDATE users SET email_verification_token = $1, token_expiry = $2 WHERE id = $3",
            [verificationToken, new Date(Date.now() + 24 * 60 * 60 * 1000), user.id]
        );

        // Send verification email
        await sendVerificationEmail(user.email, user.first_name, verificationToken);

        return res.json({
            success: true,
            message: "Verification email sent. Please check your inbox."
        });

    } catch (error) {
        console.error('Error resending verification email:', error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while processing your request."
        });
    }
};

// Export other middleware functions as needed
export {
    authMiddleware as auth,
    // Add any additional exports here
};
