// analytics.js - Routes for analytics and reporting
import express from 'express';
import { pool } from '../config/database.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// Get dashboard overview stats
router.get('/dashboard', requireAdmin, async (req, res) => {
    try {
        const { timeframe = '30' } = req.query; // days
        const days = parseInt(timeframe);
        
        // Get total counts
        const totalUsersQuery = 'SELECT COUNT(*) as count FROM users WHERE is_active = true';
        const totalItemsQuery = 'SELECT COUNT(*) as count FROM items';
        const totalTransactionsQuery = 'SELECT COUNT(*) as count FROM transactions WHERE status = \'completed\'';
        const totalRevenueQuery = 'SELECT SUM(amount) as total FROM transactions WHERE status = \'completed\'';
        
        // Get recent activity (last N days)
        const recentUsersQuery = `
            SELECT COUNT(*) as count 
            FROM users 
            WHERE created_at >= NOW() - INTERVAL '${days} days'
        `;
        
        const recentItemsQuery = `
            SELECT COUNT(*) as count 
            FROM items 
            WHERE created_at >= NOW() - INTERVAL '${days} days'
        `;
        
        const recentTransactionsQuery = `
            SELECT COUNT(*) as count 
            FROM transactions 
            WHERE created_at >= NOW() - INTERVAL '${days} days' AND status = 'completed'
        `;
        
        const recentRevenueQuery = `
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM transactions 
            WHERE created_at >= NOW() - INTERVAL '${days} days' AND status = 'completed'
        `;
        
        // Execute all queries
        const [totalUsers, totalItems, totalTransactions, totalRevenue, recentUsers, recentItems, recentTransactions, recentRevenue] = await Promise.all([
            pool.query(totalUsersQuery),
            pool.query(totalItemsQuery),
            pool.query(totalTransactionsQuery),
            pool.query(totalRevenueQuery),
            pool.query(recentUsersQuery),
            pool.query(recentItemsQuery),
            pool.query(recentTransactionsQuery),
            pool.query(recentRevenueQuery)
        ]);
        
        res.json({
            success: true,
            data: {
                totals: {
                    users: parseInt(totalUsers.rows[0].count),
                    items: parseInt(totalItems.rows[0].count),
                    transactions: parseInt(totalTransactions.rows[0].count),
                    revenue: parseFloat(totalRevenue.rows[0].total || 0)
                },
                recent: {
                    users: parseInt(recentUsers.rows[0].count),
                    items: parseInt(recentItems.rows[0].count),
                    transactions: parseInt(recentTransactions.rows[0].count),
                    revenue: parseFloat(recentRevenue.rows[0].total || 0)
                },
                timeframe: days
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard analytics'
        });
    }
});

// Get user analytics
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const { timeframe = '30' } = req.query;
        const days = parseInt(timeframe);
        
        // User registration trends
        const registrationTrendsQuery = `
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as registrations
            FROM users
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY DATE(created_at)
            ORDER BY date
        `;
        
        // User activity stats
        const activeUsersQuery = `
            SELECT COUNT(DISTINCT user_id) as count
            FROM (
                SELECT seller_id as user_id FROM items WHERE created_at >= NOW() - INTERVAL '${days} days'
                UNION
                SELECT buyer_id as user_id FROM transactions WHERE created_at >= NOW() - INTERVAL '${days} days'
                UNION
                SELECT sender_id as user_id FROM messages WHERE created_at >= NOW() - INTERVAL '${days} days'
            ) active_users
        `;
        
        // Top users by items sold
        const topSellersQuery = `
            SELECT 
                u.first_name || ' ' || u.last_name as name,
                u.email,
                COUNT(i.id) as items_count,
                COALESCE(SUM(t.amount), 0) as total_revenue
            FROM users u
            LEFT JOIN items i ON u.id = i.seller_id
            LEFT JOIN transactions t ON i.id = t.item_id AND t.status = 'completed'
            WHERE i.created_at >= NOW() - INTERVAL '${days} days' OR i.created_at IS NULL
            GROUP BY u.id, u.first_name, u.last_name, u.email
            HAVING COUNT(i.id) > 0
            ORDER BY items_count DESC, total_revenue DESC
            LIMIT 10
        `;
        
        const [registrationTrends, activeUsers, topSellers] = await Promise.all([
            pool.query(registrationTrendsQuery),
            pool.query(activeUsersQuery),
            pool.query(topSellersQuery)
        ]);
        
        res.json({
            success: true,
            data: {
                registrationTrends: registrationTrends.rows,
                activeUsers: parseInt(activeUsers.rows[0].count),
                topSellers: topSellers.rows,
                timeframe: days
            }
        });
    } catch (error) {
        console.error('Error fetching user analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user analytics'
        });
    }
});

// Get item analytics
router.get('/items', requireAdmin, async (req, res) => {
    try {
        const { timeframe = '30' } = req.query;
        const days = parseInt(timeframe);
        
        // Items by category
        const itemsByCategoryQuery = `
            SELECT 
                c.name as category,
                COUNT(i.id) as count
            FROM categories c
            LEFT JOIN items i ON c.id = i.category_id 
                AND i.created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY c.id, c.name
            ORDER BY count DESC
        `;
        
        // Items by status
        const itemsByStatusQuery = `
            SELECT 
                status,
                COUNT(*) as count
            FROM items
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY status
        `;
        
        // Items by condition
        const itemsByConditionQuery = `
            SELECT 
                condition,
                COUNT(*) as count
            FROM items
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY condition
        `;
        
        // Average price by category
        const avgPriceByCategoryQuery = `
            SELECT 
                c.name as category,
                AVG(i.price) as avg_price,
                COUNT(i.id) as item_count
            FROM categories c
            LEFT JOIN items i ON c.id = i.category_id 
                AND i.created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY c.id, c.name
            HAVING COUNT(i.id) > 0
            ORDER BY avg_price DESC
        `;
        
        const [itemsByCategory, itemsByStatus, itemsByCondition, avgPriceByCategory] = await Promise.all([
            pool.query(itemsByCategoryQuery),
            pool.query(itemsByStatusQuery),
            pool.query(itemsByConditionQuery),
            pool.query(avgPriceByCategoryQuery)
        ]);
        
        res.json({
            success: true,
            data: {
                itemsByCategory: itemsByCategory.rows,
                itemsByStatus: itemsByStatus.rows,
                itemsByCondition: itemsByCondition.rows,
                avgPriceByCategory: avgPriceByCategory.rows,
                timeframe: days
            }
        });
    } catch (error) {
        console.error('Error fetching item analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch item analytics'
        });
    }
});

// Get transaction analytics
router.get('/transactions', requireAdmin, async (req, res) => {
    try {
        const { timeframe = '30' } = req.query;
        const days = parseInt(timeframe);
        
        // Transaction trends
        const transactionTrendsQuery = `
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as transaction_count,
                SUM(amount) as total_amount
            FROM transactions
            WHERE created_at >= NOW() - INTERVAL '${days} days' AND status = 'completed'
            GROUP BY DATE(created_at)
            ORDER BY date
        `;
        
        // Transactions by status
        const transactionsByStatusQuery = `
            SELECT 
                status,
                COUNT(*) as count,
                SUM(amount) as total_amount
            FROM transactions
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY status
        `;
        
        // Revenue by category
        const revenueByCategoryQuery = `
            SELECT 
                c.name as category,
                COUNT(t.id) as transaction_count,
                SUM(t.amount) as total_revenue
            FROM transactions t
            JOIN items i ON t.item_id = i.id
            JOIN categories c ON i.category_id = c.id
            WHERE t.created_at >= NOW() - INTERVAL '${days} days' AND t.status = 'completed'
            GROUP BY c.id, c.name
            ORDER BY total_revenue DESC
        `;
        
        const [transactionTrends, transactionsByStatus, revenueByCategory] = await Promise.all([
            pool.query(transactionTrendsQuery),
            pool.query(transactionsByStatusQuery),
            pool.query(revenueByCategoryQuery)
        ]);
        
        res.json({
            success: true,
            data: {
                transactionTrends: transactionTrends.rows,
                transactionsByStatus: transactionsByStatus.rows,
                revenueByCategory: revenueByCategory.rows,
                timeframe: days
            }
        });
    } catch (error) {
        console.error('Error fetching transaction analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transaction analytics'
        });
    }
});

// Get reports and issues analytics
router.get('/reports', requireAdmin, async (req, res) => {
    try {
        const { timeframe = '30' } = req.query;
        const days = parseInt(timeframe);
        
        // Reports by status
        const reportsByStatusQuery = `
            SELECT 
                status,
                COUNT(*) as count
            FROM reports
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY status
        `;
        
        // Reports by reason
        const reportsByReasonQuery = `
            SELECT 
                reason,
                COUNT(*) as count
            FROM reports
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY reason
            ORDER BY count DESC
        `;
        
        // Recent reports
        const recentReportsQuery = `
            SELECT 
                r.*,
                reporter.first_name || ' ' || reporter.last_name as reporter_name,
                CASE 
                    WHEN r.reported_item_id IS NOT NULL THEN i.title
                    ELSE reported_user.first_name || ' ' || reported_user.last_name
                END as reported_subject
            FROM reports r
            JOIN users reporter ON r.reporter_id = reporter.id
            LEFT JOIN items i ON r.reported_item_id = i.id
            LEFT JOIN users reported_user ON r.reported_user_id = reported_user.id
            WHERE r.created_at >= NOW() - INTERVAL '${days} days'
            ORDER BY r.created_at DESC
            LIMIT 10
        `;
        
        const [reportsByStatus, reportsByReason, recentReports] = await Promise.all([
            pool.query(reportsByStatusQuery),
            pool.query(reportsByReasonQuery),
            pool.query(recentReportsQuery)
        ]);
        
        res.json({
            success: true,
            data: {
                reportsByStatus: reportsByStatus.rows,
                reportsByReason: reportsByReason.rows,
                recentReports: recentReports.rows,
                timeframe: days
            }
        });
    } catch (error) {
        console.error('Error fetching reports analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reports analytics'
        });
    }
});

// Export analytics data
router.get('/export', requireAdmin, async (req, res) => {
    try {
        const { type, timeframe = '30' } = req.query;
        const days = parseInt(timeframe);
        
        let query;
        let filename;
        
        switch (type) {
            case 'users':
                query = `
                    SELECT 
                        u.id,
                        u.first_name,
                        u.last_name,
                        u.email,
                        u.location,
                        u.created_at,
                        u.is_active,
                        COUNT(i.id) as items_posted,
                        COUNT(t.id) as transactions_completed
                    FROM users u
                    LEFT JOIN items i ON u.id = i.seller_id
                    LEFT JOIN transactions t ON u.id = t.buyer_id AND t.status = 'completed'
                    WHERE u.created_at >= NOW() - INTERVAL '${days} days'
                    GROUP BY u.id
                    ORDER BY u.created_at DESC
                `;
                filename = `users_export_${days}days.csv`;
                break;
                
            case 'items':
                query = `
                    SELECT 
                        i.*,
                        u.first_name || ' ' || u.last_name as seller_name,
                        c.name as category_name
                    FROM items i
                    JOIN users u ON i.seller_id = u.id
                    LEFT JOIN categories c ON i.category_id = c.id
                    WHERE i.created_at >= NOW() - INTERVAL '${days} days'
                    ORDER BY i.created_at DESC
                `;
                filename = `items_export_${days}days.csv`;
                break;
                
            case 'transactions':
                query = `
                    SELECT 
                        t.*,
                        buyer.first_name || ' ' || buyer.last_name as buyer_name,
                        seller.first_name || ' ' || seller.last_name as seller_name,
                        i.title as item_title
                    FROM transactions t
                    JOIN users buyer ON t.buyer_id = buyer.id
                    JOIN items i ON t.item_id = i.id
                    JOIN users seller ON i.seller_id = seller.id
                    WHERE t.created_at >= NOW() - INTERVAL '${days} days'
                    ORDER BY t.created_at DESC
                `;
                filename = `transactions_export_${days}days.csv`;
                break;
                
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid export type. Use: users, items, or transactions'
                });
        }
        
        const result = await pool.query(query);
        
        // Convert to CSV format
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No data found for the specified timeframe'
            });
        }
        
        const headers = Object.keys(result.rows[0]);
        const csvContent = [
            headers.join(','),
            ...result.rows.map(row => 
                headers.map(header => {
                    const value = row[header];
                    // Escape commas and quotes in CSV
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value || '';
                }).join(',')
            )
        ].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
    } catch (error) {
        console.error('Error exporting analytics data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export analytics data'
        });
    }
});

export default router;