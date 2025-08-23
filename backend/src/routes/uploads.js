// uploads.js - Routes for file upload management
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { uploadToS3, deleteFromS3 } from '../config/aws.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for temporary file storage
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Check file type
        const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images and documents are allowed.'));
        }
    }
});

// Upload single file
router.post('/single', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }
        
        const file = req.file;
        const userId = req.user?.id || 'anonymous';
        const timestamp = Date.now();
        const fileExtension = path.extname(file.originalname);
        const fileName = `${userId}_${timestamp}${fileExtension}`;
        
        // Upload to S3
        const uploadResult = await uploadToS3(file.buffer, fileName, file.mimetype);
        
        res.json({
            success: true,
            message: 'File uploaded successfully',
            file: {
                originalName: file.originalname,
                fileName: fileName,
                url: uploadResult.Location,
                size: file.size,
                mimetype: file.mimetype
            }
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload file',
            error: error.message
        });
    }
});

// Upload multiple files
router.post('/multiple', upload.array('files', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }
        
        const userId = req.user?.id || 'anonymous';
        const timestamp = Date.now();
        const uploadPromises = [];
        
        req.files.forEach((file, index) => {
            const fileExtension = path.extname(file.originalname);
            const fileName = `${userId}_${timestamp}_${index}${fileExtension}`;
            
            uploadPromises.push(
                uploadToS3(file.buffer, fileName, file.mimetype).then(result => ({
                    originalName: file.originalname,
                    fileName: fileName,
                    url: result.Location,
                    size: file.size,
                    mimetype: file.mimetype
                }))
            );
        });
        
        const uploadResults = await Promise.all(uploadPromises);
        
        res.json({
            success: true,
            message: 'Files uploaded successfully',
            files: uploadResults
        });
    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload files',
            error: error.message
        });
    }
});

// Delete file
router.delete('/:fileName', async (req, res) => {
    try {
        const { fileName } = req.params;
        
        if (!fileName) {
            return res.status(400).json({
                success: false,
                message: 'File name is required'
            });
        }
        
        // Delete from S3
        await deleteFromS3(fileName);
        
        res.json({
            success: true,
            message: 'File deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete file',
            error: error.message
        });
    }
});

// Get file info (for validation)
router.get('/info/:fileName', async (req, res) => {
    try {
        const { fileName } = req.params;
        
        if (!fileName) {
            return res.status(400).json({
                success: false,
                message: 'File name is required'
            });
        }
        
        // In a real implementation, you might want to check if file exists in S3
        // For now, we'll just return basic info based on filename
        const fileExtension = path.extname(fileName);
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
        const isDocument = /\.(pdf|doc|docx)$/i.test(fileName);
        
        res.json({
            success: true,
            file: {
                fileName,
                extension: fileExtension,
                type: isImage ? 'image' : isDocument ? 'document' : 'unknown',
                isImage,
                isDocument
            }
        });
    } catch (error) {
        console.error('Error getting file info:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get file info',
            error: error.message
        });
    }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 10MB.'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Maximum is 5 files.'
            });
        }
    }
    
    if (error.message.includes('Invalid file type')) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
    
    res.status(500).json({
        success: false,
        message: 'Upload error',
        error: error.message
    });
});

export default router;