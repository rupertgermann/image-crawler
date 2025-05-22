import path from 'path';
import fs from 'fs-extra';
import { getPlatformInfo } from './platform.js';
import Logger from './logger.js';
import configManager from './config.js';

const platform = getPlatformInfo();

/**
 * Resolves a path relative to the project root
 * @param {...string} segments - Path segments to join
 * @returns {string} Absolute path
 */
const resolvePath = (...segments) => {
  return path.resolve(process.cwd(), ...segments);
};

/**
 * Ensures a directory exists, creates it if it doesn't
 * @param {string} dirPath - Directory path
 * @returns {Promise<string>} The resolved directory path
 */
const ensureDir = async (dirPath) => {
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
const pathExists = async (path) => {
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
const getDefaultDownloadDir = () => {
  try {
    const config = configManager.getConfig();
    if (config && config.platformSpecific) {
      // Check if the platform-specific config exists and has defaultOutputDir
      if (platform.isWindows && config.platformSpecific.windows && config.platformSpecific.windows.defaultOutputDir) {
        Logger.debug(`Using Windows config output dir: ${config.platformSpecific.windows.defaultOutputDir}`);
        return config.platformSpecific.windows.defaultOutputDir;
      } else if (platform.isMac && config.platformSpecific.darwin && config.platformSpecific.darwin.defaultOutputDir) {
        Logger.debug(`Using macOS config output dir: ${config.platformSpecific.darwin.defaultOutputDir}`);
        return config.platformSpecific.darwin.defaultOutputDir;
      } else if (config.platformSpecific.linux && config.platformSpecific.linux.defaultOutputDir) {
        Logger.debug(`Using Linux config output dir: ${config.platformSpecific.linux.defaultOutputDir}`);
        return config.platformSpecific.linux.defaultOutputDir;
      }
    }
    
    // If we got here, the config exists but doesn't have the required path
    Logger.debug('Config exists but platform-specific output directory is not defined');
  } catch (error) {
    Logger.warn('Could not get default download directory from config, using fallback', error);
  }
  
  // Fallback if config is not available or doesn't have the required path
  let fallbackDir;
  if (platform.isWindows) {
    fallbackDir = path.join(platform.homedir, 'Downloads', 'image-crawler');
  } else {
    fallbackDir = path.join(platform.homedir, 'Downloads', 'image-crawler');
  }
  
  Logger.debug(`Using fallback output directory: ${fallbackDir}`);
  return fallbackDir;
};

/**
 * Gets the default scan directory based on platform
 * @returns {string} Default scan directory path
 */
const getDefaultScanDir = () => {
  try {
    const config = configManager.getConfig();
    if (config && config.platformSpecific) {
      // Check if the platform-specific config exists and has defaultScanPath
      if (platform.isWindows && config.platformSpecific.windows && config.platformSpecific.windows.defaultScanPath) {
        Logger.debug(`Using Windows config scan dir: ${config.platformSpecific.windows.defaultScanPath}`);
        return config.platformSpecific.windows.defaultScanPath;
      } else if (platform.isMac && config.platformSpecific.darwin && config.platformSpecific.darwin.defaultScanPath) {
        Logger.debug(`Using macOS config scan dir: ${config.platformSpecific.darwin.defaultScanPath}`);
        return config.platformSpecific.darwin.defaultScanPath;
      } else if (config.platformSpecific.linux && config.platformSpecific.linux.defaultScanPath) {
        Logger.debug(`Using Linux config scan dir: ${config.platformSpecific.linux.defaultScanPath}`);
        return config.platformSpecific.linux.defaultScanPath;
      }
    }
    
    // If we got here, the config exists but doesn't have the required path
    Logger.debug('Config exists but platform-specific scan directory is not defined');
  } catch (error) {
    Logger.warn('Could not get default scan directory from config, using fallback', error);
  }
  
  // Fallback if config is not available or doesn't have the required path
  let fallbackDir;
  if (platform.isWindows) {
    fallbackDir = 'C:\\';
  } else if (platform.isMac) {
    fallbackDir = path.join(platform.homedir, 'Pictures');
  } else {
    fallbackDir = platform.homedir;
  }
  
  Logger.debug(`Using fallback scan directory: ${fallbackDir}`);
  return fallbackDir;
};

/**
 * Checks if a path is within the project directory
 * @param {string} filePath - Path to check
 * @returns {boolean} True if path is within project directory
 */
const isInProjectDir = (filePath) => {
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
const getFilesRecursively = async (dir, extensions) => {
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
const sanitizeFilename = (filename) => {
  if (!filename) return '';
  
  // Remove invalid characters
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') // Invalid file name characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with one
    .replace(/^[\s.]+|[\s.]+$/g, ''); // Trim dots and spaces from start/end
};

/**
 * Parses a human-readable size string into bytes
 * @param {string|number} sizeStr - Size string (e.g., '100KB', '1.5MB') or number (bytes)
 * @returns {number} Size in bytes
 */
const parseSize = (sizeStr) => {
  if (typeof sizeStr === 'number') return sizeStr;
  
  // If it's just a number, return it as bytes
  if (/^\d+$/.test(sizeStr)) return parseInt(sizeStr, 10);
  
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
    tb: 1024 * 1024 * 1024 * 1024
  };
  
  // Parse the string (e.g., '100KB', '1.5MB')
  const match = sizeStr.toLowerCase().match(/^([\d.]+)\s*([kmgt]?b)?$/);
  if (!match) {
    Logger.warn(`Invalid size format: ${sizeStr}, using 0 bytes`);
    return 0;
  }
  
  const size = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  if (!units[unit]) {
    Logger.warn(`Unknown size unit: ${unit}, using bytes`);
    return size;
  }
  
  return Math.floor(size * units[unit]);
};

export {
  resolvePath,
  ensureDir,
  pathExists,
  getDefaultDownloadDir,
  getDefaultScanDir,
  isInProjectDir,
  getFilesRecursively,
  sanitizeFilename,
  parseSize
};
