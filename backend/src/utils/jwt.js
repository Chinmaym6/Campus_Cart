import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '1h';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

// Generate access token
export const generateAccessToken = (payload) => {
    try {
        return jwt.sign(payload, ACCESS_TOKEN_SECRET, { 
            expiresIn: ACCESS_TOKEN_EXPIRY,
            issuer: 'campuscart',
            audience: 'campuscart-users'
        });
    } catch (error) {
        console.error('Access token generation error:', error);
        throw new Error('Failed to generate access token');
    }
};

// Generate refresh token
export const generateRefreshToken = (payload) => {
    try {
        return jwt.sign(
            { userId: payload.userId }, // Only include essential data
            REFRESH_TOKEN_SECRET,
            { 
                expiresIn: REFRESH_TOKEN_EXPIRY,
                issuer: 'campuscart',
                audience: 'campuscart-users'
            }
        );
    } catch (error) {
        console.error('Refresh token generation error:', error);
        throw new Error('Failed to generate refresh token');
    }
};

// Verify access token
export const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, ACCESS_TOKEN_SECRET, {
            issuer: 'campuscart',
            audience: 'campuscart-users'
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('ACCESS_TOKEN_EXPIRED');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('INVALID_ACCESS_TOKEN');
        } else {
            throw new Error('ACCESS_TOKEN_VERIFICATION_FAILED');
        }
    }
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, REFRESH_TOKEN_SECRET, {
            issuer: 'campuscart',
            audience: 'campuscart-users'
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('REFRESH_TOKEN_EXPIRED');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('INVALID_REFRESH_TOKEN');
        } else {
            throw new Error('REFRESH_TOKEN_VERIFICATION_FAILED');
        }
    }
};

// Generate token pair
export const generateTokenPair = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        verified: user.email_verified
    };

    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload)
    };
};

// Decode token without verification (for debugging)
export const decodeToken = (token) => {
    try {
        return jwt.decode(token, { complete: true });
    } catch (error) {
        console.error('Token decode error:', error);
        return null;
    }
};

// Check if token is expired
export const isTokenExpired = (token) => {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) return true;
        
        const currentTime = Math.floor(Date.now() / 1000);
        return decoded.exp < currentTime;
    } catch (error) {
        return true;
    }
};

// Get token expiry time
export const getTokenExpiryTime = (token) => {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) return null;
        
        return new Date(decoded.exp * 1000);
    } catch (error) {
        return null;
    }
};

// Extract user ID from token
export const extractUserIdFromToken = (token) => {
    try {
        const decoded = jwt.decode(token);
        return decoded?.userId || null;
    } catch (error) {
        return null;
    }
};

// Refresh access token using refresh token
export const refreshAccessToken = async (refreshToken, getUserById) => {
    try {
        const decoded = verifyRefreshToken(refreshToken);
        
        // Get fresh user data
        const user = await getUserById(decoded.userId);
        if (!user || user.status !== 'active') {
            throw new Error('INVALID_USER');
        }

        const newPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            verified: user.email_verified
        };

        return {
            accessToken: generateAccessToken(newPayload),
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                verified: user.email_verified
            }
        };
    } catch (error) {
        console.error('Token refresh error:', error);
        throw error;
    }
};

// Generate email verification token
export const generateEmailVerificationToken = (userId, email) => {
    return jwt.sign(
        { userId, email, type: 'email_verification' },
        ACCESS_TOKEN_SECRET,
        { expiresIn: '24h' }
    );
};

// Verify email verification token
export const verifyEmailVerificationToken = (token) => {
    try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
        if (decoded.type !== 'email_verification') {
            throw new Error('INVALID_TOKEN_TYPE');
        }
        return decoded;
    } catch (error) {
        throw new Error('INVALID_VERIFICATION_TOKEN');
    }
};

// Generate password reset token
export const generatePasswordResetToken = (userId, email) => {
    return jwt.sign(
        { userId, email, type: 'password_reset' },
        ACCESS_TOKEN_SECRET,
        { expiresIn: '30m' }
    );
};

// Verify password reset token
export const verifyPasswordResetToken = (token) => {
    try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
        if (decoded.type !== 'password_reset') {
            throw new Error('INVALID_TOKEN_TYPE');
        }
        return decoded;
    } catch (error) {
        throw new Error('INVALID_RESET_TOKEN');
    }
};

export default {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    generateTokenPair,
    decodeToken,
    isTokenExpired,
    getTokenExpiryTime,
    extractUserIdFromToken,
    refreshAccessToken,
    generateEmailVerificationToken,
    verifyEmailVerificationToken,
    generatePasswordResetToken,
    verifyPasswordResetToken
};
