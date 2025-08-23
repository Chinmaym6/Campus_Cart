// cronJobs.js - Scheduled tasks and background jobs
import cron from 'node-cron';
import { pool } from '../config/database.js';
import { cleanupTempFiles } from './fileSystem.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize all cron jobs
 */
export const initializeCronJobs = () => {
    console.log('Initializing cron jobs...');
    
    // Clean up expired items every day at 2 AM
    cron.schedule('0 2 * * *', async () => {
        console.log('Running expired items cleanup...');
        await cleanupExpiredItems();
    });
    
    // Clean up old notifications every week on Sunday at 3 AM
    cron.schedule('0 3 * * 0', async () => {
        console.log('Running old notifications cleanup...');
        await cleanupOldNotifications();
    });
    
    // Clean up temporary files every hour
    cron.schedule('0 * * * *', async () => {
        console.log('Running temp files cleanup...');
        await cleanupTempFilesJob();
    });
    
    // Update item view statistics every 6 hours
    cron.schedule('0 */6 * * *', async () => {
        console.log('Updating item statistics...');
        await updateItemStatistics();
    });
    
    // Clean up old audit logs every month on the 1st at 4 AM
    cron.schedule('0 4 1 * *', async () => {
        console.log('Running audit logs cleanup...');
        await cleanupOldAuditLogs();
    });
    
    // Send reminder notifications for pending transactions every day at 10 AM
    cron.schedule('0 10 * * *', async () => {
        console.log('Sending transaction reminders...');
        await sendTransactionReminders();
    });
    
    console.log('✓ Cron jobs initialized successfully');
};

/**
 * Clean up inactive items (items that have been inactive for too long)
 */
const cleanupExpiredItems = async () => {
    try {
        const expirationDays = 90; // Items expire after 90 days of inactivity
        
        const query = `
            UPDATE items 
            SET status = 'inactive', updated_at = NOW()
            WHERE status = 'available' 
            AND updated_at < NOW() - INTERVAL '${expirationDays} days'
        `;
        
        const result = await pool.query(query);
        console.log(`✓ Marked ${result.rowCount} inactive items as inactive`);
        
        // Log the cleanup action
        await logCleanupAction('inactive_items_cleanup', {
            inactive_count: result.rowCount,
            inactivity_days: expirationDays
        });
    } catch (error) {
        console.error('Error cleaning up expired items:', error);
    }
};

/**
 * Clean up old notifications (older than 30 days and read)
 */
const cleanupOldNotifications = async () => {
    try {
        const retentionDays = 30;
        
        const query = `
            DELETE FROM notifications 
            WHERE is_read = true 
            AND created_at < NOW() - INTERVAL '${retentionDays} days'
        `;
        
        const result = await pool.query(query);
        console.log(`✓ Cleaned up ${result.rowCount} old notifications`);
        
        await logCleanupAction('old_notifications_cleanup', {
            deleted_count: result.rowCount,
            retention_days: retentionDays
        });
    } catch (error) {
        console.error('Error cleaning up old notifications:', error);
    }
};

/**
 * Clean up temporary files
 */
const cleanupTempFilesJob = async () => {
    try {
        const tempDir = path.join(process.cwd(), 'temp');
        const maxAge = 60 * 60 * 1000; // 1 hour
        
        const cleanedCount = await cleanupTempFiles(tempDir, maxAge);
        
        if (cleanedCount > 0) {
            console.log(`✓ Cleaned up ${cleanedCount} temporary files`);
            
            await logCleanupAction('temp_files_cleanup', {
                cleaned_count: cleanedCount,
                max_age_hours: maxAge / (60 * 60 * 1000)
            });
        }
    } catch (error) {
        console.error('Error cleaning up temporary files:', error);
    }
};

/**
 * Update item statistics and analytics
 */
const updateItemStatistics = async () => {
    try {
        // Update popular categories based on recent activity
        const categoryStatsQuery = `
            WITH category_stats AS (
                SELECT 
                    c.id,
                    COUNT(i.id) as item_count,
                    AVG(i.views) as avg_views,
                    COUNT(t.id) as transaction_count
                FROM categories c
                LEFT JOIN items i ON c.id = i.category_id AND i.created_at > NOW() - INTERVAL '30 days'
                LEFT JOIN transactions t ON i.id = t.item_id AND t.created_at > NOW() - INTERVAL '30 days'
                GROUP BY c.id
            )
            UPDATE categories 
            SET updated_at = NOW()
            FROM category_stats cs
            WHERE categories.id = cs.id
        `;
        
        await pool.query(categoryStatsQuery);
        
        // Update user activity scores
        const userActivityQuery = `
            WITH user_activity AS (
                SELECT 
                    u.id,
                    COUNT(DISTINCT i.id) as items_posted,
                    COUNT(DISTINCT t.id) as transactions_completed,
                    COUNT(DISTINCT m.id) as messages_sent
                FROM users u
                LEFT JOIN items i ON u.id = i.seller_id AND i.created_at > NOW() - INTERVAL '30 days'
                LEFT JOIN transactions t ON (u.id = t.buyer_id OR u.id = t.seller_id) 
                    AND t.status = 'completed' AND t.created_at > NOW() - INTERVAL '30 days'
                LEFT JOIN messages m ON u.id = m.sender_id AND m.created_at > NOW() - INTERVAL '30 days'
                GROUP BY u.id
            )
            UPDATE users 
            SET updated_at = NOW()
            FROM user_activity ua
            WHERE users.id = ua.id
        `;
        
        await pool.query(userActivityQuery);
        
        console.log('✓ Updated item and user statistics');
        
        await logCleanupAction('statistics_update', {
            updated_at: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating item statistics:', error);
    }
};

/**
 * Clean up old audit logs (older than 1 year)
 */
const cleanupOldAuditLogs = async () => {
    try {
        const retentionDays = 365;
        
        const query = `
            DELETE FROM audit_logs 
            WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
        `;
        
        const result = await pool.query(query);
        console.log(`✓ Cleaned up ${result.rowCount} old audit logs`);
        
        await logCleanupAction('audit_logs_cleanup', {
            deleted_count: result.rowCount,
            retention_days: retentionDays
        });
    } catch (error) {
        console.error('Error cleaning up old audit logs:', error);
    }
};

/**
 * Send reminder notifications for pending transactions
 */
const sendTransactionReminders = async () => {
    try {
        // Find transactions that are pending for more than 24 hours
        const query = `
            SELECT 
                t.id,
                t.buyer_id,
                t.seller_id,
                i.title as item_title,
                u1.first_name || ' ' || u1.last_name as buyer_name,
                u2.first_name || ' ' || u2.last_name as seller_name
            FROM transactions t
            JOIN items i ON t.item_id = i.id
            JOIN users u1 ON t.buyer_id = u1.id
            JOIN users u2 ON t.seller_id = u2.id
            WHERE t.status = 'pending'
            AND t.created_at < NOW() - INTERVAL '24 hours'
            AND t.created_at > NOW() - INTERVAL '48 hours'
        `;
        
        const result = await pool.query(query);
        
        for (const transaction of result.rows) {
            // Create reminder notifications
            const buyerNotificationQuery = `
                INSERT INTO notifications (user_id, title, message, type, data)
                VALUES ($1, $2, $3, $4, $5)
            `;
            
            const sellerNotificationQuery = `
                INSERT INTO notifications (user_id, title, message, type, data)
                VALUES ($1, $2, $3, $4, $5)
            `;
            
            // Notify buyer
            await pool.query(buyerNotificationQuery, [
                transaction.buyer_id,
                'Transaction Reminder',
                `Don't forget about your pending transaction for "${transaction.item_title}". Please complete the transaction or contact the seller.`,
                'transaction_reminder',
                JSON.stringify({ transaction_id: transaction.id, type: 'buyer' })
            ]);
            
            // Notify seller
            await pool.query(sellerNotificationQuery, [
                transaction.seller_id,
                'Transaction Reminder',
                `You have a pending transaction for "${transaction.item_title}" with ${transaction.buyer_name}. Please follow up if needed.`,
                'transaction_reminder',
                JSON.stringify({ transaction_id: transaction.id, type: 'seller' })
            ]);
        }
        
        if (result.rows.length > 0) {
            console.log(`✓ Sent ${result.rows.length * 2} transaction reminder notifications`);
            
            await logCleanupAction('transaction_reminders', {
                transactions_count: result.rows.length,
                notifications_sent: result.rows.length * 2
            });
        }
    } catch (error) {
        console.error('Error sending transaction reminders:', error);
    }
};

/**
 * Log cleanup actions for audit purposes
 */
const logCleanupAction = async (action, data) => {
    try {
        const query = `
            INSERT INTO audit_logs (action, resource_type, new_values, created_at)
            VALUES ($1, 'system', $2, NOW())
        `;
        
        await pool.query(query, [action, JSON.stringify(data)]);
    } catch (error) {
        console.error('Error logging cleanup action:', error);
    }
};

/**
 * Stop all cron jobs (useful for graceful shutdown)
 */
export const stopCronJobs = () => {
    console.log('Stopping all cron jobs...');
    cron.getTasks().forEach((task, name) => {
        task.stop();
        console.log(`✓ Stopped cron job: ${name}`);
    });
};

/**
 * Get status of all cron jobs
 */
export const getCronJobsStatus = () => {
    const tasks = cron.getTasks();
    const status = [];
    
    tasks.forEach((task, name) => {
        status.push({
            name,
            running: task.running || false,
            scheduled: true
        });
    });
    
    return status;
};

/**
 * Manual cleanup trigger (for admin use)
 */
export const runManualCleanup = async (type) => {
    console.log(`Running manual cleanup: ${type}`);
    
    switch (type) {
        case 'expired_items':
            await cleanupExpiredItems();
            break;
        case 'old_notifications':
            await cleanupOldNotifications();
            break;
        case 'temp_files':
            await cleanupTempFilesJob();
            break;
        case 'statistics':
            await updateItemStatistics();
            break;
        case 'audit_logs':
            await cleanupOldAuditLogs();
            break;
        case 'transaction_reminders':
            await sendTransactionReminders();
            break;
        case 'all':
            await cleanupExpiredItems();
            await cleanupOldNotifications();
            await cleanupTempFilesJob();
            await updateItemStatistics();
            await cleanupOldAuditLogs();
            await sendTransactionReminders();
            break;
        default:
            throw new Error(`Unknown cleanup type: ${type}`);
    }
    
    console.log(`✓ Manual cleanup completed: ${type}`);
};

// Export setupCronJobs as an alias for initializeCronJobs for backward compatibility
export const setupCronJobs = initializeCronJobs;

export default {
    initializeCronJobs,
    setupCronJobs,
    stopCronJobs,
    getCronJobsStatus,
    runManualCleanup
};