import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env
const envPath = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: envPath });

// Validate required environment variables
if (!process.env.PGDATABASE) {
    console.error('❌ ERROR: PGDATABASE environment variable is not set.');
    process.exit(1);
}

// Create PostgreSQL pool with optimal settings
export const pool = new Pool({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD ? String(process.env.PGPASSWORD) : undefined,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    
    // Pool configuration for better performance
    max: 20,                    // maximum number of clients in pool
    idleTimeoutMillis: 30000,   // close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // return error after 2 seconds if connection fails
    
    // SSL configuration (for production)
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test initial connection
pool.connect()
    .then(client => {
        console.log('✅ PostgreSQL connected successfully');
        console.log(`🔗 Connected to: ${process.env.PGDATABASE} on ${process.env.PGHOST}:${process.env.PGPORT || 5432}`);
        client.release(); // Important: release the client back to pool
    })
    .catch(err => {
        console.error('❌ PostgreSQL connection failed:', err.message);
        process.exit(1);
    });

// Handle pool errors globally
pool.on('error', (err, client) => {
    console.error('💥 Unexpected error on idle PostgreSQL client:', err);
    // Don't exit process here, just log the error
});

// Handle connection events
pool.on('connect', () => {
    console.log('🔗 New client connected to PostgreSQL pool');
});

pool.on('remove', () => {
    console.log('📤 Client removed from PostgreSQL pool');
});

// Graceful shutdown function
export const closePool = async () => {
    try {
        await pool.end();
        console.log('🔌 PostgreSQL pool closed gracefully');
    } catch (error) {
        console.error('Error closing PostgreSQL pool:', error);
    }
};

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, closing database connections...');
    await closePool();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, closing database connections...');
    await closePool();
    process.exit(0);
});

// Export a helper function for transactions
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
