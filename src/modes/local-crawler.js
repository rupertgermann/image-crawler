import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';
import EventEmitter from 'events';
// Logger is not directly used anymore, events are emitted instead.
// import Logger from '../utils/logger.js';
import * as validators from '../utils/validators.js';
import * as pathUtils from '../utils/paths.js';
import configManager, { DEFAULT_CONFIG } from '../utils/config.js';
import { computeFileHash } from '../utils/hash-utils.js';

class LocalCrawler extends EventEmitter {
  constructor(options = {}) {
    super();
    const config = configManager.getConfig(); // Get merged config
    
    // Options merging: explicit constructor options > config file settings > DEFAULT_CONFIG
    // Renderer sends options like sourceDir, outputDir, minWidth etc. directly.
    // These should override anything from config file or defaults for this specific scan.
    this.options = { 
      ...DEFAULT_CONFIG, // Base defaults
      ...config,         // Config file values
      ...options         // Explicitly passed options from Electron UI
    };

    // Normalize option names (renderer uses maxDownloads and extensions)
    if (this.options.maxDownloads === undefined && this.options.maxFiles !== undefined) {
        this.options.maxDownloads = this.options.maxFiles;
    }
    if (this.options.extensions === undefined && this.options.fileTypes !== undefined) {
        this.options.extensions = this.options.fileTypes;
    }


    // Fallback for maxDownloads if still not set
    if (this.options.maxDownloads === undefined || this.options.maxDownloads === null || this.options.maxDownloads <=0) {
      this.options.maxDownloads = Infinity; // Process all files if not specified or invalid
      this.emit('log', 'info', `Max files not specified or invalid, set to unlimited.`);
    } else {
      this.emit('log', 'info', `Maximum file limit set to: ${this.options.maxDownloads} files.`);
    }
    
    // Ensure sourceDir and outputDir are set (these should be passed by renderer)
    if (!this.options.sourceDir) {
        const defaultScan = pathUtils.getDefaultScanDir(); // from paths.js
        this.emit('log', 'warn', `Source directory not provided, using default: ${defaultScan}`);
        this.options.sourceDir = defaultScan;
    }
    if (!this.options.outputDir) {
        const defaultOutput = pathUtils.getDefaultDownloadDir(); // from paths.js
        this.emit('log', 'warn', `Output directory not provided, using default: ${defaultOutput}`);
        this.options.outputDir = defaultOutput;
    }
    
    // Convert minFileSize from string (e.g., "50KB") to bytes
    if (typeof this.options.minSize === 'string') {
        this.options.minFileSize = pathUtils.parseSize(this.options.minSize);
    } else if (typeof this.options.minSize === 'number') {
        this.options.minFileSize = this.options.minSize; // Already a number
    } else {
        this.options.minFileSize = DEFAULT_CONFIG.minFileSize ? pathUtils.parseSize(DEFAULT_CONFIG.minFileSize) : 0;
    }


    this.fileCount = 0; // Files copied
    this.processedCount = 0;
    this.skippedFiles = 0;
    this.errorFiles = 0;
    this.totalFilesToScan = 0; // Will be estimated first for progress
    this.seenHashes = new Set();
    this.stopRequested = false; // Added for stop functionality
  }

  async stop() {
    this.stopRequested = true;
    this.emit('log', 'info', 'Stop request received. Attempting to halt scanning...');
    // The actual stopping happens due to checks in scanDirectory/processFile.
    // This method can resolve quickly.
  }

  async _estimateTotalFiles(dir) {
    let count = 0;
    if (this.stopRequested) return 0; // Check at the beginning
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (this.stopRequested) {
          this.emit('log', 'debug', 'File estimation stopped by request mid-directory.');
          return count; // Return current count if stopped
        }
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          count += await this._estimateTotalFiles(fullPath);
        } else if (entry.isFile()) {
          // Basic check for extension matching if possible
          const ext = path.extname(fullPath).toLowerCase().substring(1);
          if (this.options.extensions && this.options.extensions.includes(ext)) {
            count++;
          } else if (!this.options.extensions || this.options.extensions.length === 0) {
            count++; // If no extensions specified, count all files
          }
        }
      }
    } catch(e) {
        this.emit('log', 'error', `Error estimating files in ${dir}: ${e.message}`);
    }
    return count;
  }

  async start() {
    try {
      this.emit('log', 'info', 'Starting local crawler...');
      this.emit('log', 'debug', `Effective options: ${JSON.stringify(this.options, null, 2)}`);

      if (this.stopRequested) {
        this.emit('log', 'info', 'Scan aborted before start due to stop request.');
        this.emit('complete', { status: 'stopped', message: 'Scan aborted before start.'});
        return;
      }

      const sourceValidation = await validators.validateDirectory(this.options.sourceDir);
      if (!sourceValidation.valid) {
        this.emit('error', `Source directory is invalid: ${sourceValidation.message}`);
        throw new Error(`Source directory is invalid: ${sourceValidation.message}`);
      }

      if (!this.options.outputDir) {
        this.emit('error', 'Output directory is undefined.');
        throw new Error('Output directory is undefined.');
      }
      await pathUtils.ensureDir(this.options.outputDir);
      const outputValidation = await validators.validateWritable(this.options.outputDir);
      if (!outputValidation.valid) {
        this.emit('error', `Output directory is not writable: ${outputValidation.message}`);
        throw new Error(`Output directory is not writable: ${outputValidation.message}`);
      }
      
      this.emit('log', 'info', `Estimating total files in ${this.options.sourceDir}...`);
      this.totalFilesToScan = await this._estimateTotalFiles(this.options.sourceDir);
      this.emit('log', 'info', `Estimated ${this.totalFilesToScan} potential files to scan.`);
      this.emit('progress', { processed: 0, total: this.totalFilesToScan, currentFile: '' });


      this.emit('log', 'info', 'Scanning output directory for existing file hashes...');
      const scanHashes = async (dir) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await scanHashes(fullPath);
          } else if (entry.isFile()) {
            try {
                const h = await computeFileHash(fullPath);
                this.seenHashes.add(h);
            } catch(hashError){
                this.emit('log', 'warn', `Could not compute hash for existing file ${fullPath}: ${hashError.message}`);
            }
          }
        }
      };
      await scanHashes(this.options.outputDir);
      this.emit('log', 'info', `Found ${this.seenHashes.size} existing file hashes.`);

      if (this.stopRequested) {
        this.emit('log', 'info', 'Scan aborted before directory scan due to stop request.');
        this.emit('complete', { status: 'stopped', message: 'Scan aborted before directory scan.'});
        return;
      }

      this.emit('log', 'info', `Scanning source directory: ${this.options.sourceDir}`);
      await this.scanDirectory(this.options.sourceDir);

      const summary = {
        processedFiles: this.processedCount,
        foundImages: this.fileCount, // In this context, foundImages means copied images
        copiedImages: this.fileCount,
        skippedFiles: this.skippedFiles,
        errorCount: this.errorFiles,
        maxFilesReached: this.fileCount >= this.options.maxDownloads,
        stoppedByUser: this.stopRequested // Add status if stopped
      };

      if (this.stopRequested) {
        this.emit('log', 'info', `Crawling stopped by user request. Summary: ${JSON.stringify(summary)}`);
      } else {
        this.emit('log', 'info', `Crawling completed. Summary: ${JSON.stringify(summary)}`);
      }
      this.emit('complete', summary);
      return summary;

    } catch (error) {
      this.emit('log', 'error', `Error during crawling: ${error.message}`);
      this.emit('error', `Crawling failed: ${error.message}`, error.stack);
      throw error; // Re-throw for main.js to catch
    }
  }

  async scanDirectory(dir) {
    try {
      if (this.fileCount >= this.options.maxDownloads) return;
      if (this.stopRequested) { // Check at the beginning of each directory scan
        this.emit('log', 'info', `Scan of directory ${dir} aborted due to stop request.`);
        return;
      }
      
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (this.stopRequested) { // Check before processing each entry
          this.emit('log', 'info', `Stopping scan in ${dir} due to request.`);
          return;
        }
        if (this.fileCount >= this.options.maxDownloads) {
          this.emit('log', 'info', `Maximum file limit of ${this.options.maxDownloads} reached, stopping scan.`);
          return;
        }

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath);
        } else if (entry.isFile()) {
          this.processedCount++;
          this.emit('progress', { 
            processed: this.processedCount, 
            total: this.totalFilesToScan, 
            currentFile: path.basename(fullPath) 
          });
          
          if (this.processedCount % 100 === 0) {
            this.emit('log', 'info', `Processed ${this.processedCount}/${this.totalFilesToScan} files, copied ${this.fileCount}/${this.options.maxDownloads}...`);
          }
          await this.processFile(fullPath);
        }
      }
    } catch (error) {
      this.emit('log', 'error', `Error scanning directory ${dir}: ${error.message}`);
      // Decide if this should emit('error') or just log
    }
  }

  async processFile(filePath) {
    if (this.stopRequested) { // Check at the beginning of file processing
      this.emit('log', 'debug', `Skipping processing of ${filePath} due to stop request.`);
      return;
    }
    try {
      const ext = path.extname(filePath).toLowerCase().substring(1);
      if (this.options.extensions && this.options.extensions.length > 0 && !this.options.extensions.includes(ext)) {
        this.skippedFiles++;
        return;
      }

      const stats = await fs.stat(filePath);
      if (this.options.minFileSize && stats.size < this.options.minFileSize) {
        this.skippedFiles++;
        this.emit('log', 'debug', `Skipped (size): ${filePath} (${stats.size}b < ${this.options.minFileSize}b)`);
        return;
      }

      if (this.options.minWidth > 0 || this.options.minHeight > 0) {
        try {
          const metadata = await sharp(filePath).metadata();
          if ((this.options.minWidth > 0 && metadata.width < this.options.minWidth) ||
              (this.options.minHeight > 0 && metadata.height < this.options.minHeight)) {
            this.skippedFiles++;
            this.emit('log', 'debug', `Skipped (dims): ${filePath} (${metadata.width}x${metadata.height})`);
            return;
          }
        } catch (error) {
          this.emit('log', 'warn', `Could not read image metadata for ${filePath}: ${error.message}`);
          this.errorFiles++;
          return;
        }
      }

      const fileHash = await computeFileHash(filePath);
      if (this.seenHashes.has(fileHash)) {
        this.emit('log', 'info', `Skipping duplicate local file by hash: ${path.basename(filePath)}`);
        this.skippedFiles++;
        return;
      }
      

      let outputPath;
      const filename = path.basename(filePath);
      if (this.options.preserveStructure) {
        const relativePath = path.relative(this.options.sourceDir, path.dirname(filePath));
        outputPath = path.join(this.options.outputDir, relativePath, filename);
        await pathUtils.ensureDir(path.dirname(outputPath));
      } else {
        outputPath = path.join(this.options.outputDir, filename);
        let counter = 1;
        let newPath = outputPath;
        while (await pathUtils.pathExists(newPath)) {
          const fileExt = path.extname(filename);
          const baseName = path.basename(filename, fileExt);
          newPath = path.join(path.dirname(outputPath), `${baseName}_${counter}${fileExt}`);
          counter++;
        }
        outputPath = newPath;
      }

      if (this.fileCount >= this.options.maxDownloads) {
        this.emit('log', 'debug', `Skipping file ${filePath} as max limit of ${this.options.maxDownloads} has been reached during processing.`);
        return;
      }
      
      await fs.copy(filePath, outputPath);
      this.fileCount++;
      this.seenHashes.add(fileHash); // Add hash only after successful copy
      this.emit('log', 'info', `Copied: ${filePath} to ${outputPath}`);
      
      if (this.fileCount % 5 === 0 || this.fileCount === this.options.maxDownloads) {
        this.emit('log', 'info', `Copied ${this.fileCount}/${this.options.maxDownloads} files...`);
      }
      
      if (this.fileCount >= this.options.maxDownloads) {
        this.emit('log', 'info', `Maximum file limit of ${this.options.maxDownloads} reached.`);
      }
    } catch (error) {
      this.emit('log', 'error', `Error processing file ${filePath}: ${error.message}`);
      this.errorFiles++;
    }
  }
}

export default LocalCrawler;