import { execSync } from 'child_process';
import os from 'os';
import fs from 'fs-extra';
import path from 'path';

/**
 * Detects the current platform and returns platform-specific information
 * @returns {Object} Platform information
 */
const getPlatformInfo = () => {
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
const getWindowsDrives = async () => {
  try {
    // Try using the windows-drive-letters package if available
    try {
      const { getDriveLetters } = require('windows-drive-letters'); // Changed to require
      return await getDriveLetters(); // Assuming getDriveLetters is async
    } catch (e) {
      // Fallback to native implementation if package is not available
      if (process.platform !== 'win32') return [];
      
      const stdout = execSync('wmic logicaldisk get name').toString(); // Keep execSync for now
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
const isDirectory = async (path) => {
  try {
    const stat = await fs.stat(path);
    return stat.isDirectory();
  } catch (error) {
    return false;
  }
};

export {
  getPlatformInfo,
  getWindowsDrives,
  isDirectory
};
