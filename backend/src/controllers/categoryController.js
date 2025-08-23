import { pool } from '../config/database.js';

// Get All Categories
export const getCategories = async (req, res) => {
    try {
        const query = `
            SELECT c.*, 
                   (SELECT COUNT(*) FROM items WHERE category_id = c.id AND status = 'available') as item_count,
                   CASE WHEN c.parent_id IS NOT NULL THEN 
                       (SELECT name FROM categories WHERE id = c.parent_id)
                   ELSE NULL END as parent_name
            FROM categories c
            WHERE c.is_active = true
            ORDER BY c.sort_order ASC, c.name ASC
        `;

        const result = await pool.query(query);

        // Organize categories into parent and children
        const parentCategories = result.rows.filter(cat => !cat.parent_id);
        const subcategories = result.rows.filter(cat => cat.parent_id);

        const categoriesWithSubs = parentCategories.map(parent => ({
            ...parent,
            subcategories: subcategories.filter(sub => sub.parent_id === parent.id)
        }));

        res.json({
            success: true,
            data: {
                categories: categoriesWithSubs,
                all_categories: result.rows
            }
        });

    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching categories'
        });
    }
};

// Get Category by ID
export const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT c.*, 
                   (SELECT COUNT(*) FROM items WHERE category_id = c.id AND status = 'available') as item_count,
                   CASE WHEN c.parent_id IS NOT NULL THEN 
                       (SELECT name FROM categories WHERE id = c.parent_id)
                   ELSE NULL END as parent_name
            FROM categories c
            WHERE c.id = $1 AND c.is_active = true
        `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Get subcategories if this is a parent category
        const subcategoriesQuery = `
            SELECT * FROM categories 
            WHERE parent_id = $1 AND is_active = true 
            ORDER BY sort_order ASC, name ASC
        `;

        const subcategoriesResult = await pool.query(subcategoriesQuery, [id]);

        const category = {
            ...result.rows[0],
            subcategories: subcategoriesResult.rows
        };

        res.json({
            success: true,
            data: { category }
        });

    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching category'
        });
    }
};

// Get Subcategories
export const getSubcategories = async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT c.*, 
                   (SELECT COUNT(*) FROM items WHERE category_id = c.id AND status = 'available') as item_count
            FROM categories c
            WHERE c.parent_id = $1 AND c.is_active = true
            ORDER BY c.sort_order ASC, c.name ASC
        `;

        const result = await pool.query(query, [id]);

        res.json({
            success: true,
            data: { subcategories: result.rows }
        });

    } catch (error) {
        console.error('Error fetching subcategories:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching subcategories'
        });
    }
};

// Get Category Stats
export const getCategoryStats = async (req, res) => {
    try {
        const { id } = req.params;

        const statsQuery = `
            SELECT 
                COUNT(*) as total_items,
                COUNT(*) FILTER (WHERE status = 'available') as available_items,
                COUNT(*) FILTER (WHERE status = 'sold') as sold_items,
                AVG(price) as average_price,
                MIN(price) as min_price,
                MAX(price) as max_price,
                COUNT(DISTINCT seller_id) as unique_sellers
            FROM items
            WHERE category_id = $1
        `;

        const result = await pool.query(statsQuery, [id]);

        const stats = {
            ...result.rows[0],
            total_items: parseInt(result.rows.total_items),
            available_items: parseInt(result.rows.available_items),
            sold_items: parseInt(result.rows.sold_items),
            average_price: result.rows.average_price ? parseFloat(result.rows.average_price) : 0,
            min_price: result.rows.min_price ? parseFloat(result.rows.min_price) : 0,
            max_price: result.rows.max_price ? parseFloat(result.rows.max_price) : 0,
            unique_sellers: parseInt(result.rows.unique_sellers)
        };

        res.json({
            success: true,
            data: { stats }
        });

    } catch (error) {
        console.error('Error fetching category stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching category statistics'
        });
    }
};
