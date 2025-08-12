import bcrypt from 'bcrypt';
import express, { json } from 'express';
import db from '../config/database.js'; 
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const pool = db.pool; 
const route = express.Router();
route.use(express.json())


route.post('/register',async (req,res)=>{
    const {first_name,last_name, phone, student_id, email, password}=req.body;

    if(!first_name||!last_name||!phone||!student_id||!email||!password){
        return res.status(400).json({error:"All fields are Required"})
    }

    try{
        const existing = await pool.query("SELECT * FROM users WHERE email=$1",[email]);
        if(existing.rows.length>0){
            res.status(400).json({error : "Email already exits"})
        }

        const hashed_password = await bcrypt.hash(password, 10);

        await pool.query("INSERT INTO users (first_name,last_name, phone, student_id, email, password_hash) VALUES ($1,$2,$3,$4,$5,$6)",
            [first_name,last_name, phone, student_id, email, hashed_password])

            return res.status(201).json({ message: "User registered successfully" });
    }

    catch(err){
        console.error("Registration error:", err.message);
    res.status(500).json({ error: "Server error" });
    }
});

route.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        // Test database connection first
        const isConnected = await db.testConnection();
        if (!isConnected) {
            throw new Error('Database connection failed');
        }

        // Check if user exists
        const userResult = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        const user = userResult.rows[0];

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Verify JWT_SECRET exists
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured');
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remove password_hash from user object before sending
        delete user.password_hash;

        res.json({
            message: "Login successful",
            token,
            user
        });

    } catch (err) {
        console.error("Login error:", err);
        
        // Send more specific error messages
        if (err.message === 'Database connection failed') {
            return res.status(503).json({ message: "Database connection error" });
        }
        if (err.message === 'JWT_SECRET is not configured') {
            return res.status(500).json({ message: "Server configuration error" });
        }
        
        res.status(500).json({ message: "Server error during login" });
    }
});

// Forgot Password Route
route.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        // Find user by email
        const userResult = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ message: "No account with that email address exists." });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

        // Save token to database
        await pool.query(
            "UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE email = $3",
            [resetToken, resetTokenExpiry, email]
        );

        // Create reset URL
        const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

        // Send email
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        await transporter.sendMail({
            to: email,
            subject: 'Password Reset Request',
            html: `
                <h1>Password Reset Request</h1>
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <a href="${resetUrl}">Reset Password</a>
                <p>If you didn't request this, please ignore this email.</p>
                <p>This link will expire in 1 hour.</p>
            `
        });

        res.json({ message: "Password reset link sent to your email address." });

    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ message: "Error sending password reset email." });
    }
});

// Reset Password Route
route.post('/reset-password/:token', async (req, res) => {
    const { password } = req.body;
    const { token } = req.params;

    try {
        // Find user with valid reset token
        const userResult = await pool.query(
            "SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()",
            [token]
        );

        const user = userResult.rows[0];

        if (!user) {
            return res.status(400).json({ message: "Password reset token is invalid or has expired." });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update password and clear reset token
        await pool.query(
            "UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2",
            [hashedPassword, user.id]
        );

        res.json({ message: "Password has been reset successfully." });

    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ message: "Error resetting password." });
    }
});

export default route;