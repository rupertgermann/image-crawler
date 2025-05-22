const path = require('path');
const fs = require('fs-extra');
const Logger = require('./logger.js'); // Assuming logger.js is CJS

/**
 * Validates if a path exists
 * @param {string} path - Path to validate
 * @returns {Promise<{valid: boolean, message?: string}>} Validation result
 */
const validatePathExists = async (path) => {
  try {
    await fs.access(path);
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      message: `Path does not exist: ${path}` 
    };
  }
};

/**
 * Validates if a path is a directory
 * @param {string} dirPath - Directory path to validate
 * @returns {Promise<{valid: boolean, message?: string}>} Validation result
 */
const validateDirectory = async (dirPath) => {
  try {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      return { 
        valid: false, 
        message: `Path is not a directory: ${dirPath}` 
      };
    }
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      message: `Directory does not exist or is not accessible: ${dirPath}` 
    };
  }
};

/**
 * Validates if a path is writable
 * @param {string} dirPath - Directory path to validate
 * @returns {Promise<{valid: boolean, message?: string}>} Validation result
 */
const validateWritable = async (dirPath) => {
  try {
    const testFile = path.join(dirPath, `.test-${Date.now()}`);
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      message: `Directory is not writable: ${dirPath}` 
    };
  }
};

/**
 * Validates if a string is a valid URL
 * @param {string} url - URL to validate
 * @returns {{valid: boolean, message?: string}} Validation result
 */
const validateUrl = (url) => {
  try {
    // eslint-disable-next-line no-new
    new URL(url);
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      message: `Invalid URL: ${url}` 
    };
  }
};

/**
 * Validates if a value is a positive integer
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error message
 * @returns {{valid: boolean, message?: string}} Validation result
 */
const validatePositiveInteger = (value, fieldName = 'Value') => {
  const num = Number(value);
  if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
    return { 
      valid: false, 
      message: `${fieldName} must be a positive integer` 
    };
  }
  return { valid: true };
};

/**
 * Validates file extensions
 * @param {string[]} extensions - File extensions to validate (without dot)
 * @returns {{valid: boolean, message?: string}} Validation result
 */
const validateFileExtensions = (extensions) => {
  if (!Array.isArray(extensions) || extensions.length === 0) {
    return { 
      valid: false, 
      message: 'At least one file extension is required' 
    };
  }

  const invalid = extensions.some(ext => 
    typeof ext !== 'string' || 
    !/^[a-zA-Z0-9]+$/.test(ext)
  );

  if (invalid) {
    return { 
      valid: false, 
      message: 'File extensions must be alphanumeric' 
    };
  }

  return { valid: true };
};

/**
 * Validates a file path
 * @param {string} filePath - File path to validate
 * @param {string[]} [allowedExtensions] - Allowed file extensions (without dot)
 * @returns {Promise<{valid: boolean, message?: string}>} Validation result
 */
const validateFilePath = async (filePath, allowedExtensions) => {
  try {
    const stats = await fs.stat(filePath);
    
    if (!stats.isFile()) {
      return { 
        valid: false, 
        message: `Path is not a file: ${filePath}` 
      };
    }

    if (allowedExtensions && allowedExtensions.length > 0) {
      const ext = path.extname(filePath).toLowerCase().substring(1);
      if (!ext || !allowedExtensions.includes(ext)) {
        return { 
          valid: false, 
          message: `File type not allowed. Allowed types: ${allowedExtensions.join(', ')}` 
        };
      }
    }

    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      message: `File does not exist or is not accessible: ${filePath}` 
    };
  }
};

module.exports = {
  validatePathExists,
  validateDirectory,
  validateWritable,
  validateUrl,
  validatePositiveInteger,
  validateFileExtensions,
  validateFilePath
};
