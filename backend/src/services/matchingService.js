import { pool } from '../config/database.js';

// Calculate roommate compatibility score (0-100)
export const calculateRoommateCompatibility = (userA, userB) => {
    let score = 0;
    let totalFactors = 0;

    // Budget compatibility (25% weight)
    if (userA.budget_max >= userB.budget_min && userA.budget_min <= userB.budget_max) {
        const budgetOverlap = Math.min(userA.budget_max, userB.budget_max) - Math.max(userA.budget_min, userB.budget_min);
        const maxBudget = Math.max(userA.budget_max, userB.budget_max);
        const budgetScore = (budgetOverlap / maxBudget) * 25;
        score += budgetScore;
    }
    totalFactors += 25;

    // Housing type match (20% weight)
    if (userA.housing_type === userB.housing_type) {
        score += 20;
    }
    totalFactors += 20;

    // Location preference (15% weight)
    if (userA.preferred_location === userB.preferred_location) {
        score += 15;
    }
    totalFactors += 15;

    // Lifestyle compatibility (40% weight total)
    const lifestyleFactors = [
        { a: userA.cleanliness_level, b: userB.cleanliness_level, weight: 10 },
        { a: userA.noise_tolerance, b: userB.noise_tolerance, weight: 8 },
        { a: userA.social_level, b: userB.social_level, weight: 7 },
        { a: userA.smoking_allowed, b: userB.smoking_allowed, weight: 8 },
        { a: userA.pets_allowed, b: userB.pets_allowed, weight: 7 }
    ];

    lifestyleFactors.forEach(factor => {
        if (typeof factor.a === 'number' && typeof factor.b === 'number') {
            // For numeric values (1-5 scale), calculate compatibility based on difference
            const difference = Math.abs(factor.a - factor.b);
            const compatibility = Math.max(0, (5 - difference) / 5);
            score += compatibility * factor.weight;
        } else if (factor.a === factor.b) {
            // For boolean values, exact match
            score += factor.weight;
        }
        totalFactors += factor.weight;
    });

    return Math.round((score / totalFactors) * 100);
};

// Find potential roommate matches
export const findRoommateMatches = async (userId, limit = 20) => {
    try {
        const userResult = await pool.query(`
            SELECT rp.*, u.first_name, u.last_name, u.profile_picture_url
            FROM roommate_posts rp
            JOIN users u ON rp.user_id = u.id
            WHERE rp.user_id = $1 AND rp.status = 'looking'
        `, [userId]);

        if (userResult.rows.length === 0) {
            return [];
        }

        const userPost = userResult.rows[0];

        const potentialMatches = await pool.query(`
            SELECT rp.*, u.first_name, u.last_name, u.profile_picture_url, u.email_verified
            FROM roommate_posts rp
            JOIN users u ON rp.user_id = u.id
            WHERE rp.user_id != $1 
            AND rp.status = 'looking'
            AND u.status = 'active'
            AND u.email_verified = true
            AND rp.expires_at > CURRENT_TIMESTAMP
            ORDER BY rp.created_at DESC
            LIMIT 100
        `, [userId]);

        const matches = potentialMatches.rows.map(match => ({
            ...match,
            compatibility_score: calculateRoommateCompatibility(userPost, match)
        }))
        .filter(match => match.compatibility_score >= 30) // Minimum 30% compatibility
        .sort((a, b) => b.compatibility_score - a.compatibility_score)
        .slice(0, limit);

        return matches;

    } catch (error) {
        console.error('❌ Error finding roommate matches:', error);
        throw error;
    }
};

// Find similar items based on category, price, and keywords
export const findSimilarItems = async (itemId, limit = 10) => {
    try {
        const itemResult = await pool.query(`
            SELECT * FROM items WHERE id = $1
        `, [itemId]);

        if (itemResult.rows.length === 0) {
            return [];
        }

        const item = itemResult.rows[0];
        const priceRange = item.price * 0.3; // 30% price range

        const similarItems = await pool.query(`
            SELECT i.*, u.first_name, u.last_name, u.profile_picture_url,
                   c.name as category_name
            FROM items i
            JOIN users u ON i.seller_id = u.id
            LEFT JOIN categories c ON i.category_id = c.id
            WHERE i.id != $1 
            AND i.status = 'available'
            AND i.expires_at > CURRENT_TIMESTAMP
            AND (
                (i.category_id = $2) OR
                (i.price BETWEEN $3 AND $4) OR
                (i.title ILIKE $5 OR i.description ILIKE $5)
            )
            ORDER BY 
                CASE 
                    WHEN i.category_id = $2 THEN 1
                    WHEN i.price BETWEEN $3 AND $4 THEN 2
                    ELSE 3
                END,
                ABS(i.price - $6),
                i.created_at DESC
            LIMIT $7
        `, [
            itemId,
            item.category_id,
            item.price - priceRange,
            item.price + priceRange,
            `%${item.title.split(' ')[0]}%`, // First word of title
            item.price,
            limit
        ]);

        return similarItems.rows;

    } catch (error) {
        console.error('❌ Error finding similar items:', error);
        throw error;
    }
};

// Calculate item recommendation score based on user preferences
export const getItemRecommendations = async (userId, limit = 20) => {
    try {
        // Get user's saved items and purchase history to understand preferences
        const userPreferences = await pool.query(`
            SELECT i.category_id, AVG(i.price) as avg_price, COUNT(*) as interest_count
            FROM saved_items si
            JOIN items i ON si.item_id = i.id
            WHERE si.user_id = $1
            GROUP BY i.category_id
            ORDER BY interest_count DESC, avg_price
        `, [userId]);

        if (userPreferences.rows.length === 0) {
            // No preferences yet, return popular items
            return await pool.query(`
                SELECT i.*, u.first_name, u.last_name, c.name as category_name
                FROM items i
                JOIN users u ON i.seller_id = u.id
                LEFT JOIN categories c ON i.category_id = c.id
                WHERE i.status = 'available'
                AND i.seller_id != $1
                AND i.expires_at > CURRENT_TIMESTAMP
                ORDER BY i.view_count DESC, i.created_at DESC
                LIMIT $2
            `, [userId, limit]);
        }

        // Get recommendations based on preferences
        const categoryIds = userPreferences.rows.map(p => p.category_id);
        const avgPrice = userPreferences.rows.reduce((sum, p) => sum + parseFloat(p.avg_price), 0) / userPreferences.rows.length;

        const recommendations = await pool.query(`
            SELECT i.*, u.first_name, u.last_name, c.name as category_name,
                   CASE 
                       WHEN i.category_id = ANY($2) THEN 3
                       WHEN i.price BETWEEN $3 AND $4 THEN 2
                       ELSE 1
                   END as relevance_score
            FROM items i
            JOIN users u ON i.seller_id = u.id
            LEFT JOIN categories c ON i.category_id = c.id
            WHERE i.status = 'available'
            AND i.seller_id != $1
            AND i.expires_at > CURRENT_TIMESTAMP
            AND (
                i.category_id = ANY($2) OR
                i.price BETWEEN $3 AND $4
            )
            ORDER BY relevance_score DESC, i.view_count DESC, i.created_at DESC
            LIMIT $5
        `, [userId, categoryIds, avgPrice * 0.7, avgPrice * 1.5, limit]);

        return recommendations.rows;

    } catch (error) {
        console.error('❌ Error getting item recommendations:', error);
        throw error;
    }
};

// University-based matching (prioritize same university)
export const getUniversityMatches = async (userId, type = 'roommate', limit = 15) => {
    try {
        const userUniversity = await pool.query(`
            SELECT university_id FROM users WHERE id = $1
        `, [userId]);

        if (userUniversity.rows.length === 0 || !userUniversity.rows[0].university_id) {
            return [];
        }

        const universityId = userUniversity.rows.university_id;

        if (type === 'roommate') {
            const matches = await pool.query(`
                SELECT rp.*, u.first_name, u.last_name, u.profile_picture_url
                FROM roommate_posts rp
                JOIN users u ON rp.user_id = u.id
                WHERE u.university_id = $1
                AND rp.user_id != $2
                AND rp.status = 'looking'
                AND u.status = 'active'
                AND rp.expires_at > CURRENT_TIMESTAMP
                ORDER BY rp.created_at DESC
                LIMIT $3
            `, [universityId, userId, limit]);

            return matches.rows;
        }

        if (type === 'items') {
            const matches = await pool.query(`
                SELECT i.*, u.first_name, u.last_name, c.name as category_name
                FROM items i
                JOIN users u ON i.seller_id = u.id
                LEFT JOIN categories c ON i.category_id = c.id
                WHERE u.university_id = $1
                AND i.seller_id != $2
                AND i.status = 'available'
                AND i.expires_at > CURRENT_TIMESTAMP
                ORDER BY i.created_at DESC
                LIMIT $3
            `, [universityId, userId, limit]);

            return matches.rows;
        }

        return [];

    } catch (error) {
        console.error('❌ Error getting university matches:', error);
        throw error;
    }
};

export default {
    calculateRoommateCompatibility,
    findRoommateMatches,
    findSimilarItems,
    getItemRecommendations,
    getUniversityMatches
};
