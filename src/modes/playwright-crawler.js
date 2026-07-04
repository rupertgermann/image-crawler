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
    this.stopRequested = false; // Added for stop functionality
  }

  async stop() {
    this.stopRequested = true;
    this.emit('log', 'info', 'Stop request received for web crawler. Attempting to halt operations...');
    if (this.browser && this.browser.isConnected()) {
        this.emit('log', 'info', 'Closing browser due to stop request...');
        try {
            await this.browser.close();
            this.emit('log', 'info', 'Browser closed successfully by stop request.');
        } catch (e) {
            this.emit('log', 'error', `Error closing browser during stop: ${e.message}`);
        }
    }
  }

  async start() {
    this.emit('log', 'info', 'Starting Playwright web crawler...');
    try {
      if (this.stopRequested) {
        this.emit('log', 'info', 'Web crawl aborted before operations due to stop request.');
        this.emit('complete', { status: 'stopped', downloaded: 0, skipped: 0, errors: 0, providerSummaries: [], stoppedByUser: true });
        return { success: false, downloaded: 0, skipped: 0, errors: 0, stoppedByUser: true };
      }

      // Initialize provider registry, passing this crawler as the emitter for providers
      this.emit('log', 'debug', 'Initializing ProviderRegistry...');
      await this.providerRegistry.initialize(this); 
      const activeProviders = this.providerRegistry.getActiveProviders();
      this.emit('log', 'debug', `ProviderRegistry initialized. Active providers count: ${activeProviders.length}`);

      if (activeProviders.length === 0) {
        this.emit('log', 'warn', 'No active providers. Check your configuration or --provider argument. Exiting.');
        this.emit('complete', { downloaded: 0, skipped: 0, errors: 0, providerSummaries: [] });
        return { success: false, downloaded: 0, skipped: 0, errors: 0 };
      }

      this.emit('log', 'debug', `Effective options: ${JSON.stringify(this.options, null, 2)}`);
      this.emit('log', 'info', `Active providers: ${activeProviders.map(p => p.name).join(', ')}`);
      this.emit('log', 'debug', 'Entering provider processing loop...');

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

      if (this.stopRequested) { // Check after browser launch, before provider loop
        this.emit('log', 'info', 'Web crawl aborted after browser launch due to stop request.');
        // Browser will be closed in finally block
        return; // Exit early, finally block will handle cleanup
      }

      for (const providerInstance of activeProviders) {
        this.emit('log', 'debug', `Processing provider: ${providerInstance.name}`);
        if (this.stopRequested) {
          this.emit('log', 'info', 'Stopping provider processing loop due to stop request.');
          break;
        }
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
            this.emit('log', 'debug', `Initializing provider: ${providerName}`);
            await providerInstance.initialize(this); 
          }

          this.emit('log', 'debug', `Fetching image URLs from ${providerName} for query: "${this.options.query}"`);
          const imageUrls = await providerInstance.fetchImageUrls(
            this.options.query,
            { maxResults: providerMaxResults }, // Pass the calculated max for this provider
            this.page
          );
          this.processedImagesFromProviders += imageUrls.length;
          this.emit('log', 'info', `Found ${imageUrls.length} potential image URLs from ${providerName}. Processing...`);

          for (const imageUrl of imageUrls) {
            if (this.stopRequested) {
              this.emit('log', 'info', `Stopping image processing for ${providerName} due to stop request.`);
              break;
            }
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
      if (this.browser && this.browser.isConnected()) { // Check isConnected before closing
        try {
          await this.browser.close();
          this.emit('log', 'info', 'Browser closed.');
        } catch (e) {
          this.emit('log', 'error', `Error closing browser: ${e.message}`);
        }
      }
    }
    const summary = { 
      downloaded: this.downloadedCount, 
      skipped: this.skippedCount, 
      errors: this.errorCount, 
      providerSummaries: this.providerSummaries,
      stoppedByUser: this.stopRequested // Add status if stopped
    };
    this.emit('log', 'info', `Web crawling complete. Summary: ${JSON.stringify(summary)}`);
    this.emit('complete', summary);
    return summary; // Return summary
  }

  async processImage(imageInfo, source, providerInstance) {
    // Handle both string URLs and image info objects
    let imageUrl;
    let imageTitle;
    
    if (typeof imageInfo === 'string') {
      // If imageInfo is already a string URL, use it directly
      imageUrl = imageInfo;
      imageTitle = `Image from ${source}`;
    } else if (imageInfo && typeof imageInfo === 'object') {
      // If imageInfo is an object (from providers like AdobeStock), extract URL and metadata
      // First check for fullSizeUrl (highest priority)
      if (imageInfo.fullSizeUrl && typeof imageInfo.fullSizeUrl === 'string' && validators.validateUrl(imageInfo.fullSizeUrl).valid) {
        imageUrl = imageInfo.fullSizeUrl;
      }
      // Then check for thumbnailUrl
      else if (imageInfo.thumbnailUrl && typeof imageInfo.thumbnailUrl === 'string' && validators.validateUrl(imageInfo.thumbnailUrl).valid) {
        imageUrl = imageInfo.thumbnailUrl;
      }
      // Finally fallback to detailPageUrl for providers that need further processing
      else if (imageInfo.detailPageUrl && typeof imageInfo.detailPageUrl === 'string' && validators.validateUrl(imageInfo.detailPageUrl).valid) {
        imageUrl = imageInfo.detailPageUrl;
      }
      
      // Extract title if available
      imageTitle = imageInfo.title || `Image from ${source}`;
    } else {
      // Neither string nor valid object
      this.emit('log', 'warn', `Skipping invalid image info from ${source}: ${typeof imageInfo === 'object' ? JSON.stringify(imageInfo) : imageInfo}`);
      this.skippedCount++;
      return false;
    }
    
    this.emit('log', 'debug', `Processing image URL: ${imageUrl} from provider ${source}`);
    
    if (this.stopRequested) {
      this.emit('log', 'debug', `Skipping processing of image ${imageUrl} due to stop request.`);
      return false;
    }
    
    if (!imageUrl || !validators.validateUrl(imageUrl).valid) {
      this.emit('log', 'warn', `Skipping invalid URL from ${source}: ${imageUrl}`);
      this.skippedCount++;
      return false;
    }

    let finalImageUrl = imageUrl;
    try {
      if (typeof providerInstance.getFullSizeImage === 'function') {
        this.emit('log', 'debug', `Attempting to get full-size image for ${imageUrl} from ${source}`);
        // Pass the original imageInfo object if it's an object, otherwise pass the URL string
        const fullSizeUrl = await providerInstance.getFullSizeImage(
          typeof imageInfo === 'object' ? imageInfo : imageUrl, 
          this.page
        );
        if (fullSizeUrl && validators.validateUrl(fullSizeUrl).valid) {
          finalImageUrl = fullSizeUrl;
          this.emit('log', 'debug', `Got full-size URL: ${finalImageUrl}`);
        } else if (fullSizeUrl) {
          this.emit('log', 'warn', `Provider ${source} returned invalid full-size URL: ${fullSizeUrl}. Using original: ${imageUrl}`);
        } else {
          this.emit('log', 'debug', `No full-size URL returned by provider ${source} for ${imageUrl}. Using original.`);
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
        this.emit('log', 'info', `Skipping image ${finalImageUrl} (type: ${extension}) from ${source} due to disallowed file type. Allowed: ${allowedTypes.join(', ')}`);
        this.skippedCount++;
        return false;
    }
    if (!extension || !allowedTypes.includes(extension.substring(1))) {
        this.emit('log', 'debug', `Image ${finalImageUrl} has no or unsupported extension ('${extension}'). Defaulting extension.`);
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

      // Different handling for direct image URLs vs URLs that need processing
      let buffer;
      let contentType;
      
      this.emit('log', 'debug', `Attempting to fetch image: ${finalImageUrl}`);
      
      // Check if URL appears to be a direct image link based on extension or path patterns
      const isLikelyImageUrl = /\.(jpe?g|png|gif|webp)([?#].*)?$/i.test(finalImageUrl);
      
      if (isLikelyImageUrl) {
        // For direct image URLs, use page.goto to navigate and get the response body
        this.emit('log', 'debug', `URL appears to be direct image URL: ${finalImageUrl}`);
        const response = await this.page.goto(finalImageUrl, { waitUntil: 'commit', timeout: this.options.timeout || 60000 });
        if (!response || !response.ok()) {
          this.emit('log', 'warn', `Failed to fetch image ${finalImageUrl} from ${source}. Status: ${response ? response.status() : 'unknown'}`);
          this.skippedCount++;
          return false;
        }
        
        contentType = response.headers()['content-type'] || '';
        if (!contentType.startsWith('image/')) {
          this.emit('log', 'warn', `URL ${finalImageUrl} does not return image content (got ${contentType}). Trying fetch API as fallback...`);
        } else {
          this.emit('log', 'debug', `Successfully navigated to ${finalImageUrl}. Content-Type: ${contentType}. Status: ${response.status()}`);
          buffer = await response.body();
        }
      }
      
      // If no buffer yet (not a direct image URL or content-type wasn't image), try fetch API
      if (!buffer) {
        try {
          this.emit('log', 'debug', `Using fetch API to download image from: ${finalImageUrl}`);
          // Using page.evaluate to use the browser's fetch API
          const fetchResult = await this.page.evaluate(async (url) => {
            try {
              const response = await fetch(url, { credentials: 'include' });
              if (!response.ok) return { error: `HTTP error: ${response.status}` };
              
              const contentType = response.headers.get('content-type') || '';
              if (!contentType.startsWith('image/')) {
                return { error: `Not an image content-type: ${contentType}` };
              }
              
              // Convert the response to Base64
              const blob = await response.blob();
              return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve({ data: reader.result, type: contentType });
                reader.readAsDataURL(blob);
              });
            } catch (err) {
              return { error: err.toString() };
            }
          }, finalImageUrl);
          
          if (fetchResult.error) {
            this.emit('log', 'warn', `Failed to fetch image using browser API: ${fetchResult.error}`);
            this.skippedCount++;
            return false;
          }
          
          const base64Data = fetchResult.data.split(',')[1]; // Remove the data URL prefix
          buffer = Buffer.from(base64Data, 'base64');
          contentType = fetchResult.type;
          this.emit('log', 'debug', `Successfully fetched image data via fetch API. Content-Type: ${contentType}`);
        } catch (fetchError) {
          this.emit('log', 'error', `Error fetching image via browser fetch API: ${fetchError.message}`);
          this.skippedCount++;
          return false;
        }
      }
      
      // Final validation that we have image data
      if (!buffer || buffer.length === 0) {
        this.emit('log', 'warn', `Failed to get image data from ${finalImageUrl}`);
        this.skippedCount++;
        return false;
      }

      if (this.options.minFileSize && buffer.length < this.options.minFileSize) {
        this.emit('log', 'info', `Image ${finalImageName} from ${source} is too small (${buffer.length} bytes vs min ${this.options.minFileSize} bytes). Skipping.`);
        this.skippedCount++;
        return false;
      }

      const hash = await computeBufferHash(buffer);
      if (this.seenHashes.has(hash)) {
        this.emit('log', 'info', `Skipping duplicate image by hash: ${finalImageName} (hash: ${hash})`);
        this.skippedCount++;
        return false;
      }
      
      this.emit('log', 'debug', `Writing image ${finalImageName} to ${filePath}`);
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
