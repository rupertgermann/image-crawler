/**
 * Test Data Generator
 * 
 * This module provides utility functions to generate test data for unit and integration tests.
 */

import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a random string of the specified length
 * @param {number} length - Length of the random string
 * @returns {string} Random string
 */
export function generateRandomString(length = 10) {
  return Math.random().toString(36).substring(2, length + 2);
}

/**
 * Generates a random file with random content
 * @param {string} dirPath - Directory path where the file should be created
 * @param {string} [extension='txt'] - File extension
 * @param {number} [size=1024] - File size in bytes
 * @returns {Promise<string>} Path to the created file
 */
export async function generateTestFile(dirPath, extension = 'txt', size = 1024) {
  await fs.ensureDir(dirPath);
  
  const filename = `${uuidv4()}.${extension}`;
  const filePath = path.join(dirPath, filename);
  
  // Generate random content
  const content = Buffer.alloc(size, 'x');
  
  await fs.writeFile(filePath, content);
  return filePath;
}

/**
 * Generates a test image file with the specified dimensions
 * @param {string} dirPath - Directory path where the image should be created
 * @param {number} width - Image width in pixels
 * @param {number} height - Image height in pixels
 * @param {string} [format='png'] - Image format (png, jpg, jpeg, gif, webp)
 * @returns {Promise<string>} Path to the created image
 */
export async function generateTestImage(dirPath, width = 100, height = 100, format = 'png') {
  await fs.ensureDir(dirPath);
  
  const { createCanvas } = await import('canvas');
  const filename = `${uuidv4()}.${format}`;
  const filePath = path.join(dirPath, filename);
  
  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Draw a gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `hsl(${Math.random() * 360}, 100%, 50%)`);
  gradient.addColorStop(1, `hsl(${Math.random() * 360}, 100%, 50%)`);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add some random text
  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${width}x${height}`, width / 2, height / 2);
  
  // Save the image
  const buffer = canvas.toBuffer(`image/${format}`);
  await fs.writeFile(filePath, buffer);
  
  return filePath;
}

/**
 * Generates a test directory structure
 * @param {string} baseDir - Base directory where the structure should be created
 * @param {Object} structure - Directory structure definition
 * @returns {Promise<string>} Path to the created directory structure
 * 
 * @example
 * await generateTestDirectory('test-dir', {
 *   'file1.txt': 'content1',
 *   'subdir1': {
 *     'file2.txt': 'content2',
 *     'file3.txt': 'content3'
 *   },
 *   'subdir2': {}
 * });
 */
export async function generateTestDirectory(baseDir, structure) {
  await fs.ensureDir(baseDir);
  
  for (const [name, content] of Object.entries(structure)) {
    const itemPath = path.join(baseDir, name);
    
    if (typeof content === 'string') {
      // It's a file with content
      await fs.writeFile(itemPath, content);
    } else if (content === null || content === undefined) {
      // It's an empty file
      await fs.writeFile(itemPath, '');
    } else if (typeof content === 'object' && !Buffer.isBuffer(content)) {
      // It's a directory
      await generateTestDirectory(itemPath, content);
    } else {
      throw new Error(`Invalid content type for ${name}`);
    }
  }
  
  return baseDir;
}

/**
 * Generates a test configuration object
 * @param {Object} overrides - Configuration overrides
 * @returns {Object} Test configuration
 */
export function generateTestConfig(overrides = {}) {
  return {
    maxDownloads: 100,
    minWidth: 800,
    minHeight: 600,
    minFileSize: 0,
    safeSearch: true,
    headless: true,
    outputDir: `/tmp/test-output-${Date.now()}`,
    ...overrides
  };
}

export default {
  generateRandomString,
  generateTestFile,
  generateTestImage,
  generateTestDirectory,
  generateTestConfig
};
