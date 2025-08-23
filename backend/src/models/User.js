import { pool } from '../config/database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

class User {
    constructor(userData) {
        // Core user fields (preserving your existing structure)
        this.id = userData.id;
        this.email = userData.email;
        this.first_name = userData.first_name;
        this.last_name = userData.last_name;
        this.phone = userData.phone;
        this.university_id = userData.university_id;
        this.student_id = userData.student_id;
        this.graduation_year = userData.graduation_year;
        this.profile_picture_url = userData.profile_picture_url;
        this.bio = userData.bio;
        this.location_address = userData.location_address;
        this.latitude = userData.latitude;
        this.longitude = userData.longitude;
        this.role = userData.role;
        this.status = userData.status;
        this.email_verified = userData.email_verified;
        this.created_at = userData.created_at;
        this.updated_at = userData.updated_at;

        // Enhanced fields for better integration
        this.university_name = userData.university_name;
        this.university_domain = userData.university_domain;
        this.last_login = userData.last_login;
        this.email_verification_token = userData.email_verification_token;
        this.password_reset_token = userData.password_reset_token;
        this.password_reset_expires = userData.password_reset_expires;
        
        // Privacy and notification settings (JSON fields)
        this.privacy_settings = userData.privacy_settings || {
            show_phone: false,
            show_email: false,
            profile_visibility: 'students_only'
        };
        
        this.notification_preferences = userData.notification_preferences || {
            email_notifications: true,
            push_notifications: true,
            marketing_emails: false
        };
        
        this.verification_documents = userData.verification_documents;

        // Convert numeric fields
        if (this.latitude) this.latitude = parseFloat(this.latitude);
        if (this.longitude) this.longitude = parseFloat(this.longitude);
        if (this.graduation_year) this.graduation_year = parseInt(this.graduation_year);

        // Parse JSON fields if they're strings
        if (typeof this.privacy_settings === 'string') {
            this.privacy_settings = JSON.parse(this.privacy_settings);
        }
        if (typeof this.notification_preferences === 'string') {
            this.notification_preferences = JSON.parse(this.notification_preferences);
        }
        if (typeof this.verification_documents === 'string') {
            this.verification_documents = JSON.parse(this.verification_documents);
        }
    }

    // Enhanced create method with better validation and features
    static async create(userData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Check if user already exists
            const existingUser = await client.query(
                'SELECT id FROM users WHERE email = $1',
                [userData.email.toLowerCase()]
            );

            if (existingUser.rows.length > 0) {
                throw new Error('User with this email already exists');
            }

            // Hash password with enhanced security
            const saltRounds = 12;
            const password_hash = await bcrypt.hash(userData.password, saltRounds);
            
            // Generate email verification token
            const email_verification_token = crypto.randomBytes(32).toString('hex');

            const query = `
                INSERT INTO users (
                    email, password_hash, first_name, last_name, phone,
                    university_id, student_id, graduation_year, bio,
                    location_address, latitude, longitude, email_verification_token,
                    status, role, privacy_settings, notification_preferences
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                RETURNING id, email, first_name, last_name, university_id, 
                         student_id, graduation_year, status, email_verified, created_at,
                         privacy_settings, notification_preferences
            `;

            const values = [
                userData.email.toLowerCase(),
                password_hash,
                userData.first_name,
                userData.last_name,
                userData.phone || null,
                userData.university_id || null,
                userData.student_id || null,
                userData.graduation_year ? parseInt(userData.graduation_year) : null,
                userData.bio || null,
                userData.location_address || null,
                userData.latitude ? parseFloat(userData.latitude) : null,
                userData.longitude ? parseFloat(userData.longitude) : null,
                email_verification_token,
                'pending_verification',
                'user',
                JSON.stringify({
                    show_phone: false,
                    show_email: false,
                    profile_visibility: 'students_only'
                }),
                JSON.stringify({
                    email_notifications: true,
                    push_notifications: true,
                    marketing_emails: false
                })
            ];

            const result = await client.query(query, values);
            await client.query('COMMIT');

            const user = new User(result.rows[0]);
            user.email_verification_token = email_verification_token;
            
            return user;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Enhanced findByEmail with comprehensive user data
    static async findByEmail(email) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT u.*, un.name as university_name, un.domain as university_domain,
                       (SELECT COUNT(*) FROM items WHERE seller_id = u.id AND status = 'available') as active_listings,
                       (SELECT COUNT(*) FROM items WHERE seller_id = u.id AND status = 'sold') as sold_items,
                       (SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id) as average_rating,
                       (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as total_reviews
                FROM users u
                LEFT JOIN universities un ON u.university_id = un.id
                WHERE u.email = $1
            `;
            const result = await client.query(query, [email.toLowerCase()]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            const user = new User(result.rows[0]);
            user.active_listings = parseInt(user.active_listings || 0);
            user.sold_items = parseInt(user.sold_items || 0);
            user.average_rating = user.average_rating ? parseFloat(user.average_rating) : null;
            user.total_reviews = parseInt(user.total_reviews || 0);
            
            return user;
        } finally {
            client.release();
        }
    }

    // Enhanced findById with comprehensive data
    static async findById(id, includeStats = false) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT u.*, un.name as university_name, un.domain as university_domain
            `;

            if (includeStats) {
                query += `,
                    (SELECT COUNT(*) FROM items WHERE seller_id = u.id AND status = 'available') as active_listings,
                    (SELECT COUNT(*) FROM items WHERE seller_id = u.id AND status = 'sold') as sold_items,
                    (SELECT COUNT(*) FROM roommate_posts WHERE user_id = u.id AND status = 'looking') as active_roommate_posts,
                    (SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id) as average_rating,
                    (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as total_reviews,
                    (SELECT COUNT(*) FROM saved_items si JOIN items i ON si.item_id = i.id WHERE si.user_id = u.id) as saved_items_count
                `;
            }

            query += `
                FROM users u
                LEFT JOIN universities un ON u.university_id = un.id
                WHERE u.id = $1
            `;

            const result = await client.query(query, [id]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            const user = new User(result.rows[0]);

            if (includeStats) {
                user.active_listings = parseInt(user.active_listings || 0);
                user.sold_items = parseInt(user.sold_items || 0);
                user.active_roommate_posts = parseInt(user.active_roommate_posts || 0);
                user.average_rating = user.average_rating ? parseFloat(user.average_rating) : null;
                user.total_reviews = parseInt(user.total_reviews || 0);
                user.saved_items_count = parseInt(user.saved_items_count || 0);
            }
            
            return user;
        } finally {
            client.release();
        }
    }

    // Enhanced update method with better validation
    async update(updateData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const fields = [];
            const values = [];
            let paramCount = 1;

            // Build dynamic update query with validation
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined && key !== 'id') {
                    if (['privacy_settings', 'notification_preferences', 'verification_documents'].includes(key)) {
                        fields.push(`${key} = $${paramCount}`);
                        values.push(JSON.stringify(updateData[key]));
                    } else if (key === 'email') {
                        fields.push(`${key} = $${paramCount}`);
                        values.push(updateData[key].toLowerCase());
                    } else if (['latitude', 'longitude'].includes(key)) {
                        fields.push(`${key} = $${paramCount}`);
                        values.push(updateData[key] ? parseFloat(updateData[key]) : null);
                    } else if (key === 'graduation_year') {
                        fields.push(`${key} = $${paramCount}`);
                        values.push(updateData[key] ? parseInt(updateData[key]) : null);
                    } else {
                        fields.push(`${key} = $${paramCount}`);
                        values.push(updateData[key]);
                    }
                    paramCount++;
                }
            });

            if (fields.length === 0) {
                throw new Error('No fields to update');
            }

            fields.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(this.id);

            const query = `
                UPDATE users 
                SET ${fields.join(', ')}
                WHERE id = $${paramCount}
                RETURNING *
            `;

            const result = await client.query(query, values);
            
            if (result.rows.length === 0) {
                throw new Error('User not found');
            }

            await client.query('COMMIT');

            // Update current instance
            Object.assign(this, result.rows[0]);

            // Parse JSON fields
            if (typeof this.privacy_settings === 'string') {
                this.privacy_settings = JSON.parse(this.privacy_settings);
            }
            if (typeof this.notification_preferences === 'string') {
                this.notification_preferences = JSON.parse(this.notification_preferences);
            }
            if (typeof this.verification_documents === 'string') {
                this.verification_documents = JSON.parse(this.verification_documents);
            }

            return this;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Enhanced password comparison (your existing logic preserved)
    async comparePassword(candidatePassword) {
        const client = await pool.connect();
        try {
            const query = 'SELECT password_hash FROM users WHERE id = $1';
            const result = await client.query(query, [this.id]);
            
            if (result.rows.length === 0) {
                return false;
            }
            
            return await bcrypt.compare(candidatePassword, result.rows[0].password_hash);
        } finally {
            client.release();
        }
    }

    // Static method for password comparison by email (for login)
    static async validateLogin(email, password) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT u.*, un.name as university_name, un.domain as university_domain
                FROM users u
                LEFT JOIN universities un ON u.university_id = un.id
                WHERE u.email = $1
            `;
            const result = await client.query(query, [email.toLowerCase()]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            const userData = result.rows[0];
            const isValid = await bcrypt.compare(password, userData.password_hash);
            
            if (!isValid) {
                return null;
            }
            
            // Update last login
            await client.query(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
                [userData.id]
            );
            
            return new User(userData);
        } finally {
            client.release();
        }
    }

    // Enhanced password update with security
    async updatePassword(newPassword, currentPassword = null) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Verify current password if provided
            if (currentPassword) {
                const isCurrentValid = await this.comparePassword(currentPassword);
                if (!isCurrentValid) {
                    throw new Error('Current password is incorrect');
                }
            }

            const saltRounds = 12;
            const password_hash = await bcrypt.hash(newPassword, saltRounds);
            
            const query = `
                UPDATE users 
                SET password_hash = $1, 
                    password_reset_token = NULL,
                    password_reset_expires = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `;
            
            await client.query(query, [password_hash, this.id]);
            await client.query('COMMIT');
            
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Enhanced email verification with better error handling
    static async verifyEmail(token) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const query = `
                UPDATE users 
                SET email_verified = true, 
                    email_verification_token = NULL,
                    status = 'active',
                    updated_at = CURRENT_TIMESTAMP
                WHERE email_verification_token = $1 AND email_verified = false
                RETURNING id, email, first_name, last_name, status
            `;
            
            const result = await client.query(query, [token]);
            
            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return null;
            }
            
            await client.query('COMMIT');
            return new User(result.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Enhanced password reset token generation
    async setPasswordResetToken() {
        const client = await pool.connect();
        try {
            const token = crypto.randomBytes(32).toString('hex');
            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
            const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
            
            const query = `
                UPDATE users 
                SET password_reset_token = $1,
                    password_reset_expires = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
            `;
            
            await client.query(query, [hashedToken, expires, this.id]);
            return token; // Return unhashed token for email
        } finally {
            client.release();
        }
    }

    // Enhanced password reset with token
    static async resetPasswordWithToken(token, newPassword) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
            
            // Check if token is valid and not expired
            const checkQuery = `
                SELECT id, email, first_name, last_name FROM users 
                WHERE password_reset_token = $1 
                AND password_reset_expires > CURRENT_TIMESTAMP
            `;
            
            const checkResult = await client.query(checkQuery, [hashedToken]);
            
            if (checkResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return null;
            }
            
            // Hash new password
            const saltRounds = 12;
            const password_hash = await bcrypt.hash(newPassword, saltRounds);
            
            // Update password and clear reset token
            const updateQuery = `
                UPDATE users 
                SET password_hash = $1,
                    password_reset_token = NULL,
                    password_reset_expires = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING id, email, first_name, last_name
            `;
            
            const result = await client.query(updateQuery, [password_hash, checkResult.rows[0].id]);
            await client.query('COMMIT');
            
            return new User(result.rows);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Update last login (your existing method preserved)
    async updateLastLogin() {
        const client = await pool.connect();
        try {
            const query = `
                UPDATE users 
                SET last_login = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `;
            
            await client.query(query, [this.id]);
            this.last_login = new Date();
        } finally {
            client.release();
        }
    }

    // Enhanced stats with more comprehensive data
    async getStats() {
        const client = await pool.connect();
        try {
            const query = `
                SELECT 
                    (SELECT COUNT(*) FROM items WHERE seller_id = $1 AND status = 'available') as active_listings,
                    (SELECT COUNT(*) FROM items WHERE seller_id = $1 AND status = 'sold') as sold_items,
                    (SELECT COUNT(*) FROM items WHERE seller_id = $1 AND status = 'reserved') as reserved_items,
                    (SELECT COUNT(*) FROM roommate_posts WHERE user_id = $1 AND status = 'looking') as active_roommate_posts,
                    (SELECT AVG(rating) FROM reviews WHERE reviewee_id = $1) as average_rating,
                    (SELECT COUNT(*) FROM reviews WHERE reviewee_id = $1) as total_reviews,
                    (SELECT COUNT(*) FROM reviews WHERE reviewer_id = $1) as reviews_given,
                    (SELECT COUNT(*) FROM saved_items WHERE user_id = $1) as saved_items,
                    (SELECT COUNT(*) FROM messages WHERE sender_id = $1 OR recipient_id = $1) as total_messages,
                    (SELECT COUNT(*) FROM messages WHERE recipient_id = $1 AND read_at IS NULL) as unread_messages,
                    (SELECT COALESCE(SUM(view_count), 0) FROM items WHERE seller_id = $1) as total_views
            `;
            
            const result = await client.query(query, [this.id]);
            const stats = result.rows[0];
            
            return {
                active_listings: parseInt(stats.active_listings),
                sold_items: parseInt(stats.sold_items),
                reserved_items: parseInt(stats.reserved_items),
                active_roommate_posts: parseInt(stats.active_roommate_posts),
                average_rating: stats.average_rating ? parseFloat(stats.average_rating) : null,
                total_reviews: parseInt(stats.total_reviews),
                reviews_given: parseInt(stats.reviews_given),
                saved_items: parseInt(stats.saved_items),
                total_messages: parseInt(stats.total_messages),
                unread_messages: parseInt(stats.unread_messages),
                total_views: parseInt(stats.total_views)
            };
        } finally {
            client.release();
        }
    }

    // Enhanced user search with better filters
    static async search(searchParams) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT u.id, u.first_name, u.last_name, u.profile_picture_url,
                       u.bio, u.university_id, un.name as university_name,
                       u.graduation_year, u.created_at,
                       (SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id) as average_rating,
                       (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as review_count,
                       (SELECT COUNT(*) FROM items WHERE seller_id = u.id AND status = 'available') as active_listings
                FROM users u
                LEFT JOIN universities un ON u.university_id = un.id
                WHERE u.status = 'active' AND u.email_verified = true
                AND (u.privacy_settings->>'profile_visibility' = 'public' OR u.privacy_settings->>'profile_visibility' = 'students_only')
            `;
            
            const values = [];
            let paramCount = 1;

            // Search filter (enhanced)
            if (searchParams.q || searchParams.query) {
                const searchTerm = searchParams.q || searchParams.query;
                query += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.bio ILIKE $${paramCount})`;
                values.push(`%${searchTerm}%`);
                paramCount++;
            }

            // University filter
            if (searchParams.university_id) {
                query += ` AND u.university_id = $${paramCount}`;
                values.push(searchParams.university_id);
                paramCount++;
            }

            // Graduation year filter
            if (searchParams.graduation_year) {
                query += ` AND u.graduation_year = $${paramCount}`;
                values.push(parseInt(searchParams.graduation_year));
                paramCount++;
            }

            // Role filter
            if (searchParams.role) {
                query += ` AND u.role = $${paramCount}`;
                values.push(searchParams.role);
                paramCount++;
            }

            // Add ordering
            const sortOptions = {
                'newest': 'u.created_at DESC',
                'oldest': 'u.created_at ASC',
                'name': 'u.first_name ASC, u.last_name ASC',
                'rating': 'average_rating DESC NULLS LAST',
                'active': 'active_listings DESC'
            };

            const sortBy = sortOptions[searchParams.sort] || 'u.created_at DESC';
            query += ` ORDER BY ${sortBy}`;

            // Add pagination
            const limit = Math.min(parseInt(searchParams.limit) || 20, 100);
            const offset = (parseInt(searchParams.page) - 1 || 0) * limit;
            
            query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
            values.push(limit, offset);

            const result = await client.query(query, values);
            
            const users = result.rows.map(row => {
                const user = new User(row);
                user.average_rating = user.average_rating ? parseFloat(user.average_rating) : null;
                user.review_count = parseInt(user.review_count || 0);
                user.active_listings = parseInt(user.active_listings || 0);
                return user;
            });

            return users;
        } finally {
            client.release();
        }
    }

    // Enhanced delete with better cleanup
    async delete() {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Mark items as inactive
            await client.query(
                'UPDATE items SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE seller_id = $2',
                ['inactive', this.id]
            );

            // Mark roommate posts as inactive
            await client.query(
                'UPDATE roommate_posts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
                ['inactive', this.id]
            );

            // Remove from saved items
            await client.query('DELETE FROM saved_items WHERE user_id = $1', [this.id]);

            // Soft delete user
            const query = `
                UPDATE users 
                SET status = 'inactive',
                    email = CONCAT('deleted_', id, '_', email),
                    email_verification_token = NULL,
                    password_reset_token = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `;
            
            await client.query(query, [this.id]);
            await client.query('COMMIT');

            this.status = 'inactive';
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Update privacy settings
    async updatePrivacySettings(settings) {
        const updatedSettings = {
            ...this.privacy_settings,
            ...settings
        };

        await this.update({ privacy_settings: updatedSettings });
        return this.privacy_settings;
    }

    // Update notification preferences
    async updateNotificationPreferences(preferences) {
        const updatedPreferences = {
            ...this.notification_preferences,
            ...preferences
        };

        await this.update({ notification_preferences: updatedPreferences });
        return this.notification_preferences;
    }

    // Check if user can view another user's profile
    canViewProfile(viewerUser = null) {
        if (this.privacy_settings.profile_visibility === 'public') {
            return true;
        }

        if (this.privacy_settings.profile_visibility === 'students_only' && viewerUser) {
            return true;
        }

        return false;
    }

    // Get full name
    getFullName() {
        return `${this.first_name} ${this.last_name}`;
    }

    // Get initials
    getInitials() {
        return `${this.first_name.charAt(0)}${this.last_name.charAt(0)}`.toUpperCase();
    }

    // Check if user is active
    isActive() {
        return this.status === 'active' && this.email_verified;
    }

    // Check if user is verified
    isVerified() {
        return this.email_verified;
    }

    // Enhanced safe object conversion with privacy controls
    toSafeObject(viewerUser = null) {
        const canViewProfile = this.canViewProfile(viewerUser);
        
        const safeUser = {
            id: this.id,
            first_name: this.first_name,
            last_name: this.last_name,
            profile_picture_url: this.profile_picture_url,
            university_id: this.university_id,
            university_name: this.university_name,
            graduation_year: this.graduation_year,
            created_at: this.created_at,
            status: this.status,
            email_verified: this.email_verified
        };

        if (canViewProfile) {
            safeUser.bio = this.bio;
            safeUser.location_address = this.location_address;

            // Show contact info based on privacy settings
            if (this.privacy_settings.show_email) {
                safeUser.email = this.email;
            }
            if (this.privacy_settings.show_phone) {
                safeUser.phone = this.phone;
            }
        }

        // Include stats if available
        if (this.active_listings !== undefined) {
            safeUser.active_listings = this.active_listings;
        }
        if (this.sold_items !== undefined) {
            safeUser.sold_items = this.sold_items;
        }
        if (this.average_rating !== undefined) {
            safeUser.average_rating = this.average_rating;
        }
        if (this.total_reviews !== undefined) {
            safeUser.total_reviews = this.total_reviews;
        }

        return safeUser;
    }

    // Convert to full object (for owner's view)
    toFullObject() {
        const {
            password_hash,
            email_verification_token,
            password_reset_token,
            password_reset_expires,
            ...fullUser
        } = this;
        
        return fullUser;
    }

    // Admin view (includes sensitive data)
    toAdminObject() {
        return {
            ...this,
            // Exclude only the actual password hash
            password_hash: undefined
        };
    }
}

export default User;
