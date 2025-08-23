// adminAuth.js - Admin authentication middleware
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

// Admin authentication middleware
const adminMiddleware = async (req, res, next) => {
    try {
        // Check if user is authenticated (should be done by authMiddleware first)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userId = req.user.id;

        // Check if user exists and is an admin
        const userQuery = 'SELECT id, email, role, is_admin, status FROM users WHERE id = $1';
        const userResult = await pool.query(userQuery, [userId]);

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

        // Check if user has admin privileges
        if (!user.is_admin && user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        // Add admin info to request
        req.admin = {
            id: user.id,
            email: user.email,
            role: user.role,
            is_admin: user.is_admin
        };

        next();
    } catch (error) {
        console.error('Admin authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error during admin authentication'
        });
    }
};

// Super admin middleware - requires higher level admin access
const superAdminMiddleware = async (req, res, next) => {
    try {
        // Check if user is authenticated and an admin (should be done by adminMiddleware first)
        if (!req.admin) {
            return res.status(401).json({
                success: false,
                message: 'Admin authentication required'
            });
        }

        // Check if user has super admin role
        if (req.admin.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Super admin access required'
            });
        }

        next();
    } catch (error) {
        console.error('Super admin authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error during super admin authentication'
            });
    }
};

// Check admin permissions for specific resources
const checkAdminPermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            // Check if user is authenticated and an admin
            if (!req.admin) {
                return res.status(401).json({
                    success: false,
                    message: 'Admin authentication required'
                });
            }

            // Super admins have all permissions
            if (req.admin.role === 'super_admin') {
                return next();
            }

            // Check if admin has the required permission
            const permissionQuery = `
                SELECT COUNT(*) FROM admin_permissions 
                WHERE admin_id = $1 AND permission = $2
            `;
            const permissionResult = await pool.query(permissionQuery, [req.admin.id, requiredPermission]);

            if (parseInt(permissionResult.rows[0].count) > 0) {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: `Permission denied: ${requiredPermission} access required`
            });
        } catch (error) {
            console.error('Admin permission check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error during permission check'
            });
        }
    };
};

// Export all middleware functions
export {
    adminMiddleware,
    superAdminMiddleware,
    checkAdminPermission,
    adminMiddleware as requireAdmin,
    superAdminMiddleware as requireSuperAdmin
};