// fileSystem.js - File system utilities
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Promisify fs methods for async/await usage
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

/**
 * Check if a file or directory exists
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>} - True if exists, false otherwise
 */
export const exists = async (filePath) => {
    try {
        await access(filePath, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
};

/**
 * Ensure directory exists, create if it doesn't
 * @param {string} dirPath - Directory path
 * @returns {Promise<void>}
 */
export const ensureDir = async (dirPath) => {
    try {
        await mkdir(dirPath, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
};

/**
 * Read file content as string
 * @param {string} filePath - File path
 * @param {string} encoding - File encoding (default: 'utf8')
 * @returns {Promise<string>} - File content
 */
export const readFileContent = async (filePath, encoding = 'utf8') => {
    try {
        return await readFile(filePath, encoding);
    } catch (error) {
        throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
};

/**
 * Write content to file
 * @param {string} filePath - File path
 * @param {string} content - Content to write
 * @param {string} encoding - File encoding (default: 'utf8')
 * @returns {Promise<void>}
 */
export const writeFileContent = async (filePath, content, encoding = 'utf8') => {
    try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        await ensureDir(dir);
        
        await writeFile(filePath, content, encoding);
    } catch (error) {
        throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
};

/**
 * Read JSON file and parse it
 * @param {string} filePath - JSON file path
 * @returns {Promise<Object>} - Parsed JSON object
 */
export const readJsonFile = async (filePath) => {
    try {
        const content = await readFileContent(filePath);
        return JSON.parse(content);
    } catch (error) {
        throw new Error(`Failed to read JSON file ${filePath}: ${error.message}`);
    }
};

/**
 * Write object to JSON file
 * @param {string} filePath - JSON file path
 * @param {Object} data - Data to write
 * @param {number} spaces - JSON formatting spaces (default: 2)
 * @returns {Promise<void>}
 */
export const writeJsonFile = async (filePath, data, spaces = 2) => {
    try {
        const content = JSON.stringify(data, null, spaces);
        await writeFileContent(filePath, content);
    } catch (error) {
        throw new Error(`Failed to write JSON file ${filePath}: ${error.message}`);
    }
};

/**
 * Get file stats
 * @param {string} filePath - File path
 * @returns {Promise<fs.Stats>} - File stats
 */
export const getFileStats = async (filePath) => {
    try {
        return await stat(filePath);
    } catch (error) {
        throw new Error(`Failed to get stats for ${filePath}: ${error.message}`);
    }
};

/**
 * Check if path is a directory
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>} - True if directory, false otherwise
 */
export const isDirectory = async (filePath) => {
    try {
        const stats = await getFileStats(filePath);
        return stats.isDirectory();
    } catch {
        return false;
    }
};

/**
 * Check if path is a file
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>} - True if file, false otherwise
 */
export const isFile = async (filePath) => {
    try {
        const stats = await getFileStats(filePath);
        return stats.isFile();
    } catch {
        return false;
    }
};

/**
 * List directory contents
 * @param {string} dirPath - Directory path
 * @param {Object} options - Options
 * @param {boolean} options.withFileTypes - Include file types (default: false)
 * @returns {Promise<Array>} - Directory contents
 */
export const listDirectory = async (dirPath, options = {}) => {
    try {
        if (options.withFileTypes) {
            return await readdir(dirPath, { withFileTypes: true });
        }
        return await readdir(dirPath);
    } catch (error) {
        throw new Error(`Failed to list directory ${dirPath}: ${error.message}`);
    }
};

/**
 * Delete file
 * @param {string} filePath - File path
 * @returns {Promise<void>}
 */
export const deleteFile = async (filePath) => {
    try {
        await unlink(filePath);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw new Error(`Failed to delete file ${filePath}: ${error.message}`);
        }
    }
};

/**
 * Get file extension
 * @param {string} filePath - File path
 * @returns {string} - File extension (without dot)
 */
export const getFileExtension = (filePath) => {
    return path.extname(filePath).slice(1).toLowerCase();
};

/**
 * Get file name without extension
 * @param {string} filePath - File path
 * @returns {string} - File name without extension
 */
export const getFileNameWithoutExtension = (filePath) => {
    return path.basename(filePath, path.extname(filePath));
};

/**
 * Get file size in bytes
 * @param {string} filePath - File path
 * @returns {Promise<number>} - File size in bytes
 */
export const getFileSize = async (filePath) => {
    try {
        const stats = await getFileStats(filePath);
        return stats.size;
    } catch (error) {
        throw new Error(`Failed to get file size for ${filePath}: ${error.message}`);
    }
};

/**
 * Format file size to human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size
 */
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Create temporary file path
 * @param {string} prefix - File prefix
 * @param {string} extension - File extension
 * @returns {string} - Temporary file path
 */
export const createTempFilePath = (prefix = 'temp', extension = 'tmp') => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const fileName = `${prefix}_${timestamp}_${random}.${extension}`;
    return path.join(process.cwd(), 'temp', fileName);
};

/**
 * Clean up temporary files older than specified time
 * @param {string} tempDir - Temporary directory path
 * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
 * @returns {Promise<number>} - Number of files cleaned up
 */
export const cleanupTempFiles = async (tempDir, maxAge = 60 * 60 * 1000) => {
    try {
        if (!(await exists(tempDir))) {
            return 0;
        }
        
        const files = await listDirectory(tempDir);
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const file of files) {
            const filePath = path.join(tempDir, file);
            const stats = await getFileStats(filePath);
            
            if (now - stats.mtime.getTime() > maxAge) {
                await deleteFile(filePath);
                cleanedCount++;
            }
        }
        
        return cleanedCount;
    } catch (error) {
        console.error('Error cleaning up temp files:', error);
        return 0;
    }
};

/**
 * Copy file from source to destination
 * @param {string} src - Source file path
 * @param {string} dest - Destination file path
 * @returns {Promise<void>}
 */
export const copyFile = async (src, dest) => {
    try {
        // Ensure destination directory exists
        const destDir = path.dirname(dest);
        await ensureDir(destDir);
        
        // Use fs.copyFile for efficient copying
        await promisify(fs.copyFile)(src, dest);
    } catch (error) {
        throw new Error(`Failed to copy file from ${src} to ${dest}: ${error.message}`);
    }
};

/**
 * Move file from source to destination
 * @param {string} src - Source file path
 * @param {string} dest - Destination file path
 * @returns {Promise<void>}
 */
export const moveFile = async (src, dest) => {
    try {
        await copyFile(src, dest);
        await deleteFile(src);
    } catch (error) {
        throw new Error(`Failed to move file from ${src} to ${dest}: ${error.message}`);
    }
};

/**
 * Create multiple directories if they don't exist
 * @param {string[]} directories - Array of directory paths to create
 * @returns {Promise<void>}
 */
export const createDirectories = async (directories) => {
    try {
        if (!Array.isArray(directories)) {
            throw new Error('directories parameter must be an array');
        }
        
        for (const dir of directories) {
            await ensureDir(dir);
        }
    } catch (error) {
        throw new Error(`Failed to create directories: ${error.message}`);
    }
};

// Default export with all utilities
export default {
    exists,
    ensureDir,
    createDirectories,
    readFileContent,
    writeFileContent,
    readJsonFile,
    writeJsonFile,
    getFileStats,
    isDirectory,
    isFile,
    listDirectory,
    deleteFile,
    getFileExtension,
    getFileNameWithoutExtension,
    getFileSize,
    formatFileSize,
    createTempFilePath,
    cleanupTempFiles,
    copyFile,
    moveFile
};