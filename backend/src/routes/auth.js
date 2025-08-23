import bcrypt from 'bcrypt';
import express from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../config/database.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';
import authenticateToken from '../middleware/authenticateToken.js';
import { verifyEmail } from '../controllers/authController.js';

const router = express.Router();

// Custom validation result handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array()
        });
    }
    next();
};

// Enhanced Rate limiters (more lenient for development)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 100 : 5,
    message: { 
        success: false,
        message: "Too many login attempts, try again later" 
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'development' ? 50 : 3,
    message: { 
        success: false,
        message: "Too many registration attempts, try again later" 
    }
});

// Validation schemas using express-validator
const registerValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .isLength({ min: 6 }) // Reduced for testing
        .withMessage('Password must be at least 6 characters'),
    body('first_name')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('First name is required (max 50 characters)'),
    body('last_name')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Last name is required (max 50 characters)')
];

const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .exists()
        .withMessage('Password is required')
];

// Email transporter setup
const createEmailTransporter = () => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        console.log('SMTP not configured, emails will be skipped');
        return null;
    }

    try {
        return nodemailer.createTransporter({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_PORT == 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            timeout: 10000
        });
    } catch (error) {
        console.error('Email transporter setup failed:', error);
        return null;
    }
};

// Test route
router.get('/test', (req, res) => {
    console.log('Auth test route hit!');
    res.json({ 
        success: true, 
        message: 'Auth routes working!', 
        timestamp: new Date().toISOString() 
    });
});

// Registration route - FIXED
router.post('/register', registerLimiter, registerValidation, handleValidationErrors, async (req, res) => {
    console.log('=== REGISTER ROUTE HIT ===');
    console.log('Request body:', req.body);
    
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

    let client;
    
    try {
        console.log('Getting database client...');
        client = await Promise.race([
            pool.connect(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database connection timeout')), 5000)
            )
        ]);
        
        console.log('Database client acquired');
        await client.query('BEGIN');

        // Check if user already exists
        console.log('Checking if user exists...');
        const userExists = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        
        if (userExists.rows.length > 0) {
            console.log('User already exists');
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                success: false,
                message: "An account with this email already exists" 
            });
        }

        // Hash password
        console.log('Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Insert user
        console.log('Inserting user into database...');
        const result = await client.query(
            `INSERT INTO users (
                first_name, last_name, phone, student_id, email, password_hash, 
                graduation_year, bio, location_address, 
                email_verification_token, email_verified, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
            RETURNING id, email, first_name, last_name`,
            [first_name, last_name, phone, student_id, email, hashedPassword, 
             graduation_year, bio, location_address, verificationToken, 
             process.env.NODE_ENV === 'development', // Auto-verify in development
             process.env.NODE_ENV === 'development' ? 'active' : 'pending_verification']
        );

        await client.query('COMMIT');
        console.log('User created successfully');

        // Try to send email (non-blocking)
        const transporter = createEmailTransporter();
        if (transporter && process.env.NODE_ENV !== 'development') {
            console.log('Attempting to send verification email...');
            try {
                const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}`;
                
                await Promise.race([
                    transporter.sendMail({
                        from: `"Campus Cart" <${process.env.SMTP_USER}>`,
                        to: email,
                        subject: 'Welcome to Campus Cart - Verify Your Email',
                        html: `<h1>Welcome ${first_name}!</h1>
                               <p>Please verify your email: <a href="${verificationUrl}">Verify Email</a></p>`
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Email timeout')), 10000)
                    )
                ]);
                console.log('Verification email sent');
            } catch (emailError) {
                console.error('Email sending failed (continuing anyway):', emailError.message);
            }
        } else {
            console.log('Email sending skipped');
        }

        res.status(201).json({
            success: true,
            message: process.env.NODE_ENV === 'development' 
                ? "Registration successful! (Auto-verified in development)" 
                : "Registration successful! Please check your email to verify your account.",
            data: {
                user: {
                    id: result.rows[0].id,
                    email: result.rows[0].email,
                    first_name: result.rows[0].first_name,
                    last_name: result.rows[0].last_name,
                    email_verified: process.env.NODE_ENV === 'development'
                }
            }
        });

    } catch (err) {
        console.error('Registration error:', err);
        
        if (client) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error('Rollback failed:', rollbackError);
            }
        }
        
        res.status(500).json({ 
            success: false,
            message: "Registration failed. Please try again.",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    } finally {
        if (client) {
            client.release();
        }
    }
});

// Login route - FIXED
router.post('/login', authLimiter, loginValidation, handleValidationErrors, async (req, res) => {
    console.log('=== LOGIN ROUTE HIT ===');
    console.log('Request body:', req.body);
    const { email, password } = req.body;

    try {
        console.log('Querying user from database...');
        
        const userResult = await Promise.race([
            pool.query(
                `SELECT u.*, un.name as university_name, un.domain as university_domain
                 FROM users u
                 LEFT JOIN universities un ON u.university_id = un.id
                 WHERE u.email = $1`,
                [email]
            ),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database query timeout')), 5000)
            )
        ]);

        const user = userResult.rows[0];

        if (!user) {
            console.log('User not found');
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

        // Skip email verification in development
        if (!user.email_verified && process.env.NODE_ENV !== 'development') {
            return res.status(401).json({ 
                success: false,
                message: "Please verify your email address before logging in.",
                code: "EMAIL_NOT_VERIFIED"
            });
        }

        console.log('Verifying password...');
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            console.log('Invalid password');
            return res.status(401).json({ 
                success: false,
                message: "Invalid email or password" 
            });
        }

        // Generate tokens
        const accessToken = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role || 'user',
                verified: user.email_verified || process.env.NODE_ENV === 'development'
            },
            process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '1h' }
        );

        const refreshToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '7d' }
        );

        // Update last login (non-blocking)
        pool.query(
            "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
            [user.id]
        ).catch(err => console.error('Last login update failed:', err));

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
            role: user.role || 'user',
            email_verified: user.email_verified || process.env.NODE_ENV === 'development',
            created_at: user.created_at,
            last_login: user.last_login
        };

        console.log('Login successful for:', user.first_name);

        res.json({
            success: true,
            message: `Welcome back, ${user.first_name}!`,
            data: {
                user: userData,
                token: accessToken
            }
        });

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ 
            success: false,
            message: "Login failed. Please try again.",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userResult = await pool.query(
            `SELECT u.*, un.name as university_name, un.domain as university_domain
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
});

// Logout route
router.post('/logout', authenticateToken, (req, res) => {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    
    res.json({ 
        success: true,
        message: "Logged out successfully" 
    });
});

// Email verification route
router.get('/verify-email/:token', (req, res) => {
    console.log('Verify email route hit with token:', req.params.token);
    verifyEmail(req, res);
});

export default router;