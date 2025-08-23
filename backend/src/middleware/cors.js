import cors from 'cors';

// Environment-based allowed origins
const getAllowedOrigins = () => {
    const origins = [
        'http://localhost:3000',         // React development server
        'http://localhost:3001',         // Alternative React port
        'http://127.0.0.1:3000',        // Alternative localhost
        'http://127.0.0.1:3001',        // Alternative localhost
    ];

    // Add production domains
    if (process.env.NODE_ENV === 'production') {
        origins.push(
            'https://campuscart.com',
            'https://www.campuscart.com',
            'https://campuscart.vercel.app',
            'https://campuscart.netlify.app',
            'https://campus-cart.herokuapp.com'
        );
    }

    // Add custom domains from environment variables
    if (process.env.CLIENT_URL) {
        origins.push(process.env.CLIENT_URL);
    }

    if (process.env.FRONTEND_URL) {
        origins.push(process.env.FRONTEND_URL);
    }

    if (process.env.ALLOWED_ORIGINS) {
        const customOrigins = process.env.ALLOWED_ORIGINS.split(',');
        origins.push(...customOrigins);
    }

    return origins;
};

// Production CORS configuration
const productionCorsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = getAllowedOrigins();
        
        // Allow requests with no origin (mobile apps, curl, Postman, etc.)
        if (!origin) {
            console.log('🌐 CORS: Allowing request with no origin');
            return callback(null, true);
        }

        // Check if origin is allowed
        if (allowedOrigins.includes(origin)) {
            console.log(`✅ CORS: Allowed origin - ${origin}`);
            callback(null, true);
        } else {
            console.warn(`❌ CORS: Blocked origin - ${origin}`);
            console.log(`📋 CORS: Allowed origins - ${allowedOrigins.join(', ')}`);
            
            const error = new Error(`Origin ${origin} not allowed by CORS policy`);
            error.status = 403;
            callback(error);
        }
    },
    methods: [
        'GET', 
        'POST', 
        'PUT', 
        'PATCH', 
        'DELETE', 
        'OPTIONS', 
        'HEAD'
    ],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Bearer',
        'Cache-Control',
        'X-Access-Token',
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Methods'
    ],
    credentials: true, // Allow cookies and authorization headers
    optionsSuccessStatus: 200, // For legacy browser support
    maxAge: 86400, // Cache preflight response for 24 hours
    preflightContinue: false // Pass control to next handler after preflight
};

// Development CORS configuration (more permissive)
const developmentCorsOptions = {
    origin: function (origin, callback) {
        // In development, allow all origins
        console.log(`🔧 CORS (DEV): Allowing origin - ${origin || 'No origin'}`);
        callback(null, true);
    },
    methods: [
        'GET', 
        'POST', 
        'PUT', 
        'PATCH', 
        'DELETE', 
        'OPTIONS', 
        'HEAD'
    ],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Bearer',
        'Cache-Control',
        'X-Access-Token',
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Methods'
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 86400,
    preflightContinue: false
};

// Choose configuration based on environment
const corsOptions = process.env.NODE_ENV === 'production' 
    ? productionCorsOptions 
    : developmentCorsOptions;

// Create CORS middleware
const corsMiddleware = cors(corsOptions);

// Enhanced CORS middleware with logging and debugging
export const corsWithLogging = (req, res, next) => {
    const origin = req.get('Origin');
    const method = req.method;
    const userAgent = req.get('User-Agent');

    // Log CORS requests in development
    if (process.env.NODE_ENV === 'development') {
        console.log(`🌐 CORS Request:`, {
            method,
            origin: origin || 'No origin',
            userAgent: userAgent ? userAgent.substring(0, 50) + '...' : 'Unknown',
            path: req.path
        });
    }

    // Add security headers
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    
    if (process.env.NODE_ENV === 'production') {
        res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    corsMiddleware(req, res, next);
};

// Handle preflight OPTIONS requests
export const handlePreflight = (req, res, next) => {
    if (req.method === 'OPTIONS') {
        console.log(`✈️  CORS Preflight: ${req.get('Origin')} -> ${req.path}`);
        
        const origin = req.get('Origin');
        const allowedOrigins = getAllowedOrigins();
        
        // Check if origin is allowed for preflight
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
            res.header('Access-Control-Allow-Origin', origin || '*');
            res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS');
            res.header('Access-Control-Allow-Headers', 
                'Content-Type, Authorization, Content-Length, X-Requested-With, Accept, Origin, Bearer'
            );
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Max-Age', '86400');
            
            return res.status(200).end();
        } else {
            console.warn(`❌ CORS Preflight blocked: ${origin}`);
            return res.status(403).json({
                success: false,
                message: 'CORS preflight request not allowed'
            });
        }
    }
    next();
};

// Strict CORS middleware for sensitive endpoints
export const strictCORS = (req, res, next) => {
    const origin = req.get('Origin');
    const allowedOrigins = getAllowedOrigins();
    
    // Only allow requests from explicitly allowed origins
    if (origin && !allowedOrigins.includes(origin)) {
        console.warn(`🚫 Strict CORS: Blocked ${origin} from accessing ${req.path}`);
        return res.status(403).json({
            success: false,
            message: 'Access forbidden: Origin not allowed',
            code: 'CORS_BLOCKED'
        });
    }
    
    next();
};

// Permissive CORS for public endpoints
export const publicCORS = cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    credentials: false,
    optionsSuccessStatus: 200
});

// API-specific CORS middleware
export const apiCORS = (req, res, next) => {
    const origin = req.get('Origin');
    
    // Set API-specific headers
    res.header('X-API-Version', '1.0');
    res.header('X-Powered-By', 'Campus Cart API');
    
    // Add rate limiting info if available
    if (req.rateLimit) {
        res.header('X-RateLimit-Limit', req.rateLimit.limit);
        res.header('X-RateLimit-Remaining', req.rateLimit.remaining);
        res.header('X-RateLimit-Reset', req.rateLimit.reset);
    }
    
    corsMiddleware(req, res, next);
};

// CORS error handler
export const handleCORSError = (err, req, res, next) => {
    if (err.message && err.message.includes('CORS')) {
        console.error(`🚫 CORS Error:`, {
            origin: req.get('Origin'),
            method: req.method,
            path: req.path,
            userAgent: req.get('User-Agent'),
            error: err.message
        });
        
        return res.status(403).json({
            success: false,
            message: 'Cross-Origin Request Blocked',
            error: 'CORS_ERROR',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
    next(err);
};

// Utility function to check if origin is allowed
export const isOriginAllowed = (origin) => {
    if (!origin) return true; // Allow requests with no origin
    
    const allowedOrigins = getAllowedOrigins();
    return allowedOrigins.includes(origin);
};

// Dynamic CORS based on request path
export const dynamicCORS = (req, res, next) => {
    // More restrictive CORS for admin endpoints
    if (req.path.startsWith('/api/admin')) {
        return strictCORS(req, res, next);
    }
    
    // Permissive CORS for public endpoints
    if (req.path.startsWith('/api/public') || req.path.startsWith('/api/categories')) {
        return publicCORS(req, res, next);
    }
    
    // Default CORS for all other endpoints
    corsWithLogging(req, res, next);
};

// Debug CORS configuration
export const debugCORS = (req, res, next) => {
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_CORS === 'true') {
        console.log(`🐛 CORS Debug:`, {
            method: req.method,
            origin: req.get('Origin') || 'No origin',
            path: req.path,
            headers: {
                'Access-Control-Request-Method': req.get('Access-Control-Request-Method'),
                'Access-Control-Request-Headers': req.get('Access-Control-Request-Headers')
            },
            allowedOrigins: getAllowedOrigins()
        });
    }
    next();
};

// Main CORS middleware export (default)
export default corsWithLogging;

// Export all CORS configurations
export {
    corsMiddleware,
    productionCorsOptions,
    developmentCorsOptions,
    corsOptions
};
