import { chromium } from 'playwright';
import fs from 'fs-extra';
import path from 'path';
import EventEmitter from 'events';
// import sharp from 'sharp'; // Not explicitly used for conversion, only metadata if dimensions are checked by crawler not provider
import { computeFileHash, computeBufferHash } from '../utils/hash-utils.js';
import * as validators from '../utils/validators.js';
import * as pathUtils from '../utils/paths.js';
import configManager, { DEFAULT_CONFIG } from '../utils/config.js';
import ProviderRegistry from '../providers/provider-registry.js';

class PlaywrightCrawler extends EventEmitter {
  constructor(options = {}) {
    super();
    // Set provider override before getting config, as it affects provider loading
    configManager.setCliProviderOverrides(options.provider);
    
    const config = configManager.getConfig(); // Gets merged config (defaults + file)
    
    // Options merging: UI/explicit options > config file settings > DEFAULT_CONFIG
    this.options = { 
      ...DEFAULT_CONFIG, 
      ...config, 
      ...options 
    };
    
    // Normalize maxDownloads from UI (maxDownloads) or CLI (maxDownloads) vs config (maxDownloads)
    this.totalDownloadLimit = parseInt(this.options.maxDownloads, 10);
    if (isNaN(this.totalDownloadLimit) || this.totalDownloadLimit <= 0) {
      this.totalDownloadLimit = DEFAULT_CONFIG.maxDownloads; // Fallback to absolute default
      this.emit('log', 'warn', `Invalid maxDownloads value (${this.options.maxDownloads}). Falling back to default: ${this.totalDownloadLimit}`);
    }
    this.options.maxDownloads = this.totalDownloadLimit; // Ensure options reflects the validated number
    
    // Convert minFileSize from string (e.g., "50KB") to bytes
    if (typeof this.options.minSize === 'string') {
        this.options.minFileSize = pathUtils.parseSize(this.options.minSize);
    } else if (typeof this.options.minSize === 'number') {
        this.options.minFileSize = this.options.minSize;
    } else {
        this.options.minFileSize = DEFAULT_CONFIG.minFileSize ? pathUtils.parseSize(DEFAULT_CONFIG.minFileSize) : 0;
    }
    if(this.options.extensions && !this.options.allowedFileTypes) {
        this.options.allowedFileTypes = this.options.extensions; // Aligning with some config naming
    }


    this.providerRegistry = new ProviderRegistry(); // Pass this (crawler instance) as emitter
    this.downloadedCount = 0;
    this.processedImagesFromProviders = 0; // Count of images processed from all provider fetchImageUrls calls
    this.skippedCount = 0;
    this.errorCount = 0;
    this.browser = null;
    this.page = null;
    this.context = null;
    this.providerSummaries = []; // To store per-provider stats
  }

  async start() {
    this.emit('log', 'info', 'Starting Playwright web crawler...');
    try {
      // Initialize provider registry, passing this crawler as the emitter for providers
      await this.providerRegistry.initialize(this); 
      const activeProviders = this.providerRegistry.getActiveProviders();

      if (activeProviders.length === 0) {
        this.emit('log', 'warn', 'No active providers. Check your configuration or --provider argument. Exiting.');
        this.emit('complete', { downloaded: 0, skipped: 0, errors: 0, providerSummaries: [] });
        return { success: false, downloaded: 0, skipped: 0, errors: 0 };
      }

      this.emit('log', 'debug', `Effective options: ${JSON.stringify(this.options, null, 2)}`);
      this.emit('log', 'info', `Active providers: ${activeProviders.map(p => p.name).join(', ')}`);

      await pathUtils.ensureDir(this.options.outputDir);
      const outputValidation = await validators.validateWritable(this.options.outputDir);
      if (!outputValidation.valid) {
        throw new Error(`Output directory is not writable: ${outputValidation.message}`);
      }

      this.seenHashes = new Set();
      const existingFiles = await fs.readdir(this.options.outputDir);
      for (const fname of existingFiles) {
        try {
            const fpath = path.join(this.options.outputDir, fname);
            // Basic check to ensure it's a file and not a dir, though hash will fail for dir
            if ((await fs.stat(fpath)).isFile()) { 
                const h = await computeFileHash(fpath);
                this.seenHashes.add(h);
            }
        } catch(e) {
            this.emit('log', 'warn', `Could not process existing file for hashing: ${fname} - ${e.message}`);
        }
      }
      this.emit('log', 'info', `Initialized with ${this.seenHashes.size} existing file hashes.`);

      this.browser = await chromium.launch({ headless: this.options.headless, timeout: this.options.timeout || 60000 });
      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        viewport: { width: 1280, height: 800 },
        ignoreHTTPSErrors: true
      });
      this.page = await this.context.newPage();
      this.emit('log', 'info', `Browser launched. Max download limit: ${this.totalDownloadLimit}`);

      for (const providerInstance of activeProviders) {
        if (this.downloadedCount >= this.totalDownloadLimit) {
          this.emit('log', 'info', `Global download limit (${this.totalDownloadLimit}) reached. Stopping further providers.`);
          break;
        }
        
        const providerName = providerInstance.name;
        const remainingForGlobalLimit = this.totalDownloadLimit - this.downloadedCount;
        // Provider-specific maxResults is part of its own config, merged into this.options.providers[providerName].maxResults
        // The UI sends `maxDownloads` which becomes this.totalDownloadLimit.
        // For each provider, we can aim for a portion or just pass remainingForGlobalLimit.
        const providerMaxResults = Math.min(remainingForGlobalLimit, providerInstance.config.maxResults || remainingForGlobalLimit);

        this.emit('log', 'info', `Attempting to download up to ${providerMaxResults} images from ${providerName}...`);
        this.emit('progress', { provider: providerName, message: `Starting provider ${providerName}`, downloadedCount: this.downloadedCount, requestedCount: this.totalDownloadLimit });
        
        let providerDownloaded = 0;
        let providerErrors = 0;

        try {
          // Pass `this` (crawler instance) to provider's initialize method
          if(typeof providerInstance.initialize === 'function') {
            await providerInstance.initialize(this); 
          }

          const imageUrls = await providerInstance.fetchImageUrls(
            this.options.query,
            { maxResults: providerMaxResults }, // Pass the calculated max for this provider
            this.page
          );
          this.processedImagesFromProviders += imageUrls.length;
          this.emit('log', 'info', `Found ${imageUrls.length} potential image URLs from ${providerName}. Processing...`);

          for (const imageUrl of imageUrls) {
            if (this.downloadedCount >= this.totalDownloadLimit) {
              this.emit('log', 'info', `Global download limit reached while processing images from ${providerName}.`);
              break;
            }
            const processed = await this.processImage(imageUrl, providerName, providerInstance);
            if (processed) providerDownloaded++;
          }
        } catch (error) {
          this.emit('log', 'error', `Error crawling ${providerName}: ${error.message}`);
          providerErrors++;
          this.errorCount++; // Global error count
        }
        this.providerSummaries.push({ provider: providerName, downloadedCount: providerDownloaded, errorCount: providerErrors });
        this.emit('log', 'info', `Finished with ${providerName}. Downloaded: ${providerDownloaded}, Errors: ${providerErrors}. Total downloaded: ${this.downloadedCount}/${this.totalDownloadLimit}`);
      }
    } catch (error) {
      this.emit('log', 'error', `Fatal error during web crawling: ${error.message}`);
      this.emit('error', { message: `Crawling failed: ${error.message}`, details: error.stack });
    } finally {
      if (this.browser) {
        try {
          await this.browser.close();
          this.emit('log', 'info', 'Browser closed.');
        } catch (e) {
          this.emit('log', 'error', `Error closing browser: ${e.message}`);
        }
      }
    }
    const summary = { downloaded: this.downloadedCount, skipped: this.skippedCount, errors: this.errorCount, providerSummaries: this.providerSummaries };
    this.emit('log', 'info', `Web crawling complete. Summary: ${JSON.stringify(summary)}`);
    this.emit('complete', summary);
    return summary; // Return summary
  }

  async processImage(imageUrl, source, providerInstance) {
    if (!validators.validateUrl(imageUrl).valid) {
      this.emit('log', 'warn', `Skipping invalid URL from ${source}: ${imageUrl}`);
      this.skippedCount++;
      return false;
    }

    let finalImageUrl = imageUrl;
    try {
      if (typeof providerInstance.getFullSizeImage === 'function') {
        const fullSizeUrl = await providerInstance.getFullSizeImage(this.page, imageUrl);
        if (fullSizeUrl && validators.validateUrl(fullSizeUrl).valid) {
          finalImageUrl = fullSizeUrl;
        } else if (fullSizeUrl) {
          this.emit('log', 'warn', `Provider ${source} returned invalid full-size URL: ${fullSizeUrl}. Using original: ${imageUrl}`);
        }
      }
    } catch (err) {
      this.emit('log', 'warn', `Error getting full-size image from ${source} for ${imageUrl}: ${err.message}. Using original URL.`);
    }
    
    this.emit('progress', { provider: source, currentUrl: finalImageUrl, downloadedCount: this.downloadedCount, requestedCount: this.totalDownloadLimit, message: 'Processing image' });

    const imageName = path.basename(new URL(finalImageUrl).pathname) || `${source.toLowerCase()}_${Date.now()}`;
    let extension = path.extname(imageName).toLowerCase();
    // Validate against allowedFileTypes from options
    const allowedTypes = this.options.allowedFileTypes || DEFAULT_CONFIG.fileTypes;
    if (extension && !allowedTypes.includes(extension.substring(1))) {
        this.emit('log', 'info', `Skipping image ${finalImageUrl} due to disallowed file type: ${extension}`);
        this.skippedCount++;
        return false;
    }
    if (!extension || !allowedTypes.includes(extension.substring(1))) {
        extension = `.${allowedTypes[0] || 'jpg'}`; // Default to first allowed type or jpg
    }

    const baseName = pathUtils.sanitizeFilename(imageName.substring(0, imageName.length - path.extname(imageName).length));
    const finalImageName = `${source.toLowerCase()}_${baseName}${extension}`;
    const filePath = path.join(this.options.outputDir, finalImageName);

    try {
      if (typeof providerInstance.validateImageMeetsCriteria === 'function') {
        const meetsCriteria = await providerInstance.validateImageMeetsCriteria(this.page, finalImageUrl, {
          minWidth: this.options.minWidth, minHeight: this.options.minHeight,
        });
        if (!meetsCriteria) {
          this.emit('log', 'info', `Image ${finalImageUrl} from ${source} does not meet dimension criteria. Skipping.`);
          this.skippedCount++;
          return false;
        }
      }

      const response = await this.page.goto(finalImageUrl, { waitUntil: 'commit', timeout: this.options.timeout || 60000 });
      if (!response || !response.ok()) {
        this.emit('log', 'warn', `Failed to fetch image ${finalImageUrl} from ${source}. Status: ${response ? response.status() : 'unknown'}`);
        this.skippedCount++;
        return false;
      }
      const buffer = await response.body();

      if (this.options.minFileSize && buffer.length < this.options.minFileSize) {
        this.emit('log', 'info', `Image ${finalImageName} from ${source} is too small (${buffer.length} bytes). Skipping.`);
        this.skippedCount++;
        return false;
      }

      const hash = await computeBufferHash(buffer);
      if (this.seenHashes.has(hash)) {
        this.emit('log', 'info', `Skipping duplicate image by hash: ${finalImageName}`);
        this.skippedCount++;
        return false;
      }
      
      await fs.writeFile(filePath, buffer);
      this.seenHashes.add(hash);
      this.downloadedCount++;
      this.emit('log', 'info', `Downloaded: ${finalImageName} from ${source} (${this.downloadedCount}/${this.totalDownloadLimit})`);
      this.emit('progress', { provider: source, downloadedCount: this.downloadedCount, requestedCount: this.totalDownloadLimit, message: 'Image downloaded' });
      return true;

    } catch (error) {
      this.emit('log', 'error', `Error processing image ${finalImageUrl} from ${source}: ${error.message}`);
      this.errorCount++;
      if (await fs.pathExists(filePath)) {
        try { await fs.remove(filePath); } catch (e) { this.emit('log', 'error', `Failed to remove partial file ${filePath}`); }
      }
      return false;
    }
  }
  // Deprecated specific crawl methods removed.
}

export default PlaywrightCrawler;
