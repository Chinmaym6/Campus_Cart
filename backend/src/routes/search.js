// search.js - Routes for search functionality
import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// Search items
router.get('/items', async (req, res) => {
    try {
        const {
            q: query,
            category,
            minPrice,
            maxPrice,
            condition,
            location,
            sortBy = 'created_at',
            sortOrder = 'DESC',
            page = 1,
            limit = 20
        } = req.query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let searchQuery = `
            SELECT 
                i.*,
                u.first_name || ' ' || u.last_name as seller_name,
                u.profile_picture as seller_profile_picture,
                c.name as category_name,
                COUNT(r.id) as review_count,
                AVG(r.rating) as average_rating
            FROM items i
            JOIN users u ON i.seller_id = u.id
            LEFT JOIN categories c ON i.category_id = c.id
            LEFT JOIN reviews r ON i.id = r.item_id
            WHERE i.status = 'available'
        `;
        
        const queryParams = [];
        let paramCount = 0;
        
        // Add search conditions
        if (query) {
            paramCount++;
            searchQuery += ` AND (i.title ILIKE $${paramCount} OR i.description ILIKE $${paramCount})`;
            queryParams.push(`%${query}%`);
        }
        
        if (category) {
            paramCount++;
            searchQuery += ` AND i.category_id = $${paramCount}`;
            queryParams.push(category);
        }
        
        if (minPrice) {
            paramCount++;
            searchQuery += ` AND i.price >= $${paramCount}`;
            queryParams.push(parseFloat(minPrice));
        }
        
        if (maxPrice) {
            paramCount++;
            searchQuery += ` AND i.price <= $${paramCount}`;
            queryParams.push(parseFloat(maxPrice));
        }
        
        if (condition) {
            paramCount++;
            searchQuery += ` AND i.condition = $${paramCount}`;
            queryParams.push(condition);
        }
        
        if (location) {
            paramCount++;
            searchQuery += ` AND u.location ILIKE $${paramCount}`;
            queryParams.push(`%${location}%`);
        }
        
        // Group by for aggregation
        searchQuery += ` GROUP BY i.id, u.first_name, u.last_name, u.profile_picture, c.name`;
        
        // Add sorting
        const validSortFields = ['created_at', 'price', 'title', 'average_rating'];
        const validSortOrders = ['ASC', 'DESC'];
        
        if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder.toUpperCase())) {
            if (sortBy === 'average_rating') {
                searchQuery += ` ORDER BY AVG(r.rating) ${sortOrder.toUpperCase()} NULLS LAST`;
            } else {
                searchQuery += ` ORDER BY i.${sortBy} ${sortOrder.toUpperCase()}`;
            }
        } else {
            searchQuery += ` ORDER BY i.created_at DESC`;
        }
        
        // Add pagination
        paramCount++;
        searchQuery += ` LIMIT $${paramCount}`;
        queryParams.push(parseInt(limit));
        
        paramCount++;
        searchQuery += ` OFFSET $${paramCount}`;
        queryParams.push(offset);
        
        const result = await pool.query(searchQuery, queryParams);
        
        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(DISTINCT i.id)
            FROM items i
            JOIN users u ON i.seller_id = u.id
            LEFT JOIN categories c ON i.category_id = c.id
            WHERE i.status = 'available'
        `;
        
        const countParams = [];
        let countParamCount = 0;
        
        if (query) {
            countParamCount++;
            countQuery += ` AND (i.title ILIKE $${countParamCount} OR i.description ILIKE $${countParamCount})`;
            countParams.push(`%${query}%`);
        }
        
        if (category) {
            countParamCount++;
            countQuery += ` AND i.category_id = $${countParamCount}`;
            countParams.push(category);
        }
        
        if (minPrice) {
            countParamCount++;
            countQuery += ` AND i.price >= $${countParamCount}`;
            countParams.push(parseFloat(minPrice));
        }
        
        if (maxPrice) {
            countParamCount++;
            countQuery += ` AND i.price <= $${countParamCount}`;
            countParams.push(parseFloat(maxPrice));
        }
        
        if (condition) {
            countParamCount++;
            countQuery += ` AND i.condition = $${countParamCount}`;
            countParams.push(condition);
        }
        
        if (location) {
            countParamCount++;
            countQuery += ` AND u.location ILIKE $${countParamCount}`;
            countParams.push(`%${location}%`);
        }
        
        const countResult = await pool.query(countQuery, countParams);
        const totalItems = parseInt(countResult.rows[0].count);
        
        res.json({
            success: true,
            items: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalItems,
                pages: Math.ceil(totalItems / parseInt(limit))
            },
            filters: {
                query,
                category,
                minPrice,
                maxPrice,
                condition,
                location,
                sortBy,
                sortOrder
            }
        });
    } catch (error) {
        console.error('Error searching items:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search items'
        });
    }
});

// Search users/roommates
router.get('/users', async (req, res) => {
    try {
        const {
            q: query,
            location,
            lookingForRoommate,
            page = 1,
            limit = 20
        } = req.query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let searchQuery = `
            SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                u.profile_picture,
                u.location,
                u.bio,
                u.looking_for_roommate,
                u.created_at,
                COUNT(i.id) as items_count,
                AVG(r.rating) as average_rating
            FROM users u
            LEFT JOIN items i ON u.id = i.seller_id AND i.status = 'available'
            LEFT JOIN reviews r ON u.id = r.seller_id
            WHERE u.is_active = true
        `;
        
        const queryParams = [];
        let paramCount = 0;
        
        // Add search conditions
        if (query) {
            paramCount++;
            searchQuery += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.bio ILIKE $${paramCount})`;
            queryParams.push(`%${query}%`);
        }
        
        if (location) {
            paramCount++;
            searchQuery += ` AND u.location ILIKE $${paramCount}`;
            queryParams.push(`%${location}%`);
        }
        
        if (lookingForRoommate === 'true') {
            searchQuery += ` AND u.looking_for_roommate = true`;
        }
        
        // Group by for aggregation
        searchQuery += ` GROUP BY u.id, u.first_name, u.last_name, u.email, u.profile_picture, u.location, u.bio, u.looking_for_roommate, u.created_at`;
        
        // Add sorting
        searchQuery += ` ORDER BY u.created_at DESC`;
        
        // Add pagination
        paramCount++;
        searchQuery += ` LIMIT $${paramCount}`;
        queryParams.push(parseInt(limit));
        
        paramCount++;
        searchQuery += ` OFFSET $${paramCount}`;
        queryParams.push(offset);
        
        const result = await pool.query(searchQuery, queryParams);
        
        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*)
            FROM users u
            WHERE u.is_active = true
        `;
        
        const countParams = [];
        let countParamCount = 0;
        
        if (query) {
            countParamCount++;
            countQuery += ` AND (u.first_name ILIKE $${countParamCount} OR u.last_name ILIKE $${countParamCount} OR u.bio ILIKE $${countParamCount})`;
            countParams.push(`%${query}%`);
        }
        
        if (location) {
            countParamCount++;
            countQuery += ` AND u.location ILIKE $${countParamCount}`;
            countParams.push(`%${location}%`);
        }
        
        if (lookingForRoommate === 'true') {
            countQuery += ` AND u.looking_for_roommate = true`;
        }
        
        const countResult = await pool.query(countQuery, countParams);
        const totalUsers = parseInt(countResult.rows[0].count);
        
        res.json({
            success: true,
            users: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalUsers,
                pages: Math.ceil(totalUsers / parseInt(limit))
            },
            filters: {
                query,
                location,
                lookingForRoommate
            }
        });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search users'
        });
    }
});

// Get search suggestions
router.get('/suggestions', async (req, res) => {
    try {
        const { q: query, type = 'items' } = req.query;
        
        if (!query || query.length < 2) {
            return res.json({
                success: true,
                suggestions: []
            });
        }
        
        let suggestions = [];
        
        if (type === 'items') {
            // Get item title suggestions
            const itemQuery = `
                SELECT DISTINCT title
                FROM items
                WHERE title ILIKE $1 AND status = 'available'
                ORDER BY title
                LIMIT 10
            `;
            
            const itemResult = await pool.query(itemQuery, [`%${query}%`]);
            suggestions = itemResult.rows.map(row => ({
                type: 'item',
                text: row.title
            }));
            
            // Get category suggestions
            const categoryQuery = `
                SELECT DISTINCT c.name
                FROM categories c
                JOIN items i ON c.id = i.category_id
                WHERE c.name ILIKE $1 AND i.status = 'available'
                ORDER BY c.name
                LIMIT 5
            `;
            
            const categoryResult = await pool.query(categoryQuery, [`%${query}%`]);
            const categorySuggestions = categoryResult.rows.map(row => ({
                type: 'category',
                text: row.name
            }));
            
            suggestions = [...suggestions, ...categorySuggestions];
        } else if (type === 'users') {
            // Get user name suggestions
            const userQuery = `
                SELECT DISTINCT first_name || ' ' || last_name as full_name
                FROM users
                WHERE (first_name ILIKE $1 OR last_name ILIKE $1) AND is_active = true
                ORDER BY full_name
                LIMIT 10
            `;
            
            const userResult = await pool.query(userQuery, [`%${query}%`]);
            suggestions = userResult.rows.map(row => ({
                type: 'user',
                text: row.full_name
            }));
        }
        
        res.json({
            success: true,
            suggestions: suggestions.slice(0, 10) // Limit to 10 suggestions
        });
    } catch (error) {
        console.error('Error getting search suggestions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get search suggestions'
        });
    }
});

// Get popular search terms
router.get('/popular', async (req, res) => {
    try {
        // This would typically come from a search_logs table
        // For now, we'll return popular categories and recent items
        
        const categoriesQuery = `
            SELECT 
                c.name,
                COUNT(i.id) as item_count
            FROM categories c
            JOIN items i ON c.id = i.category_id
            WHERE i.status = 'available'
            GROUP BY c.id, c.name
            ORDER BY item_count DESC
            LIMIT 10
        `;
        
        const categoriesResult = await pool.query(categoriesQuery);
        
        const recentItemsQuery = `
            SELECT DISTINCT title
            FROM items
            WHERE status = 'available' AND created_at >= NOW() - INTERVAL '7 days'
            ORDER BY created_at DESC
            LIMIT 10
        `;
        
        const recentItemsResult = await pool.query(recentItemsQuery);
        
        res.json({
            success: true,
            popular: {
                categories: categoriesResult.rows,
                recentItems: recentItemsResult.rows.map(row => row.title)
            }
        });
    } catch (error) {
        console.error('Error getting popular searches:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get popular searches'
        });
    }
});

export default router;