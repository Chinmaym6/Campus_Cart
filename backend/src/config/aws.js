import AWS from 'aws-sdk';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

// Configure AWS with fallbacks for development
const awsConfig = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test-access-key',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test-secret-key',
    region: process.env.AWS_REGION || 'us-east-1'
};

// Log warning if using development credentials
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.warn('⚠️ Using development AWS credentials. File uploads will be simulated.');
}

AWS.config.update(awsConfig);

const s3 = new AWS.S3();

// Determine if we should use S3 or local storage
const useS3 = process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

// Configure local disk storage as fallback
const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const folder = req.uploadFolder || 'general';
        // Use a local uploads directory
        const path = `./uploads/${folder}`;
        // Create directory if it doesn't exist
        const fs = require('fs');
        fs.mkdirSync(path, { recursive: true });
        cb(null, path);
    },
    filename: (req, file, cb) => {
        const uniqueFilename = `${uuidv4()}-${file.originalname}`;
        cb(null, uniqueFilename);
    }
});

// S3 upload configuration
const upload = multer({
    storage: useS3 ? multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET || 'dev-bucket',
        acl: 'public-read',
        metadata: (req, file, cb) => {
            cb(null, {
                fieldName: file.fieldname,
                uploadedBy: req.user ? req.user.id : 'anonymous',
                uploadedAt: new Date().toISOString()
            });
        },
        key: (req, file, cb) => {
            const folder = req.uploadFolder || 'general';
            const fileExtension = file.originalname.split('.').pop();
            const fileName = `${folder}/${uuidv4()}.${fileExtension}`;
            cb(null, fileName);
        }
    }) : diskStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10 // Maximum 10 files
    },
    fileFilter: (req, file, cb) => {
        // Check file type
        const allowedMimes = [
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images and PDFs are allowed.'), false);
        }
    }
});

// Image processing middleware
const processImages = async (req, res, next) => {
    if (!req.files || req.files.length === 0) {
        return next();
    }

    try {
        const processedFiles = [];
        
        for (const file of req.files) {
            // Only process images
            if (file.mimetype.startsWith('image/')) {
                // Create thumbnail
                const thumbnailKey = file.key.replace(/\.[^/.]+$/, '_thumb.jpg');
                
                // Download original image
                const originalImage = await s3.getObject({
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: file.key
                }).promise();

                // Process image with Sharp
                const thumbnailBuffer = await sharp(originalImage.Body)
                    .resize(300, 300, { 
                        fit: 'cover',
                        withoutEnlargement: true 
                    })
                    .jpeg({ quality: 80 })
                    .toBuffer();

                // Upload thumbnail
                await s3.upload({
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: thumbnailKey,
                    Body: thumbnailBuffer,
                    ACL: 'public-read',
                    ContentType: 'image/jpeg'
                }).promise();

                processedFiles.push({
                    original: file,
                    thumbnail: {
                        key: thumbnailKey,
                        url: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${thumbnailKey}`
                    }
                });
            } else {
                processedFiles.push({
                    original: file,
                    thumbnail: null
                });
            }
        }

        req.processedFiles = processedFiles;
        next();
    } catch (error) {
        console.error('Image processing error:', error);
        next(error);
    }
};

// Upload file to S3
const uploadToS3 = async (file, folder = 'general') => {
    try {
        const fileExtension = file.originalname.split('.').pop();
        const fileName = `${folder}/${uuidv4()}.${fileExtension}`;
        
        const result = await s3.upload({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: fileName,
            Body: file.buffer,
            ACL: 'public-read',
            ContentType: file.mimetype
        }).promise();
        
        console.log(`✅ Uploaded file to S3: ${fileName}`);
        return {
            key: fileName,
            location: result.Location,
            success: true
        };
    } catch (error) {
        console.error(`❌ Error uploading file to S3`, error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Delete file from S3
const deleteFromS3 = async (key) => {
    try {
        await s3.deleteObject({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key
        }).promise();
        
        console.log(`✅ Deleted file from S3: ${key}`);
        return true;
    } catch (error) {
        console.error(`❌ Error deleting file from S3: ${key}`, error);
        return false;
    }
};

// Get signed URL for private files
const getSignedUrl = (key, expiresIn = 3600) => {
    return s3.getSignedUrl('getObject', {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Expires: expiresIn
    });
};

export {
    s3,
    upload,
    processImages,
    uploadToS3,
    deleteFromS3,
    getSignedUrl
};
