import multer from 'multer';
import multerS3 from 'multer-s3';
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import path from 'path';

// Configure AWS S3
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

// File type validation
const fileFilter = (req, file, cb) => {
    // Allowed image types
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    // Allowed document types
    const allowedDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    const allowedTypes = [...allowedImageTypes, ...allowedDocTypes];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
};

// S3 upload configuration
const s3Storage = multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET,
    acl: 'public-read',
    metadata: (req, file, cb) => {
        cb(null, {
            fieldName: file.fieldname,
            uploadedBy: req.user?.userId || 'anonymous',
            uploadedAt: new Date().toISOString(),
            originalName: file.originalname
        });
    },
    key: (req, file, cb) => {
        const folder = req.uploadFolder || 'general';
        const fileExtension = path.extname(file.originalname);
        const fileName = `${folder}/${uuidv4()}${fileExtension}`;
        cb(null, fileName);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE
});

// Local storage configuration (for development)
const localStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const folder = req.uploadFolder || 'general';
        cb(null, `uploads/${folder}/`);
    },
    filename: (req, file, cb) => {
        const fileExtension = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExtension}`;
        cb(null, fileName);
    }
});

// Choose storage based on environment
const storage = process.env.NODE_ENV === 'production' ? s3Storage : localStorage;

// Base upload configuration
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10, // Maximum 10 files
        fields: 20, // Maximum 20 form fields
        fieldNameSize: 50, // Maximum field name size
        fieldSize: 1024 * 1024 // Maximum field value size (1MB)
    },
    fileFilter: fileFilter
});

// Specific upload configurations
export const uploadSingle = (fieldName, folder = 'general') => [
    (req, res, next) => {
        req.uploadFolder = folder;
        next();
    },
    upload.single(fieldName)
];

export const uploadMultiple = (fieldName, maxCount = 10, folder = 'general') => [
    (req, res, next) => {
        req.uploadFolder = folder;
        next();
    },
    upload.array(fieldName, maxCount)
];

export const uploadFields = (fields, folder = 'general') => [
    (req, res, next) => {
        req.uploadFolder = folder;
        next();
    },
    upload.fields(fields)
];

// Image processing middleware
export const processImages = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return next();
        }

        const processedFiles = [];

        for (const file of req.files) {
            let processedFile = { original: file };

            // Only process images
            if (file.mimetype.startsWith('image/')) {
                try {
                    // Get image buffer
                    let imageBuffer;
                    
                    if (process.env.NODE_ENV === 'production') {
                        // Download from S3 for processing
                        const s3Object = await s3.getObject({
                            Bucket: process.env.AWS_S3_BUCKET,
                            Key: file.key
                        }).promise();
                        imageBuffer = s3Object.Body;
                    } else {
                        // Read from local file
                        imageBuffer = require('fs').readFileSync(file.path);
                    }

                    // Create thumbnail
                    const thumbnailBuffer = await sharp(imageBuffer)
                        .resize(300, 300, { 
                            fit: 'cover',
                            withoutEnlargement: true 
                        })
                        .jpeg({ quality: 80 })
                        .toBuffer();

                    // Upload thumbnail to S3 if in production
                    if (process.env.NODE_ENV === 'production') {
                        const thumbnailKey = file.key.replace(/\.[^/.]+$/, '_thumb.jpg');
                        
                        const thumbnailUpload = await s3.upload({
                            Bucket: process.env.AWS_S3_BUCKET,
                            Key: thumbnailKey,
                            Body: thumbnailBuffer,
                            ACL: 'public-read',
                            ContentType: 'image/jpeg'
                        }).promise();

                        processedFile.thumbnail = {
                            key: thumbnailKey,
                            url: thumbnailUpload.Location
                        };
                    } else {
                        // Save thumbnail locally
                        const thumbnailPath = file.path.replace(/\.[^/.]+$/, '_thumb.jpg');
                        require('fs').writeFileSync(thumbnailPath, thumbnailBuffer);
                        
                        processedFile.thumbnail = {
                            path: thumbnailPath,
                            url: thumbnailPath.replace('uploads/', '/uploads/')
                        };
                    }

                    // Create compressed version
                    const compressedBuffer = await sharp(imageBuffer)
                        .resize(1200, 1200, { 
                            fit: 'inside',
                            withoutEnlargement: true 
                        })
                        .jpeg({ quality: 85 })
                        .toBuffer();

                    // Upload compressed version if different from original
                    if (compressedBuffer.length < imageBuffer.length * 0.8) {
                        if (process.env.NODE_ENV === 'production') {
                            const compressedKey = file.key.replace(/\.[^/.]+$/, '_compressed.jpg');
                            
                            const compressedUpload = await s3.upload({
                                Bucket: process.env.AWS_S3_BUCKET,
                                Key: compressedKey,
                                Body: compressedBuffer,
                                ACL: 'public-read',
                                ContentType: 'image/jpeg'
                            }).promise();

                            processedFile.compressed = {
                                key: compressedKey,
                                url: compressedUpload.Location
                            };
                        }
                    }

                } catch (imageError) {
                    console.error('Image processing error:', imageError);
                    // Continue without processing if there's an error
                }
            }

            processedFiles.push(processedFile);
        }

        req.processedFiles = processedFiles;
        next();

    } catch (error) {
        console.error('File processing error:', error);
        next(error);
    }
};

// File validation middleware
export const validateFiles = (options = {}) => {
    const {
        required = false,
        maxSize = 10 * 1024 * 1024, // 10MB
        maxCount = 10,
        allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    } = options;

    return (req, res, next) => {
        if (required && (!req.files || req.files.length === 0)) {
            return res.status(400).json({
                success: false,
                message: 'Files are required'
            });
        }

        if (req.files && req.files.length > maxCount) {
            return res.status(400).json({
                success: false,
                message: `Too many files. Maximum allowed: ${maxCount}`
            });
        }

        if (req.files) {
            for (const file of req.files) {
                if (file.size > maxSize) {
                    return res.status(400).json({
                        success: false,
                        message: `File ${file.originalname} is too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`
                    });
                }

                if (!allowedTypes.includes(file.mimetype)) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid file type for ${file.originalname}. Allowed types: ${allowedTypes.join(', ')}`
                    });
                }
            }
        }

        next();
    };
};

// Clean up uploaded files on error
export const cleanupFiles = (req, res, next) => {
    res.on('finish', () => {
        if (res.statusCode >= 400 && req.files) {
            // Clean up files if request failed
            req.files.forEach(file => {
                if (process.env.NODE_ENV === 'production' && file.key) {
                    // Delete from S3
                    s3.deleteObject({
                        Bucket: process.env.AWS_S3_BUCKET,
                        Key: file.key
                    }).promise().catch(console.error);
                } else if (file.path) {
                    // Delete local file
                    require('fs').unlink(file.path, (err) => {
                        if (err) console.error('Error deleting file:', err);
                    });
                }
            });
        }
    });
    next();
};

// Delete file utility
export const deleteFile = async (fileKey) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            await s3.deleteObject({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: fileKey
            }).promise();
            console.log(`✅ Deleted file from S3: ${fileKey}`);
        } else {
            require('fs').unlinkSync(`uploads/${fileKey}`);
            console.log(`✅ Deleted local file: ${fileKey}`);
        }
        return true;
    } catch (error) {
        console.error(`❌ Error deleting file: ${fileKey}`, error);
        return false;
    }
};

// Error handling for multer
export const handleUploadErrors = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    success: false,
                    message: 'File too large. Maximum size is 10MB.',
                    code: 'FILE_TOO_LARGE'
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    message: 'Too many files. Maximum is 10 files.',
                    code: 'TOO_MANY_FILES'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    success: false,
                    message: 'Unexpected field in file upload.',
                    code: 'UNEXPECTED_FIELD'
                });
            case 'LIMIT_PART_COUNT':
                return res.status(400).json({
                    success: false,
                    message: 'Too many parts in multipart upload.',
                    code: 'TOO_MANY_PARTS'
                });
            default:
                return res.status(400).json({
                    success: false,
                    message: 'File upload error.',
                    code: 'UPLOAD_ERROR'
                });
        }
    } else if (err.message.includes('Invalid file type')) {
        return res.status(400).json({
            success: false,
            message: err.message,
            code: 'INVALID_FILE_TYPE'
        });
    }
    
    next(err);
};

export default upload;
