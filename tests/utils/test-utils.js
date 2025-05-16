import fs from 'fs-extra';
import path from 'path';

/**
 * Creates a temporary directory for testing
 * @param {string} [prefix='test-'] - Prefix for the temporary directory
 * @returns {Promise<string>} Path to the created directory
 */
export async function createTempDir(prefix = 'test-') {
  const tempDir = path.join(
    process.cwd(),
    'test-data',
    `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  );
  
  await fs.ensureDir(tempDir);
  return tempDir;
}

/**
 * Removes a directory and its contents
 * @param {string} dirPath - Path to the directory to remove
 * @returns {Promise<void>}
 */
export async function removeDir(dirPath) {
  await fs.remove(dirPath);
}

/**
 * Creates a test file with random content
 * @param {string} dirPath - Directory to create the file in
 * @param {string} filename - Name of the file to create
 * @param {number} [size=1024] - Size of the file in bytes
 * @returns {Promise<string>} Path to the created file
 */
export async function createTestFile(dirPath, filename, size = 1024) {
  const filePath = path.join(dirPath, filename);
  const buffer = Buffer.alloc(size, 'x');
  await fs.writeFile(filePath, buffer);
  return filePath;
}

/**
 * Waits for a specified number of milliseconds
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  createTempDir,
  removeDir,
  createTestFile,
  wait
};
