// dbInit.js - Updated to match your actual database schema
import { pool } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize database tables and constraints
 */
export const initializeDatabase = async () => {
    try {
        console.log('Starting database initialization...');
        
        // Enable UUID extension first
        await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
        
        // Create ENUM types
        await createEnumTypes();
        
        // Create tables in order of dependencies
        await createUniversitiesTable();
        await createUsersTable();
        await createCategoriesTable();
        await createItemsTable();
        await createRoommatePostsTable();
        await createMessagesTable();
        await createConversationsTable();
        await createTransactionsTable();
        await createReviewsTable();
        await createNotificationsTable();
        await createReportsTable();
        await createSystemSettingsTable();
        await createAuditLogsTable();
        
        // Insert default data
        await insertDefaultData();
        
        console.log('Database initialization completed successfully!');
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
};

/**
 * Create ENUM types
 */
const createEnumTypes = async () => {
    const enumQueries = [
        `CREATE TYPE user_role AS ENUM ('student', 'admin', 'moderator');`,
        `CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');`,
        `CREATE TYPE item_condition AS ENUM ('new', 'like_new', 'good', 'fair', 'poor');`,
        `CREATE TYPE item_status AS ENUM ('available', 'sold', 'reserved', 'inactive');`,
        `CREATE TYPE roommate_status AS ENUM ('looking', 'matched', 'inactive');`,
        `CREATE TYPE gender_preference AS ENUM ('male', 'female', 'any', 'non_binary');`,
        `CREATE TYPE housing_type AS ENUM ('dorm', 'apartment', 'house', 'studio');`,
        `CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');`,
        `CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'cancelled', 'disputed');`,
        `CREATE TYPE report_status AS ENUM ('pending', 'reviewing', 'resolved', 'rejected');`,
        `CREATE TYPE report_type AS ENUM ('inappropriate_content', 'spam', 'scam', 'harassment', 'other');`
    ];

    for (const query of enumQueries) {
        try {
            await pool.query(query);
        } catch (error) {
            // Ignore "already exists" errors for ENUMs
            if (!error.message.includes('already exists')) {
                throw error;
            }
        }
    }
};

/**
 * Create universities table
 */
const createUniversitiesTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS universities (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            domain VARCHAR(100) NOT NULL UNIQUE,
            city VARCHAR(100) NOT NULL,
            state VARCHAR(50) NOT NULL,
            country VARCHAR(50) NOT NULL DEFAULT 'USA',
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_universities_domain ON universities(domain);
    `;
    
    await pool.query(query);
    console.log('✓ Universities table created');
};

/**
 * Create users table
 */
const createUsersTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            phone VARCHAR(20),
            university_id UUID REFERENCES universities(id),
            student_id VARCHAR(50),
            graduation_year INTEGER,
            profile_picture_url TEXT,
            bio TEXT,
            location_address TEXT,
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            role user_role DEFAULT 'student',
            status user_status DEFAULT 'pending_verification',
            email_verified BOOLEAN DEFAULT false,
            email_verification_token VARCHAR(255),
            password_reset_token VARCHAR(255),
            password_reset_expires TIMESTAMP WITH TIME ZONE,
            last_login TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_university ON users(university_id);
        CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    `;
    
    await pool.query(query);
    console.log('✓ Users table created');
};

/**
 * Create categories table with slug column
 */
const createCategoriesTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS categories (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(100) NOT NULL UNIQUE,
            slug VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            icon_url TEXT,
            parent_id UUID REFERENCES categories(id),
            is_active BOOLEAN DEFAULT true,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
        CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
    `;
    
    await pool.query(query);
    console.log('✓ Categories table created');
};

/**
 * Create items table
 */
const createItemsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS items (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            category_id UUID NOT NULL REFERENCES categories(id),
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            condition item_condition NOT NULL,
            status item_status DEFAULT 'available',
            isbn VARCHAR(13),
            brand VARCHAR(100),
            model VARCHAR(100),
            images TEXT[],
            location_address TEXT,
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            is_negotiable BOOLEAN DEFAULT true,
            view_count INTEGER DEFAULT 0,
            is_featured BOOLEAN DEFAULT false,
            expires_at TIMESTAMP WITH TIME ZONE,
            sold_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_items_seller ON items(seller_id);
        CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
        CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
        CREATE INDEX IF NOT EXISTS idx_items_price ON items(price);
    `;
    
    await pool.query(query);
    console.log('✓ Items table created');
};

/**
 * Create roommate_posts table
 */
const createRoommatePostsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS roommate_posts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            budget_min DECIMAL(10, 2),
            budget_max DECIMAL(10, 2),
            preferred_location TEXT,
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            housing_type housing_type,
            move_in_date DATE,
            lease_duration_months INTEGER,
            gender_preference gender_preference,
            status roommate_status DEFAULT 'looking',
            cleanliness_level INTEGER CHECK (cleanliness_level >= 1 AND cleanliness_level <= 5),
            noise_tolerance INTEGER CHECK (noise_tolerance >= 1 AND noise_tolerance <= 5),
            guest_policy INTEGER CHECK (guest_policy >= 1 AND guest_policy <= 5),
            sleep_schedule VARCHAR(50),
            study_habits VARCHAR(50),
            social_level INTEGER CHECK (social_level >= 1 AND social_level <= 5),
            smoking_allowed BOOLEAN DEFAULT false,
            pets_allowed BOOLEAN DEFAULT false,
            alcohol_friendly BOOLEAN DEFAULT false,
            view_count INTEGER DEFAULT 0,
            expires_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_roommate_posts_user ON roommate_posts(user_id);
        CREATE INDEX IF NOT EXISTS idx_roommate_posts_status ON roommate_posts(status);
    `;
    
    await pool.query(query);
    console.log('✓ Roommate posts table created');
};

/**
 * Create messages table
 */
const createMessagesTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS messages (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            item_id UUID REFERENCES items(id) ON DELETE SET NULL,
            roommate_post_id UUID REFERENCES roommate_posts(id) ON DELETE SET NULL,
            content TEXT NOT NULL,
            status message_status DEFAULT 'sent',
            read_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
        CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
        CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
    `;
    
    await pool.query(query);
    console.log('✓ Messages table created');
};

/**
 * Create conversations table
 */
const createConversationsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS conversations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            participant_1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            participant_2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            item_id UUID REFERENCES items(id) ON DELETE SET NULL,
            roommate_post_id UUID REFERENCES roommate_posts(id) ON DELETE SET NULL,
            last_message_id UUID,
            last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(participant_1_id, participant_2_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_item ON conversations(item_id);
    `;
    
    await pool.query(query);
    console.log('✓ Conversations table created');
};

/**
 * Create transactions table
 */
const createTransactionsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS transactions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
            buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            amount DECIMAL(10, 2) NOT NULL,
            status transaction_status DEFAULT 'pending',
            payment_method VARCHAR(50),
            meetup_location TEXT,
            meetup_time TIMESTAMP WITH TIME ZONE,
            completed_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_seller ON transactions(seller_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
    `;
    
    await pool.query(query);
    console.log('✓ Transactions table created');
};

/**
 * Create reviews table
 */
const createReviewsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS reviews (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            item_id UUID REFERENCES items(id) ON DELETE SET NULL,
            rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
            comment TEXT,
            is_public BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(reviewer_id, reviewee_id, item_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
        CREATE INDEX IF NOT EXISTS idx_reviews_item ON reviews(item_id);
    `;
    
    await pool.query(query);
    console.log('✓ Reviews table created');
};

/**
 * Create notifications table
 */
const createNotificationsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(50) NOT NULL,
            related_item_id UUID REFERENCES items(id) ON DELETE SET NULL,
            related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
    `;
    
    await pool.query(query);
    console.log('✓ Notifications table created');
};

/**
 * Create reports table
 */
const createReportsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS reports (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            item_id UUID REFERENCES items(id) ON DELETE SET NULL,
            roommate_post_id UUID REFERENCES roommate_posts(id) ON DELETE SET NULL,
            message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
            type report_type NOT NULL,
            description TEXT NOT NULL,
            status report_status DEFAULT 'pending',
            admin_notes TEXT,
            resolved_by UUID REFERENCES users(id),
            resolved_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
        CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    `;
    
    await pool.query(query);
    console.log('✓ Reports table created');
};

/**
 * Create system_settings table
 */
const createSystemSettingsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS system_settings (
            key VARCHAR(100) PRIMARY KEY,
            value TEXT NOT NULL,
            description TEXT,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
    
    await pool.query(query);
    console.log('✓ System settings table created');
};

/**
 * Create audit_logs table
 */
const createAuditLogsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES users(id),
            action VARCHAR(100) NOT NULL,
            resource_type VARCHAR(50),
            resource_id UUID,
            old_values JSONB,
            new_values JSONB,
            ip_address INET,
            user_agent TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    `;
    
    await pool.query(query);
    console.log('✓ Audit logs table created');
};

/**
 * Insert default data with proper slug values
 */
const insertDefaultData = async () => {
    try {
        // Check if categories already exist
        const existingCategories = await pool.query('SELECT COUNT(*) FROM categories');
        if (parseInt(existingCategories.rows[0].count) > 0) {
            console.log('✓ Categories already exist, skipping default data insertion');
            return;
        }

        // Insert default categories with proper slug values
        const categoriesQuery = `
            INSERT INTO categories (name, slug, description, sort_order, is_active) VALUES
            ('Textbooks', 'textbooks', 'Academic books and study materials', 1, true),
            ('Electronics', 'electronics', 'Laptops, phones, tablets, and accessories', 2, true),
            ('Furniture', 'furniture', 'Dorm and apartment furniture', 3, true),
            ('Clothing', 'clothing', 'Clothes, shoes, and accessories', 4, true),
            ('Kitchen & Dining', 'kitchen-dining', 'Appliances, cookware, and dining items', 5, true),
            ('Sports & Recreation', 'sports-recreation', 'Sports equipment and recreational items', 6, true),
            ('Services', 'services', 'Tutoring, transportation, and other services', 7, true),
            ('Other', 'other', 'Miscellaneous items', 8, true)
            ON CONFLICT (slug) DO NOTHING;
        `;
        
        await pool.query(categoriesQuery);
        
        // Insert default universities
        const universitiesQuery = `
            INSERT INTO universities (name, domain, city, state, latitude, longitude, is_active) VALUES
            ('University of California, Berkeley', 'berkeley.edu', 'Berkeley', 'CA', 37.8719, -122.2585, true),
            ('Stanford University', 'stanford.edu', 'Stanford', 'CA', 37.4419, -122.1430, true),
            ('Harvard University', 'harvard.edu', 'Cambridge', 'MA', 42.3744, -71.1169, true),
            ('MIT', 'mit.edu', 'Cambridge', 'MA', 42.3601, -71.0942, true),
            ('University of Texas at Austin', 'utexas.edu', 'Austin', 'TX', 30.2849, -97.7341, true)
            ON CONFLICT (domain) DO NOTHING;
        `;
        
        await pool.query(universitiesQuery);
        
        // Insert default system settings
        const settingsQuery = `
            INSERT INTO system_settings (key, value, description) VALUES
            ('site_name', 'Campus Cart', 'Name of the application'),
            ('max_file_size', '10485760', 'Maximum file upload size in bytes (10MB)'),
            ('allowed_file_types', '["jpg", "jpeg", "png", "gif", "pdf"]', 'Allowed file extensions'),
            ('email_verification_required', 'true', 'Whether email verification is required'),
            ('max_images_per_item', '5', 'Maximum number of images per item listing'),
            ('transaction_fee_percentage', '0', 'Transaction fee percentage'),
            ('maintenance_mode', 'false', 'Whether the site is in maintenance mode')
            ON CONFLICT (key) DO NOTHING;
        `;
        
        await pool.query(settingsQuery);
        
        console.log('✓ Default data inserted successfully');
    } catch (error) {
        console.error('Error inserting default data:', error);
        throw error;
    }
};

/**
 * Check database connection
 */
export const checkDatabaseConnection = async () => {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('✓ Database connection successful:', result.rows[0].now);
        return true;
    } catch (error) {
        console.error('✗ Database connection failed:', error.message);
        return false;
    }
};

/**
 * Run database migrations
 */
export const runMigrations = async () => {
    try {
        console.log('Running database migrations...');
        await initializeDatabase();
        console.log('✓ Database migrations completed');
    } catch (error) {
        console.error('✗ Database migrations failed:', error);
        throw error;
    }
};

/**
 * Seed database with sample data (for development)
 */
export const seedDatabase = async () => {
    try {
        console.log('Seeding database with sample data...');
        
        if (process.env.NODE_ENV === 'production') {
            console.log('Skipping database seeding in production');
            return;
        }
        
        console.log('✓ Database seeded with sample data');
    } catch (error) {
        console.error('Error seeding database:', error);
    }
};

export default {
    initializeDatabase,
    checkDatabaseConnection,
    runMigrations,
    seedDatabase
};