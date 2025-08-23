import nodemailer from 'nodemailer';

// Email transporter instance
let transporter = null;

// Initialize email transporter
export const initEmailTransporter = () => {
    if (transporter) return transporter;

    transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === '465', // true for port 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        // Connection pooling for better performance
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
        // Additional configuration
        debug: process.env.NODE_ENV === 'development',
        logger: process.env.NODE_ENV === 'development'
    });

    // Verify transporter configuration on initialization
    transporter.verify()
        .then(() => {
            console.log('✅ Email transporter configured and ready');
        })
        .catch((error) => {
            console.error('❌ Email transporter configuration error:', error);
        });

    return transporter;
};

// Get transporter instance
export const getEmailTransporter = () => {
    if (!transporter) {
        return initEmailTransporter();
    }
    return transporter;
};

// Send email function
export const sendEmail = async ({ to, subject, html, text = '', attachments = [] }) => {
    try {
        const emailTransporter = getEmailTransporter();
        
        const mailOptions = {
            from: `"Campus Cart" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject,
            html,
            text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML if no text provided
            attachments
        };

        const info = await emailTransporter.sendMail(mailOptions);
        
        console.log(`📧 Email sent successfully: ${info.messageId}`);
        return {
            success: true,
            messageId: info.messageId,
            response: info.response
        };

    } catch (error) {
        console.error('❌ Email sending failed:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

// Test email configuration
export const testEmailConnection = async () => {
    try {
        const emailTransporter = getEmailTransporter();
        await emailTransporter.verify();
        console.log('✅ Email connection test successful');
        return true;
    } catch (error) {
        console.error('❌ Email connection test failed:', error);
        return false;
    }
};

// Email configuration defaults and validation
export const validateEmailConfig = () => {
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
    const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingVars.length > 0) {
        throw new Error(`Missing required email environment variables: ${missingVars.join(', ')}`);
    }
    
    return true;
};

// Email queue management (for high-volume applications)
const emailQueue = [];
let isProcessingQueue = false;

export const addToEmailQueue = (emailData) => {
    emailQueue.push(emailData);
    processEmailQueue();
};

const processEmailQueue = async () => {
    if (isProcessingQueue || emailQueue.length === 0) return;
    
    isProcessingQueue = true;
    
    while (emailQueue.length > 0) {
        const emailData = emailQueue.shift();
        try {
            await sendEmail(emailData);
            // Add delay between emails to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error('❌ Failed to send queued email:', error);
            // Optionally: retry logic here
        }
    }
    
    isProcessingQueue = false;
};

export default {
    initEmailTransporter,
    getEmailTransporter,
    sendEmail,
    testEmailConnection,
    validateEmailConfig,
    addToEmailQueue
};
