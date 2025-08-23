// 

import { pool } from '../config/database.js';

// Modified function to allow any email domain without university validation
export const validateUniversityEmail = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ 
                success: false,
                message: "Email is required",
                code: 'EMAIL_REQUIRED'
            });
        }

        // Validate email format first
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format",
                code: 'INVALID_EMAIL_FORMAT'
            });
        }

        // Skip university validation and proceed with registration
        next();

    } catch (error) {
        console.error('Email validation error:', error);
        res.status(500).json({ 
            success: false,
            message: "Error validating email",
            code: 'VALIDATION_ERROR'
        });
    }
};

// Optional university validation (doesn't fail if not university email)
export const optionalUniversityValidation = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return next();
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return next(); // Continue without validation
        }

        const domain = email.split('@')[1]?.toLowerCase();
        if (!domain) {
            return next();
        }

        const universityResult = await pool.query(
            `SELECT id, name, domain, city, state, country 
             FROM universities 
             WHERE domain = $1 AND is_active = true`,
            [domain]
        );

        if (universityResult.rows.length > 0) {
            const university = universityResult.rows[0];
            req.universityId = university.id;
            req.university = university;
        }

        next();

    } catch (error) {
        console.error('Optional university validation error:', error);
        next(); // Continue without validation on error
    }
};

// Check if email domain is educational - modified to always return true to allow any email domain
export const isEducationalDomain = (email) => {
    // Always return true to allow any email domain
    return true;
};

// Middleware to require educational email
export const requireEducationalEmail = (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: 'Email is required',
            code: 'EMAIL_REQUIRED'
        });
    }

    if (!isEducationalDomain(email)) {
        return res.status(400).json({
            success: false,
            message: 'Please use your university email address',
            code: 'NON_EDUCATIONAL_EMAIL',
            data: {
                domain: email.split('@')[1]?.toLowerCase(),
                isEducational: false
            }
        });
    }

    next();
};

// Get supported universities (for frontend dropdowns/suggestions)
export const getSupportedUniversities = async (req, res) => {
    try {
        const { search, state, country = 'USA', page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT id, name, domain, city, state, country,
                   (SELECT COUNT(*) FROM users WHERE university_id = u.id) as student_count
            FROM universities u
            WHERE is_active = true
        `;
        const params = [];
        let paramCount = 0;

        // Search filter
        if (search) {
            paramCount++;
            query += ` AND (name ILIKE $${paramCount} OR city ILIKE $${paramCount} OR domain ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        // State filter
        if (state) {
            paramCount++;
            query += ` AND state = $${paramCount}`;
            params.push(state);
        }

        // Country filter
        if (country) {
            paramCount++;
            query += ` AND country = $${paramCount}`;
            params.push(country);
        }

        query += ` ORDER BY student_count DESC, name ASC`;
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(parseInt(limit), offset);

        const result = await pool.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM universities WHERE is_active = true';
        const countParams = [];
        let countParamIndex = 0;

        if (search) {
            countParamIndex++;
            countQuery += ` AND (name ILIKE $${countParamIndex} OR city ILIKE $${countParamIndex} OR domain ILIKE $${countParamIndex})`;
            countParams.push(`%${search}%`);
        }

        if (state) {
            countParamIndex++;
            countQuery += ` AND state = $${countParamIndex}`;
            countParams.push(state);
        }

        if (country) {
            countParamIndex++;
            countQuery += ` AND country = $${countParamIndex}`;
            countParams.push(country);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        const universities = result.rows.map(uni => ({
            ...uni,
            student_count: parseInt(uni.student_count)
        }));

        res.json({
            success: true,
            data: {
                universities,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Error fetching universities:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching supported universities'
        });
    }
};

// Validate and suggest similar universities
export const validateAndSuggestUniversity = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const domain = email.split('@')[1]?.toLowerCase();
        
        if (!domain) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Check if university exists
        const universityResult = await pool.query(
            `SELECT id, name, domain, city, state, country 
             FROM universities 
             WHERE domain = $1 AND is_active = true`,
            [domain]
        );

        if (universityResult.rows.length > 0) {
            return res.json({
                success: true,
                data: {
                    university: universityResult.rows[0],
                    message: `Valid ${universityResult.rows.name} email address`
                }
            });
        }

        // Suggest similar universities if domain not found
        const domainParts = domain.split('.');
        const mainDomain = domainParts;

        const suggestionsResult = await pool.query(
            `SELECT id, name, domain, city, state, country,
                    (SELECT COUNT(*) FROM users WHERE university_id = u.id) as student_count
             FROM universities u
             WHERE (name ILIKE $1 OR domain ILIKE $2) 
             AND is_active = true 
             ORDER BY student_count DESC
             LIMIT 5`,
            [`%${mainDomain}%`, `%${mainDomain}%`]
        );

        res.status(400).json({
            success: false,
            message: `University domain "${domain}" is not supported yet.`,
            code: 'UNIVERSITY_NOT_SUPPORTED',
            data: {
                domain,
                isEducational: isEducationalDomain(email),
                suggestions: suggestionsResult.rows.map(uni => ({
                    ...uni,
                    student_count: parseInt(uni.student_count)
                }))
            }
        });

    } catch (error) {
        console.error('Error validating and suggesting university:', error);
        res.status(500).json({
            success: false,
            message: 'Error validating university'
        });
    }
};

// Get university statistics
export const getUniversityStats = async (req, res) => {
    try {
        const statsResult = await pool.query(`
            SELECT 
                u.id,
                u.name,
                u.domain,
                u.city,
                u.state,
                u.country,
                COUNT(users.id) as total_users,
                COUNT(CASE WHEN users.status = 'active' THEN 1 END) as active_users,
                COUNT(CASE WHEN users.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_month,
                COUNT(CASE WHEN users.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_week
            FROM universities u
            LEFT JOIN users ON u.id = users.university_id
            WHERE u.is_active = true
            GROUP BY u.id, u.name, u.domain, u.city, u.state, u.country
            HAVING COUNT(users.id) > 0
            ORDER BY total_users DESC
        `);

        const universities = statsResult.rows.map(row => ({
            ...row,
            total_users: parseInt(row.total_users),
            active_users: parseInt(row.active_users),
            new_users_month: parseInt(row.new_users_month),
            new_users_week: parseInt(row.new_users_week)
        }));

        res.json({
            success: true,
            data: { universities }
        });

    } catch (error) {
        console.error('Error fetching university stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching university statistics'
        });
    }
};

// Check domain availability for new university registration
export const checkDomainAvailability = async (req, res) => {
    try {
        const { domain } = req.body;

        if (!domain) {
            return res.status(400).json({
                success: false,
                message: 'Domain is required'
            });
        }

        const normalizedDomain = domain.toLowerCase();

        const existingResult = await pool.query(
            'SELECT id, name FROM universities WHERE domain = $1',
            [normalizedDomain]
        );

        if (existingResult.rows.length > 0) {
            return res.json({
                success: false,
                message: 'Domain already registered',
                data: {
                    domain: normalizedDomain,
                    available: false,
                    existingUniversity: existingResult.rows[0]
                }
            });
        }

        res.json({
            success: true,
            data: {
                domain: normalizedDomain,
                available: true,
                isEducational: isEducationalDomain(`test@${normalizedDomain}`)
            }
        });

    } catch (error) {
        console.error('Error checking domain availability:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking domain availability'
        });
    }
};

export default validateUniversityEmail;
