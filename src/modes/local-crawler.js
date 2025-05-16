import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import Logger from '../utils/logger.js';
import * as validators from '../utils/validators.js';
import * as pathUtils from '../utils/paths.js';
import configManager from '../utils/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LocalCrawler {
  constructor(options = {}) {
    this.options = {
      sourceDir: options.sourceDir || configManager.getPlatformSettings().defaultScanPath,
      outputDir: options.outputDir || pathUtils.getDefaultDownloadDir(),
      minWidth: options.minWidth || 800,
      minHeight: options.minHeight || 600,
      minFileSize: options.minFileSize || 0,
      fileTypes: options.fileTypes || ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      maxFiles: options.maxFiles || Number.MAX_SAFE_INTEGER,
      preserveStructure: options.preserveStructure === true, // Default to flat structure
      ...options
    };

    this.fileCount = 0;
    this.skippedFiles = 0;
    this.errorFiles = 0;
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

      // Ensure output directory exists
      await pathUtils.ensureDir(this.options.outputDir);

      // Validate output directory is writable
      const outputValidation = await validators.validateWritable(this.options.outputDir);
      if (!outputValidation.valid) {
        throw new Error(`Output directory is not writable: ${outputValidation.message}`);
      }

      // Start scanning
      Logger.info(`Scanning directory: ${this.options.sourceDir}`);
      await this.scanDirectory(this.options.sourceDir);

      Logger.success(`Crawling completed. Files processed: ${this.fileCount}, skipped: ${this.skippedFiles}, errors: ${this.errorFiles}`);
      return {
        total: this.fileCount,
        skipped: this.skippedFiles,
        errors: this.errorFiles
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
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (this.fileCount >= this.options.maxFiles) {
          Logger.info('Maximum file limit reached, stopping scan');
          break;
        }

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath);
        } else if (entry.isFile()) {
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

      // Copy the file
      await fs.copy(filePath, outputPath);
      this.fileCount++;
      
      if (this.fileCount % 100 === 0) {
        Logger.info(`Processed ${this.fileCount} files...`);
      }
    } catch (error) {
      Logger.error(`Error processing file ${filePath}:`, error);
      this.errorFiles++;
    }
  }
}

export default LocalCrawler;