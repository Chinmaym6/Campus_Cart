import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import crypto from 'crypto';

const UPLOADS_DIR = path.resolve('uploads');
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, 'thumbnails');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Ensure upload directories exist
const ensureDirectories = async () => {
    try {
        await fs.mkdir(UPLOADS_DIR, { recursive: true });
        await fs.mkdir(THUMBNAILS_DIR, { recursive: true });
    } catch (error) {
        console.error('❌ Error creating upload directories:', error);
    }
};

// Initialize directories on module load
ensureDirectories();

// Validate uploaded image
export const validateImage = (file) => {
    const errors = [];

    // Check file type
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
        errors.push(`Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`);
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        errors.push(`File size too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Check if file has content
    if (file.size === 0) {
        errors.push('File is empty');
    }

    if (errors.length > 0) {
        throw new Error(errors.join('. '));
    }

    return true;
};

// Generate unique filename
export const generateUniqueFilename = (originalName) => {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(6).toString('hex');
    const extension = path.extname(originalName).toLowerCase();
    return `${timestamp}-${randomBytes}${extension}`;
};

// Process and save uploaded image
export const processAndSaveImage = async (file, options = {}) => {
    try {
        validateImage(file);

        const filename = generateUniqueFilename(file.originalname);
        const filepath = path.join(UPLOADS_DIR, filename);
        const thumbnailPath = path.join(THUMBNAILS_DIR, `thumb_${filename}`);

        // Process main image
        let imageProcessor = sharp(file.buffer)
            .rotate() // Auto-rotate based on EXIF data
            .jpeg({ quality: 90, progressive: true });

        // Resize if needed
        if (options.maxWidth || options.maxHeight) {
            imageProcessor = imageProcessor.resize({
                width: options.maxWidth || 1200,
                height: options.maxHeight || 1200,
                fit: 'inside',
                withoutEnlargement: true
            });
        }

        await imageProcessor.toFile(filepath);

        // Generate thumbnail
        await sharp(file.buffer)
            .resize({ width: 300, height: 300, fit: 'cover' })
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);

        return {
            filename,
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            path: `/uploads/${filename}`,
            thumbnailPath: `/uploads/thumbnails/thumb_${filename}`
        };

    } catch (error) {
        console.error('❌ Image processing failed:', error);
        throw error;
    }
};

// Generate multiple thumbnails with different sizes
export const generateThumbnails = async (imagePath, filename, sizes = [150, 300, 500]) => {
    const thumbnails = {};

    for (const size of sizes) {
        const thumbFilename = `thumb_${size}_${filename}`;
        const thumbPath = path.join(THUMBNAILS_DIR, thumbFilename);

        await sharp(imagePath)
            .resize({ width: size, height: size, fit: 'cover' })
            .jpeg({ quality: 80 })
            .toFile(thumbPath);

        thumbnails[size] = `/uploads/thumbnails/${thumbFilename}`;
    }

    return thumbnails;
};

// Delete image and all thumbnails
export const deleteImage = async (filename) => {
    try {
        const tasks = [];

        // Delete main image
        const mainImagePath = path.join(UPLOADS_DIR, filename);
        if (existsSync(mainImagePath)) {
            tasks.push(fs.unlink(mainImagePath));
        }

        // Delete standard thumbnail
        const thumbPath = path.join(THUMBNAILS_DIR, `thumb_${filename}`);
        if (existsSync(thumbPath)) {
            tasks.push(fs.unlink(thumbPath));
        }

        // Delete size-specific thumbnails
        const sizes = [150, 300, 500];
        for (const size of sizes) {
            const sizeThumbPath = path.join(THUMBNAILS_DIR, `thumb_${size}_${filename}`);
            if (existsSync(sizeThumbPath)) {
                tasks.push(fs.unlink(sizeThumbPath));
            }
        }

        await Promise.all(tasks);
        console.log(`🗑️ Deleted image and thumbnails: ${filename}`);

    } catch (error) {
        console.error('❌ Error deleting image:', error);
        throw error;
    }
};

// Optimize existing image
export const optimizeImage = async (inputPath, outputPath, options = {}) => {
    try {
        await sharp(inputPath)
            .resize({
                width: options.width || 1200,
                height: options.height || 1200,
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({
                quality: options.quality || 85,
                progressive: true
            })
            .toFile(outputPath);

        return true;
    } catch (error) {
        console.error('❌ Image optimization failed:', error);
        throw error;
    }
};

// Get image metadata
export const getImageMetadata = async (imagePath) => {
    try {
        const metadata = await sharp(imagePath).metadata();
        return {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            size: metadata.size,
            hasAlpha: metadata.hasAlpha,
            orientation: metadata.orientation
        };
    } catch (error) {
        console.error('❌ Error getting image metadata:', error);
        throw error;
    }
};

// Create image variations for different use cases
export const createImageVariations = async (inputBuffer, filename) => {
    const variations = {
        original: path.join(UPLOADS_DIR, filename),
        large: path.join(UPLOADS_DIR, `large_${filename}`),
        medium: path.join(UPLOADS_DIR, `medium_${filename}`),
        small: path.join(UPLOADS_DIR, `small_${filename}`)
    };

    // Original (optimized)
    await sharp(inputBuffer)
        .jpeg({ quality: 90, progressive: true })
        .toFile(variations.original);

    // Large (800px max)
    await sharp(inputBuffer)
        .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(variations.large);

    // Medium (400px max)
    await sharp(inputBuffer)
        .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(variations.medium);

    // Small (200px max)
    await sharp(inputBuffer)
        .resize({ width: 200, height: 200, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toFile(variations.small);

    return {
        original: `/uploads/${filename}`,
        large: `/uploads/large_${filename}`,
        medium: `/uploads/medium_${filename}`,
        small: `/uploads/small_${filename}`
    };
};

export default {
    validateImage,
    generateUniqueFilename,
    processAndSaveImage,
    generateThumbnails,
    deleteImage,
    optimizeImage,
    getImageMetadata,
    createImageVariations
};
