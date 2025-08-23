// logger.js - Request logging middleware
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom token for user ID
morgan.token('user-id', (req) => {
    return req.user ? req.user.id : 'anonymous';
});

// Custom token for request duration
morgan.token('response-time-ms', (req, res) => {
    const responseTime = res.getHeader('X-Response-Time');
    return responseTime ? `${responseTime}ms` : '-';
});

// Custom format for detailed logging
const detailedFormat = ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

// Request logger middleware
export const requestLogger = (req, res, next) => {
    // Add timestamp to request
    req.startTime = Date.now();
    
    // Log request details
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip}`);
    
    // Add response time header
    res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        // Only set header if headers haven't been sent yet
        if (!res.headersSent) {
            res.setHeader('X-Response-Time', duration);
        }
    });
    
    next();
};

// Error logger
export const errorLogger = (err, req, res, next) => {
    const timestamp = new Date().toISOString();
    const errorLog = {
        timestamp,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        error: {
            message: err.message,
            stack: err.stack,
            status: err.status || 500
        }
    };
    
    console.error(`[ERROR] ${timestamp}:`, errorLog);
    
    // Write to error log file in production
    if (process.env.NODE_ENV === 'production') {
        const errorLogPath = path.join(logsDir, 'error.log');
        fs.appendFileSync(errorLogPath, JSON.stringify(errorLog) + '\n');
    }
    
    // Check if headers have already been sent before calling next
    if (!res.headersSent) {
        next(err);
    } else {
        console.error('Headers already sent, cannot forward error');
    }
};

// Access logger for file logging
export const accessLogger = morgan(detailedFormat, {
    stream: fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' })
});

// Console logger for development
export const consoleLogger = morgan('combined');

// Skip logging for certain routes (health checks, etc.)
export const skipHealthChecks = (req, res) => {
    return req.url === '/api/health' || req.url === '/api/status';
};

export default {
    requestLogger,
    errorLogger,
    accessLogger,
    consoleLogger,
    skipHealthChecks
};