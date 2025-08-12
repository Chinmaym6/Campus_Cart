import {Pool} from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: Number(process.env.PGPORT),
});

const connectToDatabase = async () => {
    try {
        const client = await pool.connect();
        console.log("✅ Database Connected successfully!");
        client.release(); // Release the client back to the pool
    } catch (error) {
        console.error("❌ Database Connection Error:", error.message);
        throw error; // Throw error to be caught by server
    }
};

// Add a test query function
const testConnection = async () => {
    try {
        await pool.query('SELECT NOW()');
        return true;
    } catch (error) {
        console.error("Database test query failed:", error);
        return false;
    }
};

export default { pool, connectToDatabase, testConnection };