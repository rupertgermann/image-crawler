import { execSync } from 'child_process';
import os from 'os';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Detects the current platform and returns platform-specific information
 * @returns {Object} Platform information
 */
export const getPlatformInfo = () => {
  const platform = process.platform;
  const isWindows = platform === 'win32';
  const isMac = platform === 'darwin';
  const isLinux = platform === 'linux';
  
  return {
    isWindows,
    isMac,
    isLinux,
    platform,
    homedir: os.homedir(),
    tempdir: os.tmpdir(),
    defaultDownloadPath: getDefaultDownloadPath(platform, os.homedir())
  };
};

/**
 * Gets the default download path based on the platform
 * @param {string} platform - The platform identifier
 * @param {string} homedir - The user's home directory
 * @returns {string} Default download path
 */
const getDefaultDownloadPath = (platform, homedir) => {
  if (platform === 'win32') {
    return path.join(homedir, 'Downloads', 'image-crawler');
  }
  return path.join(homedir, 'image-crawler');
};

/**
 * Detects available drives on Windows
 * @returns {Promise<string[]>} Array of available drive letters
 */
export const getWindowsDrives = async () => {
  try {
    // Try using the windows-drive-letters package if available
    try {
      const { getDriveLetters } = await import('windows-drive-letters');
      return await getDriveLetters();
    } catch (e) {
      // Fallback to native implementation if package is not available
      if (process.platform !== 'win32') return [];
      
      const stdout = execSync('wmic logicaldisk get name').toString();
      return stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => /^[A-Z]:$/.test(line));
    }
  } catch (error) {
    console.error('Error detecting Windows drives:', error);
    return [];
  }
};

/**
 * Checks if a path is a directory
 * @param {string} path - Path to check
 * @returns {Promise<boolean>} True if the path is a directory
 */
export const isDirectory = async (path) => {
  try {
    const stat = await fs.stat(path);
    return stat.isDirectory();
  } catch (error) {
    return false;
  }
};

export default {
  getPlatformInfo,
  getWindowsDrives,
  isDirectory
};
