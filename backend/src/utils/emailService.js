// 

import nodemailer from 'nodemailer';

// Configure email transporter (preserving your existing setup)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5
});

// Your existing sendEmail function (preserved exactly)
const sendEmail = async ({ to, subject, html }) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    await transporter.sendMail({ 
        from: `"Campus Cart" <${process.env.SMTP_USER}>`, 
        to, 
        subject, 
        html 
    });
};

// Enhanced email functions that use your existing sendEmail function

// Verification email (enhanced version of your existing usage)
export const sendVerificationEmail = async (email, verificationUrl, userName = '') => {
    const html = `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8f9fa; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">🎒 Campus Cart</h1>
                <p style="color: rgba(255,255,255,0.95); margin: 12px 0 0; font-size: 18px; font-weight: 500;">Your Campus Marketplace</p>
            </div>
            <div style="background: #ffffff; padding: 50px 40px; border-radius: 0 0 16px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
                <h2 style="color: #1f2937; margin: 0 0 24px; font-size: 28px; font-weight: 700;">Welcome${userName ? ` ${userName}` : ''}! 🎉</h2>
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
    `;

    return await sendEmail({
        to: email,
        subject: 'Verify your Campus Cart account',
        html
    });
};

// Password reset email
export const sendPasswordResetEmail = async (email, resetUrl, userName = '') => {
    const html = `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8f9fa; padding: 20px;">
            <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">🔒 Password Reset</h1>
                <p style="color: rgba(255,255,255,0.95); margin: 12px 0 0; font-size: 18px; font-weight: 500;">Campus Cart Security</p>
            </div>
            <div style="background: #ffffff; padding: 50px 40px; border-radius: 0 0 16px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
                <h2 style="color: #1f2937; margin: 0 0 24px; font-size: 24px; font-weight: 700;">Password Reset Request</h2>
                <p style="color: #6b7280; line-height: 1.7; margin: 0 0 32px; font-size: 16px;">
                    Hi${userName ? ` ${userName}` : ''},<br><br>
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
                    This reset link expires in 30 minutes. If you didn't request this reset, please ignore this email.
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                    © ${new Date().getFullYear()} Campus Cart. All rights reserved.
                </p>
            </div>
        </div>
    `;

    return await sendEmail({
        to: email,
        subject: 'Campus Cart - Password Reset Request',
        html
    });
};

// Item sold notification email
export const sendItemSoldEmail = async (sellerEmail, buyerName, itemTitle, itemPrice, sellerName = '') => {
    const html = `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8f9fa; padding: 20px;">
            <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">🎉 Item Sold!</h1>
                <p style="color: rgba(255,255,255,0.95); margin: 12px 0 0; font-size: 18px; font-weight: 500;">Congratulations!</p>
            </div>
            <div style="background: #ffffff; padding: 50px 40px; border-radius: 0 0 16px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
                <h2 style="color: #1f2937; margin: 0 0 24px; font-size: 24px; font-weight: 700;">Your item has been sold! 💰</h2>
                <p style="color: #6b7280; line-height: 1.7; margin: 0 0 32px; font-size: 16px;">
                    Hi${sellerName ? ` ${sellerName}` : ''},<br><br>
                    Great news! Your item has been purchased by a fellow student.
                </p>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; border-left: 4px solid #28a745; margin: 20px 0;">
                    <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 20px;">${itemTitle}</h3>
                    <p style="margin: 8px 0; color: #28a745; font-weight: 600; font-size: 18px;">Sale Price: $${itemPrice}</p>
                    <p style="margin: 8px 0; color: #6b7280;">Buyer: ${buyerName}</p>
                </div>
                <p style="color: #6b7280; line-height: 1.7; margin: 20px 0; font-size: 16px;">
                    You can now coordinate the pickup/delivery with the buyer through your messages on Campus Cart.
                </p>
                <div style="text-align: center; margin: 40px 0;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/messages" 
                       style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
                              color: white; 
                              padding: 18px 36px; 
                              text-decoration: none; 
                              border-radius: 12px; 
                              display: inline-block;
                              font-weight: 600;
                              font-size: 16px;
                              box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);">
                        💬 View Messages
                    </a>
                </div>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                    © ${new Date().getFullYear()} Campus Cart. All rights reserved.
                </p>
            </div>
        </div>
    `;

    return await sendEmail({
        to: sellerEmail,
        subject: 'Campus Cart - Your item has been sold! 🎉',
        html
    });
};

// New message notification email
export const sendMessageNotificationEmail = async (recipientEmail, senderName, messageContent, recipientName = '') => {
    const html = `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8f9fa; padding: 20px;">
            <div style="background: linear-gradient(135deg, #007bff 0%, #6f42c1 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">💬 New Message</h1>
                <p style="color: rgba(255,255,255,0.95); margin: 12px 0 0; font-size: 18px; font-weight: 500;">Campus Cart</p>
            </div>
            <div style="background: #ffffff; padding: 50px 40px; border-radius: 0 0 16px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
                <h2 style="color: #1f2937; margin: 0 0 24px; font-size: 24px; font-weight: 700;">You have a new message!</h2>
                <p style="color: #6b7280; line-height: 1.7; margin: 0 0 32px; font-size: 16px;">
                    Hi${recipientName ? ` ${recipientName}` : ''},<br><br>
                    You have received a new message from <strong>${senderName}</strong>:
                </p>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; border-left: 4px solid #007bff; margin: 20px 0;">
                    <p style="margin: 0; color: #1f2937; font-style: italic; line-height: 1.6;">
                        "${messageContent.length > 150 ? messageContent.substring(0, 150) + '...' : messageContent}"
                    </p>
                </div>
                <div style="text-align: center; margin: 40px 0;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/messages" 
                       style="background: linear-gradient(135deg, #007bff 0%, #6f42c1 100%); 
                              color: white; 
                              padding: 18px 36px; 
                              text-decoration: none; 
                              border-radius: 12px; 
                              display: inline-block;
                              font-weight: 600;
                              font-size: 16px;
                              box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);">
                        📱 Reply Now
                    </a>
                </div>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                    © ${new Date().getFullYear()} Campus Cart. All rights reserved.
                </p>
            </div>
        </div>
    `;

    return await sendEmail({
        to: recipientEmail,
        subject: `Campus Cart - New message from ${senderName}`,
        html
    });
};

// Roommate match notification email
export const sendRoommateMatchEmail = async (userEmail, matchName, matchPost, userName = '') => {
    const html = `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8f9fa; padding: 20px;">
            <div style="background: linear-gradient(135deg, #fd7e14 0%, #e83e8c 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">🏠 Roommate Match!</h1>
                <p style="color: rgba(255,255,255,0.95); margin: 12px 0 0; font-size: 18px; font-weight: 500;">Perfect Match Found</p>
            </div>
            <div style="background: #ffffff; padding: 50px 40px; border-radius: 0 0 16px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
                <h2 style="color: #1f2937; margin: 0 0 24px; font-size: 24px; font-weight: 700;">You have a potential roommate match! 🎯</h2>
                <p style="color: #6b7280; line-height: 1.7; margin: 0 0 32px; font-size: 16px;">
                    Hi${userName ? ` ${userName}` : ''},<br><br>
                    Great news! We found someone who might be a perfect roommate match for you.
                </p>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; border-left: 4px solid #fd7e14; margin: 20px 0;">
                    <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 20px;">${matchPost.title}</h3>
                    <p style="margin: 8px 0; color: #6b7280;"><strong>Posted by:</strong> ${matchName}</p>
                    <p style="margin: 8px 0; color: #6b7280;"><strong>Budget:</strong> $${matchPost.budget_min} - $${matchPost.budget_max}</p>
                    <p style="margin: 8px 0; color: #6b7280;"><strong>Housing Type:</strong> ${matchPost.housing_type}</p>
                </div>
                <div style="text-align: center; margin: 40px 0;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/roommates" 
                       style="background: linear-gradient(135deg, #fd7e14 0%, #e83e8c 100%); 
                              color: white; 
                              padding: 18px 36px; 
                              text-decoration: none; 
                              border-radius: 12px; 
                              display: inline-block;
                              font-weight: 600;
                              font-size: 16px;
                              box-shadow: 0 4px 12px rgba(253, 126, 20, 0.3);">
                        🏠 View Match
                    </a>
                </div>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                    © ${new Date().getFullYear()} Campus Cart. All rights reserved.
                </p>
            </div>
        </div>
    `;

    return await sendEmail({
        to: userEmail,
        subject: 'Campus Cart - You have a roommate match! 🏠',
        html
    });
};

// Item interest notification (when someone saves your item)
export const sendItemSavedEmail = async (sellerEmail, saverName, itemTitle, sellerName = '') => {
    const html = `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8f9fa; padding: 20px;">
            <div style="background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">❤️ Item Saved!</h1>
                <p style="color: rgba(255,255,255,0.95); margin: 12px 0 0; font-size: 18px; font-weight: 500;">Someone is interested</p>
            </div>
            <div style="background: #ffffff; padding: 50px 40px; border-radius: 0 0 16px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
                <h2 style="color: #1f2937; margin: 0 0 24px; font-size: 24px; font-weight: 700;">Someone saved your item!</h2>
                <p style="color: #6b7280; line-height: 1.7; margin: 0 0 32px; font-size: 16px;">
                    Hi${sellerName ? ` ${sellerName}` : ''},<br><br>
                    <strong>${saverName}</strong> has saved your item "<strong>${itemTitle}</strong>" to their favorites! This means they're interested in purchasing it.
                </p>
                <div style="text-align: center; margin: 40px 0;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/listings" 
                       style="background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); 
                              color: white; 
                              padding: 18px 36px; 
                              text-decoration: none; 
                              border-radius: 12px; 
                              display: inline-block;
                              font-weight: 600;
                              font-size: 16px;
                              box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);">
                        📦 View Your Listings
                    </a>
                </div>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                    © ${new Date().getFullYear()} Campus Cart. All rights reserved.
                </p>
            </div>
        </div>
    `;

    return await sendEmail({
        to: sellerEmail,
        subject: 'Campus Cart - Someone saved your item! ❤️',
        html
    });
};

// Email service status verification
export const verifyEmailService = async () => {
    try {
        await transporter.verify();
        console.log('✅ Email service is ready');
        return true;
    } catch (error) {
        console.error('❌ Email service verification failed:', error);
        return false;
    }
};

// Simple email for your existing usage pattern (preserves your current implementation)
export const sendSimpleEmail = sendEmail; // Your original function

// Export your original function as default (maintains backward compatibility)
export default sendEmail;

// Export all enhanced functions
// All functions are already exported individually
