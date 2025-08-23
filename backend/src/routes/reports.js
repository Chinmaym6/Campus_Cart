// reports.js - Routes for report management
import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// Create a new report
router.post('/', async (req, res) => {
    try {
        const { reportedItemId, reportedUserId, reason, description } = req.body;
        const reporterId = req.user.id;
        
        if (!reportedItemId && !reportedUserId) {
            return res.status(400).json({
                success: false,
                message: 'Either reported item ID or reported user ID is required'
            });
        }
        
        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Reason is required'
            });
        }
        
        // Check if user has already reported this item/user
        let existingQuery;
        let existingParams;
        
        if (reportedItemId) {
            existingQuery = 'SELECT id FROM reports WHERE reporter_id = $1 AND reported_item_id = $2';
            existingParams = [reporterId, reportedItemId];
        } else {
            existingQuery = 'SELECT id FROM reports WHERE reporter_id = $1 AND reported_user_id = $2';
            existingParams = [reporterId, reportedUserId];
        }
        
        const existingResult = await pool.query(existingQuery, existingParams);
        
        if (existingResult.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You have already reported this item/user'
            });
        }
        
        // Create the report
        const insertQuery = `
            INSERT INTO reports (
                reporter_id, reported_item_id, reported_user_id, 
                reason, description, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
            RETURNING *
        `;
        
        const insertParams = [reporterId, reportedItemId || null, reportedUserId || null, reason, description || null];
        const result = await pool.query(insertQuery, insertParams);
        
        res.status(201).json({
            success: true,
            message: 'Report submitted successfully',
            report: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit report'
        });
    }
});

// Get user's reports
router.get('/my-reports', async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        const query = `
            SELECT 
                r.*,
                CASE 
                    WHEN r.reported_item_id IS NOT NULL THEN i.title
                    ELSE u.first_name || ' ' || u.last_name
                END as reported_subject,
                CASE 
                    WHEN r.reported_item_id IS NOT NULL THEN 'item'
                    ELSE 'user'
                END as report_type
            FROM reports r
            LEFT JOIN items i ON r.reported_item_id = i.id
            LEFT JOIN users u ON r.reported_user_id = u.id
            WHERE r.reporter_id = $1
            ORDER BY r.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        
        const result = await pool.query(query, [userId, limit, offset]);
        
        // Get total count
        const countQuery = 'SELECT COUNT(*) FROM reports WHERE reporter_id = $1';
        const countResult = await pool.query(countQuery, [userId]);
        const totalReports = parseInt(countResult.rows[0].count);
        
        res.json({
            success: true,
            reports: result.rows,
            pagination: {
                page,
                limit,
                total: totalReports,
                pages: Math.ceil(totalReports / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching user reports:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reports'
        });
    }
});

// Get report details
router.get('/:id', async (req, res) => {
    try {
        const reportId = req.params.id;
        const userId = req.user.id;
        
        const query = `
            SELECT 
                r.*,
                reporter.first_name || ' ' || reporter.last_name as reporter_name,
                reporter.email as reporter_email,
                CASE 
                    WHEN r.reported_item_id IS NOT NULL THEN i.title
                    ELSE reported_user.first_name || ' ' || reported_user.last_name
                END as reported_subject,
                CASE 
                    WHEN r.reported_item_id IS NOT NULL THEN 'item'
                    ELSE 'user'
                END as report_type,
                i.description as item_description,
                i.price as item_price,
                reported_user.email as reported_user_email
            FROM reports r
            JOIN users reporter ON r.reporter_id = reporter.id
            LEFT JOIN items i ON r.reported_item_id = i.id
            LEFT JOIN users reported_user ON r.reported_user_id = reported_user.id
            WHERE r.id = $1 AND r.reporter_id = $2
        `;
        
        const result = await pool.query(query, [reportId, userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Report not found or access denied'
            });
        }
        
        res.json({
            success: true,
            report: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch report'
        });
    }
});

// Update report (only reporter can update pending reports)
router.patch('/:id', async (req, res) => {
    try {
        const reportId = req.params.id;
        const userId = req.user.id;
        const { reason, description } = req.body;
        
        // Check if report exists and belongs to user
        const checkQuery = 'SELECT * FROM reports WHERE id = $1 AND reporter_id = $2';
        const checkResult = await pool.query(checkQuery, [reportId, userId]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Report not found or access denied'
            });
        }
        
        const report = checkResult.rows[0];
        
        if (report.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Only pending reports can be updated'
            });
        }
        
        // Update the report
        const updateQuery = `
            UPDATE reports 
            SET reason = COALESCE($1, reason),
                description = COALESCE($2, description),
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
        `;
        
        const result = await pool.query(updateQuery, [reason, description, reportId]);
        
        res.json({
            success: true,
            message: 'Report updated successfully',
            report: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update report'
        });
    }
});

// Delete report (only reporter can delete pending reports)
router.delete('/:id', async (req, res) => {
    try {
        const reportId = req.params.id;
        const userId = req.user.id;
        
        // Check if report exists and belongs to user
        const checkQuery = 'SELECT * FROM reports WHERE id = $1 AND reporter_id = $2';
        const checkResult = await pool.query(checkQuery, [reportId, userId]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Report not found or access denied'
            });
        }
        
        const report = checkResult.rows[0];
        
        if (report.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Only pending reports can be deleted'
            });
        }
        
        // Delete the report
        await pool.query('DELETE FROM reports WHERE id = $1', [reportId]);
        
        res.json({
            success: true,
            message: 'Report deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete report'
        });
    }
});

export default router;