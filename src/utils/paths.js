import path from 'path';
import fs from 'fs-extra';
import { getPlatformInfo } from './platform.js';
import Logger from './logger.js';

const platform = getPlatformInfo();

/**
 * Resolves a path relative to the project root
 * @param {...string} segments - Path segments to join
 * @returns {string} Absolute path
 */
export const resolvePath = (...segments) => {
  return path.resolve(process.cwd(), ...segments);
};

/**
 * Ensures a directory exists, creates it if it doesn't
 * @param {string} dirPath - Directory path
 * @returns {Promise<string>} The resolved directory path
 */
export const ensureDir = async (dirPath) => {
  try {
    await fs.ensureDir(dirPath);
    return dirPath;
  } catch (error) {
    Logger.error(`Failed to ensure directory exists: ${dirPath}`, error);
    throw error;
  }
};

/**
 * Checks if a path exists
 * @param {string} path - Path to check
 * @returns {Promise<boolean>} True if path exists
 */
export const pathExists = async (path) => {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
};

/**
 * Gets the default download directory based on platform
 * @returns {string} Default download directory path
 */
export const getDefaultDownloadDir = () => {
  if (platform.isWindows) {
    return path.join(platform.homedir, 'Downloads', 'image-crawler');
  }
  return path.join(platform.homedir, 'image-crawler');
};

/**
 * Gets the default scan directory based on platform
 * @returns {string} Default scan directory path
 */
export const getDefaultScanDir = () => {
  if (platform.isWindows) {
    return 'C:\\';
  } else if (platform.isMac) {
    return path.join(platform.homedir, 'Pictures');
  } else {
    return platform.homedir;
  }
};

/**
 * Checks if a path is within the project directory
 * @param {string} filePath - Path to check
 * @returns {boolean} True if path is within project directory
 */
export const isInProjectDir = (filePath) => {
  const projectPath = process.cwd();
  const relative = path.relative(projectPath, filePath);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
};

/**
 * Gets all files in a directory recursively
 * @param {string} dir - Directory to scan
 * @param {string[]} [extensions] - File extensions to include (without dot)
 * @returns {Promise<string[]>} Array of file paths
 */
export const getFilesRecursively = async (dir, extensions) => {
  const files = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await getFilesRecursively(fullPath, extensions);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        if (!extensions || extensions.length === 0) {
          files.push(fullPath);
        } else {
          const ext = path.extname(entry.name).toLowerCase().substring(1);
          if (ext && extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }
  } catch (error) {
    Logger.error(`Error reading directory: ${dir}`, error);
  }
  
  return files;
};

/**
 * Creates a safe filename by removing invalid characters
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
export const sanitizeFilename = (filename) => {
  if (!filename) return '';
  
  // Remove invalid characters
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') // Invalid file name characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with one
    .replace(/^[\s.]+|[\s.]+$/g, ''); // Trim dots and spaces from start/end
};

export default {
  resolvePath,
  ensureDir,
  pathExists,
  getDefaultDownloadDir,
  getDefaultScanDir,
  isInProjectDir,
  getFilesRecursively,
  sanitizeFilename
};
