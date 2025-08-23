// universities.js - Routes for university management
import express from 'express';
import { pool } from '../config/database.js';
import { adminMiddleware } from '../middleware/adminAuth.js';

const router = express.Router();

// Get all universities
router.get('/', async (req, res) => {
    try {
        const { search, state, active = 'true' } = req.query;
        
        let query = 'SELECT * FROM universities WHERE 1=1';
        const queryParams = [];
        let paramCount = 0;
        
        if (search) {
            paramCount++;
            query += ` AND (name ILIKE $${paramCount} OR city ILIKE $${paramCount})`;
            queryParams.push(`%${search}%`);
        }
        
        if (state) {
            paramCount++;
            query += ` AND state = $${paramCount}`;
            queryParams.push(state);
        }
        
        if (active !== 'all') {
            query += ` AND is_active = ${active === 'true'}`;
        }
        
        query += ' ORDER BY name ASC';
        
        const result = await pool.query(query, queryParams);
        
        res.json({
            success: true,
            universities: result.rows
        });
    } catch (error) {
        console.error('Error fetching universities:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch universities'
        });
    }
});

// Get states list
router.get('/meta/states', async (req, res) => {
    try {
        const query = 'SELECT DISTINCT state FROM universities ORDER BY state';
        const result = await pool.query(query);
        
        res.json({
            success: true,
            states: result.rows.map(row => row.state)
        });
    } catch (error) {
        console.error('Error fetching states:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch states'
        });
    }
});

// Verify email domain for university
router.post('/verify-domain', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }
        
        const emailDomain = email.split('@')[1];
        
        if (!emailDomain) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }
        
        const query = 'SELECT * FROM universities WHERE domain = $1 AND is_active = true';
        const result = await pool.query(query, [emailDomain]);
        
        if (result.rows.length === 0) {
            return res.json({
                success: false,
                message: 'Email domain not associated with any university',
                university: null
            });
        }
        
        res.json({
            success: true,
            message: 'Email domain verified',
            university: result.rows[0]
        });
    } catch (error) {
        console.error('Error verifying email domain:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify email domain'
        });
    }
});

// Get university by ID
router.get('/:id', async (req, res) => {
    try {
        const universityId = req.params.id;
        
        const query = `
            SELECT 
                u.*,
                COUNT(users.id) as student_count
            FROM universities u
            LEFT JOIN users ON u.id = users.university_id
            WHERE u.id = $1
            GROUP BY u.id
        `;
        
        const result = await pool.query(query, [universityId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'University not found'
            });
        }
        
        res.json({
            success: true,
            university: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching university:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch university'
        });
    }
});

// Create new university (Admin only)
router.post('/', adminMiddleware, async (req, res) => {
    try {
        const { name, city, state, country, website, domain } = req.body;
        
        if (!name || !city || !state) {
            return res.status(400).json({
                success: false,
                message: 'Name, city, and state are required'
            });
        }
        
        // Check if university already exists
        const existingQuery = 'SELECT id FROM universities WHERE name = $1 AND city = $2 AND state = $3';
        const existingResult = await pool.query(existingQuery, [name, city, state]);
        
        if (existingResult.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'University already exists in this location'
            });
        }
        
        const insertQuery = `
            INSERT INTO universities (
                name, city, state, country, website, domain, 
                is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
            RETURNING *
        `;
        
        const result = await pool.query(insertQuery, [
            name, city, state, country || 'USA', website, domain
        ]);
        
        res.status(201).json({
            success: true,
            message: 'University created successfully',
            university: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating university:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create university'
        });
    }
});

// Update university (Admin only)
router.patch('/:id', adminMiddleware, async (req, res) => {
    try {
        const universityId = req.params.id;
        const { name, city, state, country, website, domain, is_active } = req.body;
        
        // Check if university exists
        const existingQuery = 'SELECT * FROM universities WHERE id = $1';
        const existingResult = await pool.query(existingQuery, [universityId]);
        
        if (existingResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'University not found'
            });
        }
        
        const updateQuery = `
            UPDATE universities 
            SET 
                name = COALESCE($1, name),
                city = COALESCE($2, city),
                state = COALESCE($3, state),
                country = COALESCE($4, country),
                website = COALESCE($5, website),
                domain = COALESCE($6, domain),
                is_active = COALESCE($7, is_active),
                updated_at = NOW()
            WHERE id = $8
            RETURNING *
        `;
        
        const result = await pool.query(updateQuery, [
            name, city, state, country, website, domain, is_active, universityId
        ]);
        
        res.json({
            success: true,
            message: 'University updated successfully',
            university: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating university:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update university'
        });
    }
});

// Delete university (Admin only)
router.delete('/:id', adminMiddleware, async (req, res) => {
    try {
        const universityId = req.params.id;
        
        // Check if university has associated users
        const usersQuery = 'SELECT COUNT(*) FROM users WHERE university_id = $1';
        const usersResult = await pool.query(usersQuery, [universityId]);
        const userCount = parseInt(usersResult.rows[0].count);
        
        if (userCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete university. ${userCount} users are associated with this university.`
            });
        }
        
        const deleteQuery = 'DELETE FROM universities WHERE id = $1 RETURNING *';
        const result = await pool.query(deleteQuery, [universityId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'University not found'
            });
        }
        
        res.json({
            success: true,
            message: 'University deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting university:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete university'
        });
    }
});

// Get university statistics (Admin only)
router.get('/:id/stats', adminMiddleware, async (req, res) => {
    try {
        const universityId = req.params.id;
        
        // Get various statistics for the university
        const statsQuery = `
            SELECT 
                COUNT(DISTINCT u.id) as total_students,
                COUNT(DISTINCT CASE WHEN u.created_at >= NOW() - INTERVAL '30 days' THEN u.id END) as new_students_30d,
                COUNT(DISTINCT i.id) as total_items,
                COUNT(DISTINCT CASE WHEN i.created_at >= NOW() - INTERVAL '30 days' THEN i.id END) as new_items_30d,
                COUNT(DISTINCT t.id) as total_transactions,
                COUNT(DISTINCT CASE WHEN t.created_at >= NOW() - INTERVAL '30 days' THEN t.id END) as new_transactions_30d,
                COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.amount END), 0) as total_revenue
            FROM universities univ
            LEFT JOIN users u ON univ.id = u.university_id
            LEFT JOIN items i ON u.id = i.seller_id
            LEFT JOIN transactions t ON i.id = t.item_id
            WHERE univ.id = $1
        `;
        
        const result = await pool.query(statsQuery, [universityId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'University not found'
            });
        }
        
        // Get top categories for this university
        const categoriesQuery = `
            SELECT 
                c.name as category_name,
                COUNT(i.id) as item_count
            FROM categories c
            JOIN items i ON c.id = i.category_id
            JOIN users u ON i.seller_id = u.id
            WHERE u.university_id = $1
            GROUP BY c.id, c.name
            ORDER BY item_count DESC
            LIMIT 5
        `;
        
        const categoriesResult = await pool.query(categoriesQuery, [universityId]);
        
        res.json({
            success: true,
            stats: {
                ...result.rows[0],
                top_categories: categoriesResult.rows
            }
        });
    } catch (error) {
        console.error('Error fetching university stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch university statistics'
        });
    }
});

// Get states list
router.get('/meta/states', async (req, res) => {
    try {
        const query = 'SELECT DISTINCT state FROM universities ORDER BY state';
        const result = await pool.query(query);
        
        res.json({
            success: true,
            states: result.rows.map(row => row.state)
        });
    } catch (error) {
        console.error('Error fetching states:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch states'
        });
    }
});

// Verify email domain for university
router.post('/verify-domain', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }
        
        const emailDomain = email.split('@')[1];
        
        if (!emailDomain) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }
        
        const query = 'SELECT * FROM universities WHERE email_domain = $1 AND is_active = true';
        const result = await pool.query(query, [emailDomain]);
        
        if (result.rows.length === 0) {
            return res.json({
                success: false,
                message: 'Email domain not associated with any university',
                university: null
            });
        }
        
        res.json({
            success: true,
            message: 'Email domain verified',
            university: result.rows[0]
        });
    } catch (error) {
        console.error('Error verifying email domain:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify email domain'
        });
    }
});

export default router;