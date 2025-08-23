// 


import nodemailer from 'nodemailer';

// Enhanced transporter configuration (preserving your existing setup)
const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    // Enhanced settings for better reliability
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5
});

// Verify transporter configuration
export const verifyEmailConfig = async () => {
    try {
        await transporter.verify();
        console.log('✅ Email service configured successfully');
        return true;
    } catch (error) {
        console.error('❌ Email configuration error:', error);
        return false;
    }
};

// Your existing sendVerificationEmail function (enhanced)
export const sendVerificationEmail = async (email, firstName, token) => {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
    
    try {
        await transporter.sendMail({
            from: `"Campus Cart" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Verify your Campus Cart account',
            html: `
                <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8f9fa; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">🎒 Campus Cart</h1>
                        <p style="color: rgba(255,255,255,0.95); margin: 12px 0 0; font-size: 18px; font-weight: 500;">Your Campus Marketplace</p>
                    </div>
                    <div style="background: #ffffff; padding: 50px 40px; border-radius: 0 0 16px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
                        <h2 style="color: #1f2937; margin: 0 0 24px; font-size: 28px; font-weight: 700;">Welcome ${firstName}! 🎉</h2>
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
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                            © ${new Date().getFullYear()} Campus Cart. All rights reserved.
                        </p>
                    </div>
                </div>
            `
        });
        
        console.log(`📧 Verification email sent to: ${email}`);
        
    } catch (error) {
        console.error('❌ Failed to send verification email:', error);
        throw new Error(`Failed to send verification email: ${error.message}`);
    }
};

// Your existing sendPasswordResetEmail function (enhanced)
export const sendPasswordResetEmail = async (email, token) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    
    try {
        await transporter.sendMail({
            from: `"Campus Cart" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8f9fa; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">🔒 Password Reset</h1>
                        <p style="color: rgba(255,255,255,0.95); margin: 12px 0 0; font-size: 18px; font-weight: 500;">Campus Cart Security</p>
                    </div>
                    <div style="background: #ffffff; padding: 50px 40px; border-radius: 0 0 16px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
                        <h2 style="color: #1f2937; margin: 0 0 24px; font-size: 24px; font-weight: 700;">Password Reset Request</h2>
                        <p style="color: #6b7280; line-height: 1.7; margin: 0 0 32px; font-size: 16px;">
                            You requested to reset your password for Campus Cart. Click the button below to create a new password:
                        </p>
                        <div style="text-align: center; margin: 40px 0;">
                            <a href="${resetUrl}" 
                               style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); 
                                      color: white; 
                                      padding: 18px 36px; 
                                      text-decoration: none; 
                                      border-radius: 12px; 
                                      display: inline-block;
                                      font-weight: 600;
                                      font-size: 16px;
                                      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);">
                                🔑 Reset Password
                            </a>
                        </div>
                        <p style="color: #9ca3af; font-size: 14px; margin: 32px 0 0; text-align: center; line-height: 1.5;">
                            This reset link expires in 1 hour. If you didn't request this reset, please ignore this email.
                        </p>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                            © ${new Date().getFullYear()} Campus Cart. All rights reserved.
                        </p>
                    </div>
                </div>
            `
        });
        
        console.log(`📧 Password reset email sent to: ${email}`);
        
    } catch (error) {
        console.error('❌ Failed to send password reset email:', error);
        throw new Error(`Failed to send password reset email: ${error.message}`);
    }
};

// Additional enhanced email functions for your application

// Welcome email after successful verification
export const sendWelcomeEmail = async (email, firstName) => {
    try {
        await transporter.sendMail({
            from: `"Campus Cart" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Welcome to Campus Cart! 🎉',
            html: `
                <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                    <div style="background: #28a745; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">🎒 Welcome to Campus Cart!</h1>
                    </div>
                    <div style="background: #ffffff; padding: 40px; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
                        <h2 style="color: #333;">Hi ${firstName}!</h2>
                        <p>Your account has been successfully verified. You can now:</p>
                        <ul style="color: #666; line-height: 1.6;">
                            <li>📱 Browse items from fellow students</li>
                            <li>💰 List your own items for sale</li>
                            <li>💬 Chat with buyers and sellers</li>
                            <li>🏠 Find roommates in your area</li>
                            <li>⭐ Leave and receive reviews</li>
                        </ul>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL}/dashboard" 
                               style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                                🚀 Start Exploring
                            </a>
                        </div>
                        <p style="color: #666; font-size: 14px;">
                            Happy buying and selling!<br>
                            The Campus Cart Team
                        </p>
                    </div>
                </div>
            `
        });
        
        console.log(`📧 Welcome email sent to: ${email}`);
        
    } catch (error) {
        console.error('❌ Failed to send welcome email:', error);
        throw new Error(`Failed to send welcome email: ${error.message}`);
    }
};

// Item sold notification email
export const sendItemSoldNotificationEmail = async (sellerEmail, sellerName, buyerName, itemTitle, itemPrice) => {
    try {
        await transporter.sendMail({
            from: `"Campus Cart" <${process.env.SMTP_USER}>`,
            to: sellerEmail,
            subject: 'Your item has been sold! 🎉',
            html: `
                <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                    <div style="background: #28a745; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Item Sold!</h1>
                    </div>
                    <div style="background: #ffffff; padding: 40px; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
                        <h2 style="color: #333;">Congratulations ${sellerName}!</h2>
                        <p>Your item "<strong>${itemTitle}</strong>" has been sold to ${buyerName} for <strong>$${itemPrice}</strong>.</p>
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #28a745; margin: 0 0 10px;">📦 Item Details</h3>
                            <p style="margin: 5px 0;"><strong>Title:</strong> ${itemTitle}</p>
                            <p style="margin: 5px 0;"><strong>Price:</strong> $${itemPrice}</p>
                            <p style="margin: 5px 0;"><strong>Buyer:</strong> ${buyerName}</p>
                        </div>
                        <p>You can now coordinate pickup/delivery with the buyer through your messages.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL}/messages" 
                               style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">
                                💬 View Messages
                            </a>
                            <a href="${process.env.FRONTEND_URL}/dashboard/listings" 
                               style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                                📋 My Listings
                            </a>
                        </div>
                    </div>
                </div>
            `
        });
        
        console.log(`📧 Item sold notification sent to: ${sellerEmail}`);
        
    } catch (error) {
        console.error('❌ Failed to send item sold notification:', error);
        throw new Error(`Failed to send item sold notification: ${error.message}`);
    }
};

// New message notification email
export const sendMessageNotificationEmail = async (recipientEmail, recipientName, senderName, messagePreview, conversationUrl) => {
    try {
        await transporter.sendMail({
            from: `"Campus Cart" <${process.env.SMTP_USER}>`,
            to: recipientEmail,
            subject: `New message from ${senderName}`,
            html: `
                <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                    <div style="background: #007bff; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">💬 New Message</h1>
                    </div>
                    <div style="background: #ffffff; padding: 40px; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
                        <h2 style="color: #333;">Hi ${recipientName}!</h2>
                        <p>You have a new message from <strong>${senderName}</strong>:</p>
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; margin: 20px 0;">
                            <p style="margin: 0; font-style: italic; color: #555;">
                                "${messagePreview.length > 150 ? messagePreview.substring(0, 150) + '...' : messagePreview}"
                            </p>
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${conversationUrl || `${process.env.FRONTEND_URL}/messages`}" 
                               style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                                📱 Reply Now
                            </a>
                        </div>
                    </div>
                </div>
            `
        });
        
        console.log(`📧 Message notification sent to: ${recipientEmail}`);
        
    } catch (error) {
        console.error('❌ Failed to send message notification:', error);
        // Don't throw error for message notifications to avoid blocking the main flow
        return false;
    }
};

// Roommate match notification email
export const sendRoommateMatchEmail = async (userEmail, userName, matchName, compatibilityScore, matchDetails) => {
    try {
        await transporter.sendMail({
            from: `"Campus Cart" <${process.env.SMTP_USER}>`,
            to: userEmail,
            subject: 'You have a new roommate match! 🏠',
            html: `
                <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                    <div style="background: #fd7e14; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">🏠 Roommate Match!</h1>
                    </div>
                    <div style="background: #ffffff; padding: 40px; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
                        <h2 style="color: #333;">Hi ${userName}!</h2>
                        <p>Great news! We found someone who might be a perfect roommate match for you.</p>
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #fd7e14; margin: 0 0 15px;">📊 Match Details</h3>
                            <p style="margin: 5px 0;"><strong>Match:</strong> ${matchName}</p>
                            <p style="margin: 5px 0;"><strong>Compatibility:</strong> ${compatibilityScore}%</p>
                            <p style="margin: 5px 0;"><strong>Budget:</strong> $${matchDetails.budgetMin} - $${matchDetails.budgetMax}</p>
                            <p style="margin: 5px 0;"><strong>Housing Type:</strong> ${matchDetails.housingType}</p>
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL}/roommates" 
                               style="background: #fd7e14; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                                🏠 View Match
                            </a>
                        </div>
                    </div>
                </div>
            `
        });
        
        console.log(`📧 Roommate match notification sent to: ${userEmail}`);
        
    } catch (error) {
        console.error('❌ Failed to send roommate match email:', error);
        return false;
    }
};

// Generic email sending function for custom emails
export const sendCustomEmail = async (to, subject, html, text = '') => {
    try {
        const info = await transporter.sendMail({
            from: `"Campus Cart" <${process.env.SMTP_USER}>`,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject,
            html,
            text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML if no text provided
        });
        
        console.log(`📧 Custom email sent: ${info.messageId}`);
        return {
            success: true,
            messageId: info.messageId
        };
        
    } catch (error) {
        console.error('❌ Failed to send custom email:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

// Export all functions
export default {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendWelcomeEmail,
    sendItemSoldNotificationEmail,
    sendMessageNotificationEmail,
    sendRoommateMatchEmail,
    sendCustomEmail,
    verifyEmailConfig
};
