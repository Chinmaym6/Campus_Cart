import { Pool } from 'pg';

// Database connection pool
export const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'campuscart',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false
});

// Database connection test
export const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Database connected successfully');
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
};

// Transaction wrapper utility
export const withTransaction = async (callback) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Query helper with logging
export const query = async (text, params = []) => {
    const start = Date.now();
    
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        
        if (process.env.NODE_ENV === 'development') {
            console.log('🔍 Query executed', { text, duration, rows: result.rowCount });
        }
        
        return result;
    } catch (error) {
        console.error('❌ Database query error:', { text, params, error: error.message });
        throw error;
    }
};

// Bulk insert helper
export const bulkInsert = async (tableName, data, columns) => {
    if (!data || data.length === 0) return [];

    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const placeholders = data.map((_, index) => {
            const valueStr = columns.map((_, colIndex) => `$${index * columns.length + colIndex + 1}`).join(', ');
            return `(${valueStr})`;
        }).join(', ');
        
        const values = data.flat();
        const columnsStr = columns.join(', ');
        
        const query = `
            INSERT INTO ${tableName} (${columnsStr})
            VALUES ${placeholders}
            RETURNING *
        `;
        
        const result = await client.query(query, values);
        await client.query('COMMIT');
        
        return result.rows;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Pagination helper
export const paginate = (page = 1, limit = 20) => {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    return {
        limit: parseInt(limit),
        offset: offset,
        page: parseInt(page)
    };
};

// Search query builder
export const buildSearchQuery = (baseQuery, filters = {}) => {
    let query = baseQuery;
    const values = [];
    let paramCount = 0;

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            paramCount++;
            
            if (Array.isArray(value)) {
                const placeholders = value.map(() => `$${paramCount++}`).join(',');
                query += ` AND ${key} IN (${placeholders})`;
                values.push(...value);
                paramCount = paramCount - value.length; // Reset count
            } else if (typeof value === 'string' && value.includes('%')) {
                query += ` AND ${key} ILIKE $${paramCount}`;
                values.push(value);
            } else {
                query += ` AND ${key} = $${paramCount}`;
                values.push(value);
            }
        }
    });

    return { query, values, paramCount };
};

// Health check
export const healthCheck = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        
        return {
            status: 'healthy',
            timestamp: result.rows[0].now,
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message
        };
    }
};

export default {
    pool,
    testConnection,
    withTransaction,
    query,
    bulkInsert,
    paginate,
    buildSearchQuery,
    healthCheck
};
