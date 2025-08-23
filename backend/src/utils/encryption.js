import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const secretKey = process.env.ENCRYPTION_SECRET || crypto.randomBytes(32);
const ivLength = 16; // For GCM, this is 12 bytes, but we'll use 16 for compatibility

// Ensure secret key is 32 bytes
const normalizeKey = (key) => {
    if (typeof key === 'string') {
        // Hash the key to ensure it's always 32 bytes
        return crypto.createHash('sha256').update(key).digest();
    }
    return key;
};

// Encrypt text with AES-256-GCM
export const encrypt = (text) => {
    try {
        const key = normalizeKey(secretKey);
        const iv = crypto.randomBytes(ivLength);
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        // Combine IV, authTag, and encrypted data
        const result = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
        return result;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
};

// Decrypt text with AES-256-GCM
export const decrypt = (encryptedText) => {
    try {
        const key = normalizeKey(secretKey);
        const parts = encryptedText.split(':');
        
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[18];
        
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
};

// Hash password with salt
export const hashPassword = async (password, saltRounds = 12) => {
    try {
        const bcrypt = await import('bcrypt');
        return await bcrypt.hash(password, saltRounds);
    } catch (error) {
        console.error('Password hashing error:', error);
        throw new Error('Failed to hash password');
    }
};

// Verify password
export const verifyPassword = async (password, hashedPassword) => {
    try {
        const bcrypt = await import('bcrypt');
        return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
        console.error('Password verification error:', error);
        return false;
    }
};

// Generate secure random token
export const generateSecureToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

// Generate UUID
export const generateUUID = () => {
    return crypto.randomUUID();
};

// Hash data with SHA256
export const hashSHA256 = (data) => {
    return crypto.createHash('sha256').update(data).digest('hex');
};

// Create HMAC signature
export const createHMAC = (data, secret = secretKey) => {
    const key = normalizeKey(secret);
    return crypto.createHmac('sha256', key).update(data).digest('hex');
};

// Verify HMAC signature
export const verifyHMAC = (data, signature, secret = secretKey) => {
    const expectedSignature = createHMAC(data, secret);
    return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
    );
};

// Encrypt sensitive user data (like phone numbers)
export const encryptSensitiveData = (data) => {
    if (!data) return null;
    return encrypt(JSON.stringify(data));
};

// Decrypt sensitive user data
export const decryptSensitiveData = (encryptedData) => {
    if (!encryptedData) return null;
    try {
        const decrypted = decrypt(encryptedData);
        return JSON.parse(decrypted);
    } catch (error) {
        console.error('Failed to decrypt sensitive data:', error);
        return null;
    }
};

export default {
    encrypt,
    decrypt,
    hashPassword,
    verifyPassword,
    generateSecureToken,
    generateUUID,
    hashSHA256,
    createHMAC,
    verifyHMAC,
    encryptSensitiveData,
    decryptSensitiveData
};
