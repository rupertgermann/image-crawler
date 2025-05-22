const crypto = require('crypto');
const fs = require('fs-extra');

/**
 * Compute MD5 hash of a Buffer
 * @param {Buffer} buffer
 * @returns {Promise<string>} Hex digest
 */
async function computeBufferHash(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Compute MD5 hash of a file
 * @param {string} filePath
 * @returns {Promise<string>} Hex digest
 */
async function computeFileHash(filePath) {
  const buffer = await fs.readFile(filePath);
  return computeBufferHash(buffer);
}

module.exports = {
  computeBufferHash,
  computeFileHash
};
