import { chromium } from 'playwright';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import Logger from '../utils/logger.js';
import { computeFileHash, computeBufferHash } from '../utils/hash-utils.js';
import * as validators from '../utils/validators.js';
import * as pathUtils from '../utils/paths.js';
import configManager from '../utils/config.js';
import ProviderRegistry from '../providers/provider-registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * PlaywrightCrawler class for web image crawling using Playwright
 */
import { DEFAULT_CONFIG } from '../utils/config.js';

class PlaywrightCrawler {
  constructor(options = {}) {
    // Merge: CLI/explicit options > config file > DEFAULT_CONFIG
    configManager.setCliProviderOverrides(options.provider); // Set CLI overrides first

    const config = configManager.getConfig(); // Now getConfig() will have defaults
    this.options = { ...config, ...options }; // CLI options (like query, outputDir) override config file
    this.totalDownloadLimit = parseInt(this.options.maxDownloads, 10) || DEFAULT_CONFIG.maxDownloads;
    if (isNaN(this.totalDownloadLimit) || this.totalDownloadLimit <= 0) {
      Logger.warn(`Invalid maxDownloads value (${this.options.maxDownloads}). Falling back to default: ${DEFAULT_CONFIG.maxDownloads}`);
      this.totalDownloadLimit = DEFAULT_CONFIG.maxDownloads;
    }
    this.options.maxDownloads = this.totalDownloadLimit; // Ensure options reflects the validated number

    this.providerRegistry = new ProviderRegistry(); // Instantiate registry

    this.downloadedCount = 0;
    this.skippedCount = 0;
    this.errorCount = 0;
    this.browser = null;
    this.page = null;
    this.context = null;
  }
  
  /**
   * Track download progress and log it consistently
   * @param {string} source - The source of the image (e.g., 'Pixabay')
   */
  trackProgress(source) {
    // Log progress every 5 images or when we reach the limit
    if (this.downloadedCount % 5 === 0 || this.downloadedCount === this.totalDownloadLimit) {
      Logger.info(`Downloaded ${this.downloadedCount}/${this.totalDownloadLimit} images...`);
      
      // If we've reached the limit, log it
      if (this.downloadedCount >= this.totalDownloadLimit) {
        Logger.info(`Maximum download limit of ${this.totalDownloadLimit} reached from ${source}`);
      }
    }
  }

  /**
   * Start the web crawling process
   */
  async start() {
    try {
      Logger.info('Starting Playwright web crawler...');
      // Initialize provider registry - this uses the effective config
      await this.providerRegistry.initialize();
      const activeProviders = this.providerRegistry.getActiveProviders();

      if (activeProviders.length === 0) {
        Logger.warn('No active providers. Check your configuration or --provider argument. Exiting.');
        return { success: false, count: 0, downloaded: 0, skipped: 0, errors: 0 };
      }

      Logger.debug(`Effective options: ${JSON.stringify(this.options, null, 2)}`);
      Logger.info(`Active providers: ${activeProviders.map(p => p.constructor.name).join(', ')}`);

      // Ensure output directory exists
      await pathUtils.ensureDir(this.options.outputDir);

      // Validate output directory is writable
      const outputValidation = await validators.validateWritable(this.options.outputDir);
      if (!outputValidation.valid) {
        throw new Error(`Output directory is not writable: ${outputValidation.message}`);
      }

      // Initialize seen hashes from existing files
      this.seenHashes = new Set();
      const existingFiles = await fs.readdir(this.options.outputDir);
      for (const fname of existingFiles) {
        const fpath = path.join(this.options.outputDir, fname);
        if (await fs.pathExists(fpath)) {
          const h = await computeFileHash(fpath);
          this.seenHashes.add(h);
        }
      }

      // Launch browser
      this.browser = await chromium.launch({
        headless: this.options.headless,
        timeout: this.options.timeout
      });
      
      // Create a new context with a realistic user agent
      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        viewport: { width: 1280, height: 800 },
        ignoreHTTPSErrors: true
      });
      
      this.page = await this.context.newPage();

      // Try different image sources
      let success = false;
      
      // Log the max downloads limit
      Logger.info(`Maximum download limit set to: ${this.options.maxDownloads} images`);
      
      // Track downloads per source for better reporting
      const sourceStats = {};
      // let totalImagesFound = 0; // Not used currently, can be re-added if needed
      
      // Set a hard limit on total images to download
      this.totalDownloadLimit = this.options.maxDownloads;
      Logger.info(`Setting hard limit of ${this.totalDownloadLimit} total images across all sources`);
      
      for (const providerInstance of activeProviders) {
        const providerName = providerInstance.constructor.name.replace('Provider', ''); // Get a user-friendly name
        if (this.downloadedCount >= this.totalDownloadLimit) {
          Logger.info(`Maximum download limit of ${this.totalDownloadLimit} images reached. Stopping crawl.`);
          break;
        }
        
        const remainingDownloads = this.totalDownloadLimit - this.downloadedCount;
        Logger.info(`Attempting to download up to ${remainingDownloads} more images from ${providerName}...`);
        
        try {
          const beforeCount = this.downloadedCount;
          let downloadedFromSource = 0;

          Logger.info(`Fetching image URLs from ${providerName}...`);
          // Use the standardized fetchImageUrls method
          const imageUrls = await providerInstance.fetchImageUrls(
            this.options.query, 
            { maxResults: remainingDownloads }, 
            this.page
          );

          Logger.info(`Found ${imageUrls.length} potential image URLs from ${providerName}. Processing...`);

          for (const imageUrl of imageUrls) {
            if (this.downloadedCount >= this.totalDownloadLimit) {
              Logger.info(`Download limit reached while processing images from ${providerName}.`);
              break; // Break from processing URLs for this provider
            }
            // Pass providerInstance to processImage
            const processed = await this.processImage(imageUrl, providerName, providerInstance);
            if (processed) {
              downloadedFromSource++;
            }
          }

          sourceStats[providerName] = downloadedFromSource;
          
          if (downloadedFromSource > 0) {
            success = true;
            Logger.info(`Successfully downloaded ${downloadedFromSource} images from ${providerName}`);
            Logger.info(`Total downloaded so far: ${this.downloadedCount}/${this.totalDownloadLimit}`);
          } else {
            Logger.warn(`No images downloaded from ${providerName} for this batch, trying next source...`);
          }
        } catch (error) {
          Logger.error(`Error crawling ${providerName}: ${error.message}`);
          this.errorCount++;
          Logger.debug(error.stack);
        }

        // If we've reached our download limit, break out of the provider loop
        if (this.downloadedCount >= this.totalDownloadLimit) {
          Logger.info(`Maximum download limit of ${this.totalDownloadLimit} images reached. Stopping crawl.`);
          break;
        }
      }

      if (this.browser) {
        await this.browser.close();
      }

      // Final reporting
      if (!success) {
        Logger.error('Failed to download any images from all sources');
        return { success: false, count: 0 };
      }
      
      // Report on download results
      if (this.downloadedCount < this.totalDownloadLimit) {
        Logger.warn(`Only downloaded ${this.downloadedCount}/${this.totalDownloadLimit} requested images`);
        Logger.info('This may be because not enough images matched your criteria (size/dimensions/type).');
      } else {
        Logger.info(`Successfully downloaded exactly ${this.downloadedCount} images as requested`);
      }
      
      // Report on downloads per source
      Logger.info('Downloads per source:');
      for (const [source, count] of Object.entries(sourceStats)) {
        Logger.info(`- ${source}: ${count} images`);
      }
      
      Logger.success(`Crawling completed. Downloaded: ${this.downloadedCount}, skipped: ${this.skippedCount}, errors: ${this.errorCount}`);
      return {
        success: true,
        downloaded: this.downloadedCount,
        skipped: this.skippedCount,
        errors: this.errorCount
      };
    } catch (error) {
      Logger.error('Error during web crawling:', error);
      throw error;
    }
  }

  /**
   * Process a single image: download, validate, save, and deduplicate
   * @param {string} imageUrl - The URL of the image to process
   * @param {string} source - The source of the image (e.g., 'Pixabay')
   * @param {BaseProvider} providerInstance - The instance of the provider for this image
   * @returns {Promise<boolean>} - True if downloaded, false otherwise
   */
  async processImage(imageUrl, source, providerInstance) {
    if (!validators.validateUrl(imageUrl).valid) {
      Logger.warn(`Skipping invalid URL: ${imageUrl}`);
      this.skippedCount++;
      return false;
    }

    // Attempt to get full size image URL using provider's method
    let finalImageUrl = imageUrl;
    try {
      if (typeof providerInstance.getFullSizeImage === 'function') {
        const fullSizeUrl = await providerInstance.getFullSizeImage(this.page, imageUrl);
        if (fullSizeUrl && validators.validateUrl(fullSizeUrl).valid) {
          finalImageUrl = fullSizeUrl;
          Logger.debug(`Using full-size URL from provider ${source}: ${finalImageUrl}`);
        } else if (fullSizeUrl) {
          Logger.warn(`Provider ${source} returned invalid full-size URL: ${fullSizeUrl}. Using original: ${imageUrl}`);
        }
      }
    } catch (err) {
      Logger.warn(`Error getting full-size image from ${source} for ${imageUrl}: ${err.message}. Using original URL.`);
    }

    const imageName = path.basename(new URL(finalImageUrl).pathname) || `${source.toLowerCase()}_${Date.now()}`;
    let extension = path.extname(imageName).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(extension)) {
      extension = '.jpg'; // Default to .jpg if extension is missing or not typical
    }
    const baseName = imageName.substring(0, imageName.length - path.extname(imageName).length);
    const finalImageName = `${source.toLowerCase()}_${baseName}${extension}`;
    const filePath = path.join(this.options.outputDir, finalImageName);

    try {
      // Use provider's validation method if available, otherwise skip this specific validation.
      // This assumes validateImageMeetsCriteria is part of BaseProvider and handles network requests if needed.
      if (typeof providerInstance.validateImageMeetsCriteria === 'function') {
        const meetsCriteria = await providerInstance.validateImageMeetsCriteria(this.page, finalImageUrl, {
          minWidth: this.options.minWidth,
          minHeight: this.options.minHeight,
          // minFileSize: this.options.minFileSize // File size check is after download
        });
        if (!meetsCriteria) {
          Logger.info(`Image ${finalImageUrl} from ${source} does not meet dimension criteria. Skipping.`);
          this.skippedCount++;
          return false;
        }
      } else {
        Logger.warn(`Provider ${source} does not implement validateImageMeetsCriteria. Skipping pre-download dimension check.`);
      }

      const response = await this.page.goto(finalImageUrl, { waitUntil: 'networkidle', timeout: this.options.timeout });
      if (!response || !response.ok()) {
        Logger.warn(`Failed to fetch image ${finalImageUrl} from ${source}. Status: ${response ? response.status() : 'unknown'}`);
        this.skippedCount++;
        return false;
      }
      const buffer = await response.body();

      // Validate file size
      if (this.options.minFileSize && buffer.length < this.options.minFileSize) {
        Logger.info(`Image ${finalImageName} from ${source} is too small (${buffer.length} bytes). Skipping.`);
        this.skippedCount++;
        return false;
      }

      // Deduplication: skip if buffer hash seen
      const hash = await computeBufferHash(buffer);
      if (this.seenHashes.has(hash)) {
        Logger.info(`Skipping duplicate image by hash: ${finalImageName}`);
        this.skippedCount++;
        return false;
      }
      this.seenHashes.add(hash);

      // Ensure image is valid and convert to JPEG if necessary (or handle as per options)
      // For simplicity, saving directly. Add sharp processing if specific format/quality is needed.
      await fs.writeFile(filePath, buffer);
      this.downloadedCount++;
      Logger.success(`Downloaded: ${finalImageName} from ${source} (${this.downloadedCount}/${this.totalDownloadLimit})`);
      this.trackProgress(source);
      return true;

    } catch (error) {
      Logger.error(`Error processing image ${finalImageUrl} from ${source}: ${error.message}`);
      Logger.debug(error.stack);
      this.errorCount++;
      // Attempt to remove partially downloaded file
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
      }
      return false;
    }
  }

  // These specific crawl methods (crawlGoogleImages, crawlPixabay, crawlUnsplash) 
  // should eventually be refactored into their respective provider classes 
  // implementing the fetchImageUrls interface.
  // For now, they are kept for reference but are no longer directly called in the main loop.

  async crawlGoogleImages(limit) {
    Logger.warn('PlaywrightCrawler.crawlGoogleImages is deprecated and should not be called directly. Logic pending migration to GoogleProvider.');
    return 0; // Or throw error
  }

  async crawlPixabay(limit) {
    Logger.warn('PlaywrightCrawler.crawlPixabay is deprecated and should not be called directly. Logic pending migration to PixabayProvider.');
    return 0; // Or throw error
  }

  async crawlUnsplash(limit) {
    Logger.warn('PlaywrightCrawler.crawlUnsplash is deprecated and should not be called directly. Logic pending migration to UnsplashProvider.');
    return 0; // Or throw error
  }

  parseFileSize(sizeStr) {
    // ... rest of the method remains the same ...
  }
}

export default PlaywrightCrawler;
