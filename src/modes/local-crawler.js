import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import Logger from '../utils/logger.js';
import * as validators from '../utils/validators.js';
import * as pathUtils from '../utils/paths.js';
import configManager from '../utils/config.js';
import { computeFileHash } from '../utils/hash-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { DEFAULT_CONFIG } from '../utils/config.js';

class LocalCrawler {
  constructor(options = {}) {
    // Merge: CLI/explicit options > config file > DEFAULT_CONFIG
    const config = configManager.getConfig();
    this.options = { ...DEFAULT_CONFIG, ...config, ...options };
    
    // Ensure maxFiles is set (use maxDownloads as fallback if needed)
    if (!this.options.maxFiles && this.options.maxDownloads) {
      this.options.maxFiles = this.options.maxDownloads;
    } else if (!this.options.maxFiles) {
      this.options.maxFiles = 50; // Absolute fallback
    }
    
    // Special case: sourceDir/platform-specific
    if (!this.options.sourceDir) {
      this.options.sourceDir = configManager.getPlatformSettings()?.defaultScanPath || path.join(platform.homedir, 'Pictures');
    }
    if (!this.options.outputDir) {
      this.options.outputDir = pathUtils.getDefaultDownloadDir();
    }
    this.fileCount = 0;
    this.processedCount = 0; // Track total files processed, not just copied
    this.skippedFiles = 0;
    this.errorFiles = 0;
    this.seenHashes = new Set();
    
    Logger.info(`Maximum file limit set to: ${this.options.maxFiles} files`);
  }

  /**
   * Start the crawling process
   */
  async start() {
    try {
      Logger.info('Starting local crawler...');
      Logger.debug(`Options: ${JSON.stringify(this.options, null, 2)}`);

      // Validate source directory
      const sourceValidation = await validators.validateDirectory(this.options.sourceDir);
      if (!sourceValidation.valid) {
        throw new Error(`Source directory is invalid: ${sourceValidation.message}`);
      }

      // Validate output directory is defined
      if (!this.options.outputDir) {
        Logger.warn('Output directory is undefined, using default directory');
        this.options.outputDir = path.join(process.cwd(), 'downloads');
        Logger.info(`Using default output directory: ${this.options.outputDir}`);
      }

      try {
        // Ensure output directory exists
        Logger.debug(`Ensuring output directory exists: ${this.options.outputDir}`);
        await pathUtils.ensureDir(this.options.outputDir);
      } catch (error) {
        Logger.error(`Failed to ensure directory exists: ${this.options.outputDir}`, error);
        throw new Error(`Failed to create output directory: ${error.message}`);
      }

      // Validate output directory is writable
      const outputValidation = await validators.validateWritable(this.options.outputDir);
      if (!outputValidation.valid) {
        throw new Error(`Output directory is not writable: ${outputValidation.message}`);
      }

      // Initialize seen hashes from existing files (recursive)
      const scanHashes = async (dir) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await scanHashes(fullPath);
          } else if (entry.isFile()) {
            const h = await computeFileHash(fullPath);
            this.seenHashes.add(h);
          }
        }
      };
      await scanHashes(this.options.outputDir);

      // Start scanning
      Logger.info(`Scanning directory: ${this.options.sourceDir}`);
      await this.scanDirectory(this.options.sourceDir);

      // Report on the results
      if (this.fileCount < this.options.maxFiles) {
        Logger.warn(`Only copied ${this.fileCount}/${this.options.maxFiles} files`);
        Logger.info('This may be because not enough files matched your criteria (size/dimensions/type).');
      } else {
        Logger.info(`Successfully copied exactly ${this.fileCount} files as requested`);
      }
      
      Logger.success(`Crawling completed. Files processed: ${this.processedCount}, copied: ${this.fileCount}, skipped: ${this.skippedFiles}, errors: ${this.errorFiles}`);
      return {
        processed: this.processedCount,
        copied: this.fileCount,
        skipped: this.skippedFiles,
        errors: this.errorFiles,
        maxFiles: this.options.maxFiles
      };
    } catch (error) {
      Logger.error('Error during crawling:', error);
      throw error;
    }
  }

  /**
   * Recursively scan a directory for image files
   * @param {string} dir - Directory to scan
   */
  async scanDirectory(dir) {
    try {
      // If we've already reached the max files, don't scan further
      if (this.fileCount >= this.options.maxFiles) {
        return;
      }
      
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        // Check if we've reached the limit before processing each entry
        if (this.fileCount >= this.options.maxFiles) {
          Logger.info(`Maximum file limit of ${this.options.maxFiles} reached, stopping scan`);
          return;
        }

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath);
        } else if (entry.isFile()) {
          // Track total files processed regardless of whether they're copied
          this.processedCount++;
          
          // Log progress for every 100 files processed
          if (this.processedCount % 100 === 0) {
            Logger.info(`Processed ${this.processedCount} files, copied ${this.fileCount}/${this.options.maxFiles}...`);
          }
          
          await this.processFile(fullPath, dir);
        }
      }
    } catch (error) {
      Logger.error(`Error scanning directory ${dir}:`, error);
      throw error;
    }
  }

  /**
   * Process a single file
   * @param {string} filePath - Path to the file
   * @param {string} baseDir - Base directory for relative path calculation
   */
  async processFile(filePath, baseDir) {
    try {
      // Check file extension
      const ext = path.extname(filePath).toLowerCase().substring(1);
      if (!this.options.fileTypes.includes(ext)) {
        this.skippedFiles++;
        return;
      }

      // Check file size
      const stats = await fs.stat(filePath);
      if (stats.size < this.options.minFileSize) {
        this.skippedFiles++;
        return;
      }

      // Check image dimensions if needed
      if (this.options.minWidth > 0 || this.options.minHeight > 0) {
        try {
          const metadata = await sharp(filePath).metadata();
          if ((this.options.minWidth > 0 && metadata.width < this.options.minWidth) ||
              (this.options.minHeight > 0 && metadata.height < this.options.minHeight)) {
            this.skippedFiles++;
            return;
          }
        } catch (error) {
          Logger.warn(`Could not read image metadata for ${filePath}:`, error.message);
          this.errorFiles++;
          return;
        }
      }

      // Deduplication: skip if hash seen
      const fileHash = await computeFileHash(filePath);
      if (this.seenHashes.has(fileHash)) {
        Logger.info(`Skipping duplicate local file by hash: ${path.basename(filePath)}`);
        this.skippedFiles++;
        return;
      }
      this.seenHashes.add(fileHash);

      // Determine output path
      let outputPath;
      if (this.options.preserveStructure) {
        const relativePath = path.relative(this.options.sourceDir, path.dirname(filePath));
        outputPath = path.join(this.options.outputDir, relativePath, path.basename(filePath));
        await pathUtils.ensureDir(path.dirname(outputPath));
      } else {
        const filename = path.basename(filePath);
        outputPath = path.join(this.options.outputDir, filename);
        
        // Handle filename conflicts
        let counter = 1;
        let newPath = outputPath;
        while (await pathUtils.pathExists(newPath)) {
          const ext = path.extname(filename);
          const name = path.basename(filename, ext);
          newPath = path.join(path.dirname(outputPath), `${name}_${counter}${ext}`);
          counter++;
        }
        outputPath = newPath;
      }

      // Check if we've reached the max files limit before copying
      if (this.fileCount >= this.options.maxFiles) {
        Logger.debug(`Skipping file ${filePath} as max limit of ${this.options.maxFiles} has been reached`);
        return;
      }
      
      // Copy the file
      await fs.copy(filePath, outputPath);
      this.fileCount++;
      
      // Log progress
      if (this.fileCount % 5 === 0 || this.fileCount === this.options.maxFiles) {
        Logger.info(`Copied ${this.fileCount}/${this.options.maxFiles} files...`);
      }
      
      // If we've reached the limit, log it
      if (this.fileCount >= this.options.maxFiles) {
        Logger.info(`Maximum file limit of ${this.options.maxFiles} reached, stopping copy operations`);
      }
    } catch (error) {
      Logger.error(`Error processing file ${filePath}:`, error);
      this.errorFiles++;
    }
  }
}

export default LocalCrawler;