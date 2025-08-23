// admin/index.js - Admin route aggregator
import express from 'express';
import { requireAdmin, requireSuperAdmin } from '../../middleware/adminAuth.js';
import { pool } from '../../config/database.js';

const router = express.Router();

// Admin dashboard overview
router.get('/dashboard', requireAdmin, async (req, res) => {
    try {
        // Get basic statistics
        const statsQueries = [
            'SELECT COUNT(*) as total_users FROM users WHERE is_active = true',
            'SELECT COUNT(*) as total_items FROM items',
            'SELECT COUNT(*) as total_transactions FROM transactions WHERE status = \'completed\'',
            'SELECT COUNT(*) as pending_reports FROM reports WHERE status = \'pending\'',
            'SELECT COUNT(*) as total_universities FROM universities WHERE is_active = true'
        ];
        
        const results = await Promise.all(
            statsQueries.map(query => pool.query(query))
        );
        
        // Get recent activity
        const recentUsersQuery = `
            SELECT id, first_name, last_name, email, created_at
            FROM users
            WHERE created_at >= NOW() - INTERVAL '7 days'
            ORDER BY created_at DESC
            LIMIT 5
        `;
        
        const recentItemsQuery = `
            SELECT i.id, i.title, i.price, i.created_at, u.first_name || ' ' || u.last_name as seller_name
            FROM items i
            JOIN users u ON i.seller_id = u.id
            WHERE i.created_at >= NOW() - INTERVAL '7 days'
            ORDER BY i.created_at DESC
            LIMIT 5
        `;
        
        const recentReportsQuery = `
            SELECT r.id, r.reason, r.created_at, u.first_name || ' ' || u.last_name as reporter_name
            FROM reports r
            JOIN users u ON r.reporter_id = u.id
            WHERE r.created_at >= NOW() - INTERVAL '7 days'
            ORDER BY r.created_at DESC
            LIMIT 5
        `;
        
        const [recentUsers, recentItems, recentReports] = await Promise.all([
            pool.query(recentUsersQuery),
            pool.query(recentItemsQuery),
            pool.query(recentReportsQuery)
        ]);
        
        res.json({
            success: true,
            dashboard: {
                stats: {
                    totalUsers: parseInt(results[0].rows[0].total_users),
                    totalItems: parseInt(results[1].rows[0].total_items),
                    totalTransactions: parseInt(results[2].rows[0].total_transactions),
                    pendingReports: parseInt(results[3].rows[0].pending_reports),
                    totalUniversities: parseInt(results[4].rows[0].total_universities)
                },
                recentActivity: {
                    users: recentUsers.rows,
                    items: recentItems.rows,
                    reports: recentReports.rows
                }
            }
        });
    } catch (error) {
        console.error('Error fetching admin dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch admin dashboard'
        });
    }
});

// Get all admin users (Super Admin only)
router.get('/admins', requireSuperAdmin, async (req, res) => {
    try {
        const query = `
            SELECT 
                id, first_name, last_name, email, role, 
                permissions, is_active, created_at, last_login
            FROM users 
            WHERE role IN ('admin', 'super_admin')
            ORDER BY created_at DESC
        `;
        
        const result = await pool.query(query);
        
        res.json({
            success: true,
            admins: result.rows
        });
    } catch (error) {
        console.error('Error fetching admin users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch admin users'
        });
    }
});

// Create new admin (Super Admin only)
router.post('/admins', requireSuperAdmin, async (req, res) => {
    try {
        const { email, firstName, lastName, permissions = [] } = req.body;
        
        if (!email || !firstName || !lastName) {
            return res.status(400).json({
                success: false,
                message: 'Email, first name, and last name are required'
            });
        }
        
        // Check if user already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }
        
        // Create admin user
        const insertQuery = `
            INSERT INTO users (
                email, first_name, last_name, role, permissions, 
                is_active, email_verified, created_at, updated_at
            ) VALUES ($1, $2, $3, 'admin', $4, true, true, NOW(), NOW())
            RETURNING id, email, first_name, last_name, role, permissions, is_active, created_at
        `;
        
        const result = await pool.query(insertQuery, [
            email, firstName, lastName, JSON.stringify(permissions)
        ]);
        
        res.status(201).json({
            success: true,
            message: 'Admin user created successfully',
            admin: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating admin user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create admin user'
        });
    }
});

// Update admin permissions (Super Admin only)
router.patch('/admins/:id', requireSuperAdmin, async (req, res) => {
    try {
        const adminId = req.params.id;
        const { permissions, isActive } = req.body;
        
        const updateQuery = `
            UPDATE users 
            SET 
                permissions = COALESCE($1, permissions),
                is_active = COALESCE($2, is_active),
                updated_at = NOW()
            WHERE id = $3 AND role IN ('admin', 'super_admin')
            RETURNING id, email, first_name, last_name, role, permissions, is_active
        `;
        
        const result = await pool.query(updateQuery, [
            permissions ? JSON.stringify(permissions) : null,
            isActive,
            adminId
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Admin user not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Admin user updated successfully',
            admin: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating admin user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update admin user'
        });
    }
});

// Delete admin (Super Admin only)
router.delete('/admins/:id', requireSuperAdmin, async (req, res) => {
    try {
        const adminId = req.params.id;
        const currentAdminId = req.user.id;
        
        // Prevent self-deletion
        if (adminId === currentAdminId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own admin account'
            });
        }
        
        const deleteQuery = `
            DELETE FROM users 
            WHERE id = $1 AND role IN ('admin', 'super_admin')
            RETURNING email, first_name, last_name
        `;
        
        const result = await pool.query(deleteQuery, [adminId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Admin user not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Admin user deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting admin user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete admin user'
        });
    }
});

// Get system settings (Admin only)
router.get('/settings', requireAdmin, async (req, res) => {
    try {
        const query = 'SELECT * FROM system_settings ORDER BY key';
        const result = await pool.query(query);
        
        // Convert to key-value object
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = {
                value: row.value,
                description: row.description,
                updated_at: row.updated_at
            };
        });
        
        res.json({
            success: true,
            settings
        });
    } catch (error) {
        console.error('Error fetching system settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch system settings'
        });
    }
});

// Update system settings (Super Admin only)
router.patch('/settings', requireSuperAdmin, async (req, res) => {
    try {
        const { settings } = req.body;
        
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Settings object is required'
            });
        }
        
        const updatePromises = Object.entries(settings).map(([key, value]) => {
            const query = `
                INSERT INTO system_settings (key, value, updated_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (key) 
                DO UPDATE SET value = $2, updated_at = NOW()
            `;
            return pool.query(query, [key, value]);
        });
        
        await Promise.all(updatePromises);
        
        res.json({
            success: true,
            message: 'System settings updated successfully'
        });
    } catch (error) {
        console.error('Error updating system settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update system settings'
        });
    }
});

// Get audit logs (Admin only)
router.get('/audit-logs', requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50, action, userId } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let query = `
            SELECT 
                al.*,
                u.first_name || ' ' || u.last_name as user_name,
                u.email as user_email
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE 1=1
        `;
        
        const queryParams = [];
        let paramCount = 0;
        
        if (action) {
            paramCount++;
            query += ` AND al.action = $${paramCount}`;
            queryParams.push(action);
        }
        
        if (userId) {
            paramCount++;
            query += ` AND al.user_id = $${paramCount}`;
            queryParams.push(userId);
        }
        
        query += ' ORDER BY al.created_at DESC';
        
        // Add pagination
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        queryParams.push(parseInt(limit));
        
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        queryParams.push(offset);
        
        const result = await pool.query(query, queryParams);
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM audit_logs WHERE 1=1';
        const countParams = [];
        let countParamCount = 0;
        
        if (action) {
            countParamCount++;
            countQuery += ` AND action = $${countParamCount}`;
            countParams.push(action);
        }
        
        if (userId) {
            countParamCount++;
            countQuery += ` AND user_id = $${countParamCount}`;
            countParams.push(userId);
        }
        
        const countResult = await pool.query(countQuery, countParams);
        const totalLogs = parseInt(countResult.rows[0].count);
        
        res.json({
            success: true,
            logs: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalLogs,
                pages: Math.ceil(totalLogs / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit logs'
        });
    }
});

export default router;