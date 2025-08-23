import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { pool, withTransaction } from '../config/database.js';

// Email transporter setup
const createEmailTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === '465',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

// Generate JWT tokens
const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { 
            userId: user.id, 
            email: user.email, 
            role: user.role,
            verified: user.email_verified
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
};

// Register User
export const register = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        console.log('Registration request body:', req.body);

        const { 
            first_name, 
            last_name, 
            phone, 
            student_id, 
            email, 
            password, 
            graduation_year, 
            bio, 
            location_address,
            university_id 
        } = req.body;
        
        console.log('Extracted fields:', { 
            first_name, 
            last_name, 
            phone, 
            student_id, 
            email, 
            password: '***', 
            graduation_year, 
            bio, 
            location_address,
            university_id 
        });

        // Check if user already exists
        const userExists = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        
        if (userExists.rows.length > 0) {
            return res.status(400).json({ 
                success: false,
                message: "An account with this email already exists" 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Insert user
        const result = await client.query(
            `INSERT INTO users (
                first_name, last_name, phone, student_id, email, password_hash, 
                university_id, graduation_year, bio, location_address, 
                email_verification_token, email_verified, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, 'pending_verification') 
            RETURNING id, email, first_name, last_name`,
            [first_name, last_name, phone, student_id, email, hashedPassword, 
             university_id, graduation_year, bio, location_address, verificationToken]
        );

        await client.query('COMMIT');

        // Send verification email
        try {
            const transporter = createEmailTransporter();
            const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}`;

            await transporter.sendMail({
                from: `"Campus Cart" <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'Welcome to Campus Cart - Verify Your Email',
                html: `
                    <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
                            <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">🎒 Campus Cart</h1>
                            <p style="color: rgba(255,255,255,0.95); margin: 12px 0 0; font-size: 18px; font-weight: 500;">Your Campus Marketplace</p>
                        </div>
                        <div style="background: #ffffff; padding: 50px 40px; border-radius: 0 0 16px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
                            <h2 style="color: #1f2937; margin: 0 0 24px; font-size: 28px; font-weight: 700;">Welcome ${first_name}! 🎉</h2>
                            <p style="color: #6b7280; line-height: 1.7; margin: 0 0 32px; font-size: 16px;">
                                Thank you for joining Campus Cart! You're just one step away from buying and selling items with fellow students.
                            </p>
                            <div style="text-align: center; margin: 40px 0;">
                                <a href="${verificationUrl}" 
                                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                          color: white; 
                                          padding: 18px 36px; 
                                          text-decoration: none; 
                                          border-radius: 12px; 
                                          display: inline-block;
                                          font-weight: 600;
                                          font-size: 16px;
                                          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                                    ✅ Verify Email Address
                                </a>
                            </div>
                            <p style="color: #9ca3af; font-size: 14px; margin: 32px 0 0; text-align: center; line-height: 1.5;">
                                This verification link expires in 24 hours. If you didn't create this account, please ignore this email.
                            </p>
                        </div>
                    </div>
                `
            });
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            // Don't fail registration if email fails
        }

        res.status(201).json({
            success: true,
            message: "Registration successful! Please check your email to verify your account.",
            data: {
                user: {
                    id: result.rows[0].id,
                    email: result.rows.email,         // INCORRECT: should be result.rows[0].email
                    first_name: result.rows.first_name, // INCORRECT: should be result.rows[0].first_name
                    last_name: result.rows.last_name,   // INCORRECT: should be result.rows[0].last_name
                    email_verified: false
                }
            }
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Registration error:', err);
        res.status(500).json({ 
            success: false,
            message: "Registration failed. Please try again." 
        });
    } finally {
        client.release();
    }
};

// Login User
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const userResult = await pool.query(
            `SELECT u.*, un.name as university_name, un.domain as university_domain
             FROM users u
             LEFT JOIN universities un ON u.university_id = un.id
             WHERE u.email = $1`,
            [email]
        );

        const user = userResult.rows[0];

        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: "Invalid email or password" 
            });
        }

        // Check account status
        if (user.status === 'suspended') {
            return res.status(401).json({ 
                success: false,
                message: "Your account has been suspended. Please contact support." 
            });
        }

        if (!user.email_verified) {
            return res.status(401).json({ 
                success: false,
                message: "Please verify your email address before logging in. Check your inbox!",
                code: "EMAIL_NOT_VERIFIED"
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false,
                message: "Invalid email or password" 
            });
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user);

        // Update last login
        await pool.query(
            "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
            [user.id]
        );

        // Set secure cookies
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 60 * 1000 // 1 hour
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Return user data
        const userData = {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            profile_picture_url: user.profile_picture_url,
            bio: user.bio,
            phone: user.phone,
            university_id: user.university_id,
            university_name: user.university_name,
            student_id: user.student_id,
            graduation_year: user.graduation_year,
            location_address: user.location_address,
            status: user.status,
            role: user.role,
            email_verified: user.email_verified,
            created_at: user.created_at,
            last_login: user.last_login
        };

        res.json({
            success: true,
            message: `Welcome back, ${user.first_name}! 🎉`,
            data: {
                user: userData,
                token: accessToken
            }
        });

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ 
            success: false,
            message: "Login failed. Please try again." 
        });
    }
};

// Get Current User
export const getMe = async (req, res) => {
    try {
        const userResult = await pool.query(
            `SELECT u.*, un.name as university_name, un.domain as university_domain,
                    (SELECT COUNT(*) FROM items WHERE seller_id = u.id AND status = 'available') as active_listings,
                    (SELECT COUNT(*) FROM items WHERE seller_id = u.id AND status = 'sold') as sold_items,
                    (SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id) as average_rating,
                    (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as total_reviews
             FROM users u
             LEFT JOIN universities un ON u.university_id = un.id
             WHERE u.id = $1`,
            [req.user.userId]
        );

        const user = userResult.rows[0];
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Remove sensitive data
        delete user.password_hash;
        delete user.email_verification_token;
        delete user.password_reset_token;
        delete user.password_reset_expires;

        res.json({
            success: true,
            data: { user }
        });

    } catch (err) {
        console.error("Error fetching user profile:", err);
        res.status(500).json({ 
            success: false,
            message: "Failed to fetch user profile" 
        });
    }
};

// Update Profile
export const updateProfile = async (req, res) => {
    const {
        first_name,
        last_name,
        bio,
        phone,
        student_id,
        graduation_year,
        location_address,
        latitude,
        longitude
    } = req.body;

    try {
        const updateResult = await pool.query(
            `UPDATE users 
             SET first_name = COALESCE($1, first_name),
                 last_name = COALESCE($2, last_name),
                 bio = COALESCE($3, bio),
                 phone = COALESCE($4, phone),
                 student_id = COALESCE($5, student_id),
                 graduation_year = COALESCE($6, graduation_year),
                 location_address = COALESCE($7, location_address),
                 latitude = COALESCE($8, latitude),
                 longitude = COALESCE($9, longitude),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $10
             RETURNING id, first_name, last_name, bio, phone, student_id, graduation_year, location_address`,
            [first_name, last_name, bio, phone, student_id, graduation_year, location_address, latitude, longitude, req.user.userId]
        );

        if (updateResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            message: "Profile updated successfully",
            data: { user: updateResult.rows[0] }
        });

    } catch (err) {
        console.error("Profile update error:", err);
        res.status(500).json({
            success: false,
            message: "Failed to update profile"
        });
    }
};

// Verify Email
export const verifyEmail = async (req, res) => {
    const { token } = req.params;

    try {
        const result = await pool.query(
            `SELECT id, email, first_name FROM users WHERE email_verification_token = $1`,
            [token]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification link.',
                code: 'INVALID_TOKEN'
            });
        }

        // Update user as verified
        await pool.query(
            `UPDATE users 
             SET email_verified = true, 
                 email_verification_token = NULL,
                 status = 'active',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [user.id]
        );

        res.json({
            success: true,
            message: `Welcome to Campus Cart, ${user.first_name}! Your email has been verified successfully.`
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify email. Please try again.'
        });
    }
};

// Forgot Password
export const forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "Email address is required"
        });
    }

    try {
        const userResult = await pool.query(
            "SELECT id, first_name, email FROM users WHERE email = $1 AND email_verified = true",
            [email]
        );

        const user = userResult.rows[0];

        // Always return success message for security
        const successMessage = "If an account with that email exists, we've sent a password reset link.";

        if (!user) {
            return res.json({
                success: true,
                message: successMessage
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        // Save token to database
        await pool.query(
            "UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3",
            [hashedResetToken, resetTokenExpiry, user.id]
        );

        // Send reset email
        try {
            const transporter = createEmailTransporter();
            const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;

            await transporter.sendMail({
                from: `"Campus Cart" <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'Password Reset Request - Campus Cart',
                html: `
                    <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
                            <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">🔒 Password Reset</h1>
                        </div>
                        <div style="background: #ffffff; padding: 50px 40px; border-radius: 0 0 16px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
                            <h2 style="color: #1f2937; margin: 0 0 24px; font-size: 24px;">Hi ${user.first_name},</h2>
                            <p style="color: #6b7280; line-height: 1.7; margin: 0 0 32px; font-size: 16px;">
                                We received a request to reset your Campus Cart password. Click the button below to create a new password.
                            </p>
                            <div style="text-align: center; margin: 40px 0;">
                                <a href="${resetUrl}" 
                                   style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); 
                                          color: white; 
                                          padding: 18px 36px; 
                                          text-decoration: none; 
                                          border-radius: 12px; 
                                          display: inline-block;
                                          font-weight: 600;
                                          font-size: 16px;
                                          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">
                                    🔑 Reset Password
                                </a>
                            </div>
                            <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 12px; margin: 32px 0;">
                                <p style="color: #dc2626; margin: 0; font-size: 14px; font-weight: 500;">
                                    ⚠️ This link expires in 30 minutes. If you didn't request this reset, please ignore this email.
                                </p>
                            </div>
                        </div>
                    </div>
                `
            });
        } catch (emailError) {
            console.error('Password reset email failed:', emailError);
        }

        res.json({
            success: true,
            message: successMessage
        });

    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({
            success: false,
            message: "Failed to process password reset request"
        });
    }
};

// Reset Password
export const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        const hashedResetToken = crypto.createHash('sha256').update(token).digest('hex');

        const userResult = await pool.query(
            `SELECT id, email, first_name FROM users 
             WHERE password_reset_token = $1 AND password_reset_expires > CURRENT_TIMESTAMP`,
            [hashedResetToken]
        );

        const user = userResult.rows[0];

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token. Please request a new password reset.'
            });
        }

        // Hash new password and update
        const hashedPassword = await bcrypt.hash(password, 12);
        await pool.query(
            `UPDATE users 
             SET password_hash = $1, 
                 password_reset_token = NULL, 
                 password_reset_expires = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [hashedPassword, user.id]
        );

        res.json({
            success: true,
            message: 'Password has been reset successfully. You can now log in with your new password.'
        });

    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password. Please try again.'
        });
    }
};

// Refresh Token
export const refreshToken = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({
            success: false,
            message: "No refresh token provided"
        });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
        
        // Get user data
        const userResult = await pool.query(
            "SELECT id, email, role, email_verified FROM users WHERE id = $1 AND status = 'active'",
            [decoded.userId]
        );

        const user = userResult.rows[0];
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token"
            });
        }

        // Generate new access token
        const { accessToken } = generateTokens(user);

        // Set new access token cookie
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 60 * 1000 // 1 hour
        });

        res.json({
            success: true,
            message: "Token refreshed successfully",
            data: { token: accessToken }
        });

    } catch (err) {
        console.error('Token refresh error:', err);
        res.status(401).json({
            success: false,
            message: "Invalid refresh token"
        });
    }
};

// Logout
export const logout = (req, res) => {
    // Clear both tokens
    res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    });

    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    });

    res.json({ 
        success: true,
        message: "Logged out successfully" 
    });
};

// Resend Verification Email
export const resendVerification = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "Email address is required"
        });
    }

    try {
        const userResult = await pool.query(
            "SELECT id, first_name, email, email_verified FROM users WHERE email = $1",
            [email]
        );

        const user = userResult.rows[0];

        if (!user) {
            return res.json({
                success: true,
                message: "If an account with that email exists, we've sent a verification link."
            });
        }

        if (user.email_verified) {
            return res.status(400).json({
                success: false,
                message: "This email address is already verified."
            });
        }

        // Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        
        await pool.query(
            "UPDATE users SET email_verification_token = $1 WHERE id = $2",
            [verificationToken, user.id]
        );

        // Send verification email
        const transporter = createEmailTransporter();
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}`;

        await transporter.sendMail({
            from: `"Campus Cart" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Verify Your Campus Cart Account',
            html: `
                <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                    <div style="background: #667eea; padding: 30px; text-align: center; color: white;">
                        <h1>🎒 Campus Cart</h1>
                        <p>Email Verification</p>
                    </div>
                    <div style="padding: 30px; background: white;">
                        <h2>Hi ${user.first_name}!</h2>
                        <p>Please verify your email address to complete your registration:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationUrl}" 
                               style="background: #667eea; color: white; padding: 15px 30px; 
                                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                                Verify Email Address
                            </a>
                        </div>
                        <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
                    </div>
                </div>
            `
        });

        res.json({
            success: true,
            message: "Verification email sent successfully."
        });

    } catch (err) {
        console.error('Resend verification error:', err);
        res.status(500).json({
            success: false,
            message: "Failed to resend verification email."
        });
    }
};
