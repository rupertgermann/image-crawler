import { chromium } from 'playwright';
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

/**
 * PlaywrightCrawler class for web image crawling using Playwright
 */
import { DEFAULT_CONFIG } from '../utils/config.js';

class PlaywrightCrawler {
  constructor(options = {}) {
    // Merge: CLI/explicit options > config file > DEFAULT_CONFIG
    const config = configManager.getConfig();
    this.options = { ...DEFAULT_CONFIG, ...config, ...options };
    this.totalDownloadLimit = this.options.maxDownloads;

    
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
      Logger.debug(`Options: ${JSON.stringify(this.options, null, 2)}`);

      // Ensure output directory exists
      await pathUtils.ensureDir(this.options.outputDir);

      // Validate output directory is writable
      const outputValidation = await validators.validateWritable(this.options.outputDir);
      if (!outputValidation.valid) {
        throw new Error(`Output directory is not writable: ${outputValidation.message}`);
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
      
      // Define available sources
      const availableSources = {
        pixabay: { name: 'Pixabay', method: this.crawlPixabay.bind(this) },
        unsplash: { name: 'Unsplash', method: this.crawlUnsplash.bind(this) },
        google: { name: 'Google Images', method: this.crawlGoogleImages.bind(this) }
      };
      
      // Determine which sources to use based on provider option
      let sources = [];
      const provider = (this.options.provider || 'all').toLowerCase();
      
      if (provider === 'all') {
        // Use all sources in default order
        sources = Object.values(availableSources);
      } else if (availableSources[provider]) {
        // Use only the specified provider
        sources = [availableSources[provider]];
        Logger.info(`Using specific provider: ${availableSources[provider].name}`);
      } else {
        // Invalid provider specified, use all with a warning
        Logger.warn(`Invalid provider '${provider}'. Available providers: ${Object.keys(availableSources).join(', ')}, or 'all'`);
        sources = Object.values(availableSources);
      }
      
      // Track downloads per source for better reporting
      const sourceStats = {};
      let totalImagesFound = 0;
      
      // Set a hard limit on total images to download
      this.totalDownloadLimit = this.options.maxDownloads;
      Logger.info(`Setting hard limit of ${this.totalDownloadLimit} total images across all sources`);
      
      for (const source of sources) {
        // Stop if we've already reached the max downloads limit
        if (this.downloadedCount >= this.totalDownloadLimit) {
          Logger.info(`Maximum download limit of ${this.totalDownloadLimit} images reached. Stopping crawl.`);
          break;
        }
        
        // Calculate how many more images we need
        const remainingDownloads = this.totalDownloadLimit - this.downloadedCount;
        Logger.info(`Attempting to download ${remainingDownloads} more images from ${source.name}...`);
        
        try {
          // Track downloads from this source
          const beforeCount = this.downloadedCount;
          
          Logger.info(`Trying to crawl ${source.name}...`);
          await source.method(remainingDownloads); // Pass the remaining count to the method
          
          const downloadedFromSource = this.downloadedCount - beforeCount;
          sourceStats[source.name] = downloadedFromSource;
          totalImagesFound += downloadedFromSource;
          
          if (downloadedFromSource > 0) {
            success = true;
            Logger.info(`Successfully downloaded ${downloadedFromSource} images from ${source.name}`);
            Logger.info(`Total downloaded so far: ${this.downloadedCount}/${this.totalDownloadLimit}`);
            
            // If we've reached our download limit, break out of the loop
            if (this.downloadedCount >= this.totalDownloadLimit) {
              Logger.info(`Maximum download limit of ${this.totalDownloadLimit} images reached. Stopping crawl.`);
              break;
            }
          } else {
            Logger.warn(`No images downloaded from ${source.name}, trying next source...`);
          }
        } catch (error) {
          Logger.warn(`Error crawling ${source.name}: ${error.message}`);
          sourceStats[source.name] = 0;
        }
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
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  /**
   * Crawl Pixabay for images
   * @param {number} remainingDownloads - Maximum number of images to download
   */
  async crawlPixabay(remainingDownloads) {
    try {
      const query = encodeURIComponent(this.options.query);
      const pixabayUrl = `https://pixabay.com/images/search/${query}/`;
      Logger.info(`Searching Pixabay for: ${this.options.query}`);
      Logger.debug(`Pixabay URL: ${pixabayUrl}`);

      // Navigate to Pixabay
      Logger.info('Navigating to Pixabay...');
      await this.page.goto(pixabayUrl, { waitUntil: 'networkidle', timeout: this.options.timeout });
      
      // Accept cookies if the dialog appears
      try {
        const cookieSelectors = [
          'button.accept', 
          'button[data-testid="cookie-accept-button"]', 
          'button.cookie-accept',
          'button:has-text("Accept")',
          'button:has-text("I Agree")'
        ];
        
        for (const selector of cookieSelectors) {
          const cookieButton = await this.page.$(selector);
          if (cookieButton) {
            Logger.info(`Found cookie dialog, clicking accept button (${selector})...`);
            await cookieButton.click();
            await this.page.waitForTimeout(1000);
            break;
          }
        }
      } catch (error) {
        Logger.debug('No cookie dialog found or error accepting cookies:', error.message);
      }

      // Scroll to load more images
      Logger.info('Scrolling to load more images...');
      await this.autoScroll();
      Logger.info('Scrolling completed');

      // Extract image URLs
      const imageUrls = await this.page.evaluate(() => {
        // Try multiple selectors to find image containers
        const selectors = [
          '.container--HcTw2 img', 
          '.search-result-container img', 
          '.item img',
          'img[src*="pixabay.com"]',
          'a[href*="/images/"] img'
        ];
        
        let allImages = [];
        
        // Try each selector
        for (const selector of selectors) {
          const images = Array.from(document.querySelectorAll(selector));
          if (images.length > 0) {
            console.log(`Found ${images.length} images with selector: ${selector}`);
            allImages = [...allImages, ...images];
          }
        }
        
        // Extract URLs from image elements
        return [...new Set(allImages.map(img => {
          // Try to get the highest resolution version
          return img.dataset.fullsize || img.dataset.src || img.src;
        }).filter(url => url && url.startsWith('http')))];
      });

      Logger.info(`Found ${imageUrls.length} images on Pixabay`);

      // Calculate how many images to download from this source
      const maxToDownload = remainingDownloads || this.totalDownloadLimit || this.options.maxDownloads;
      Logger.info(`Will download up to ${maxToDownload} images from Pixabay`);
      
      // Limit the URLs to process based on the remaining downloads
      const urlsToProcess = imageUrls.slice(0, maxToDownload);
      Logger.info(`Processing ${urlsToProcess.length} out of ${imageUrls.length} found images`);
      
      // Download images
      for (const url of urlsToProcess) {
        // Double-check we haven't exceeded the limit (in case other sources added downloads)
        if (this.downloadedCount >= this.totalDownloadLimit) {
          Logger.info(`Maximum download limit of ${this.totalDownloadLimit} reached`);
          break;
        }

        try {
          await this.downloadImage(url);
          this.trackProgress("Pixabay");
        } catch (error) {
          Logger.error(`Error downloading image: ${error.message}`);
          this.errorCount++;
        }
      }
      
      if (this.downloadedCount === 0 && imageUrls.length > 0) {
        Logger.warn('Found images but none were downloaded. They may not meet the size/dimension criteria.');
      } else if (imageUrls.length === 0) {
        Logger.warn('No images found on Pixabay for this query.');
      }
    } catch (error) {
      Logger.error('Error crawling Pixabay:', error);
      throw error;
    }
  }

  /**
   * Crawl Unsplash for images
   * @param {number} remainingDownloads - Maximum number of images to download
   */
  async crawlUnsplash(remainingDownloads) {
    try {
      const query = encodeURIComponent(this.options.query);
      const unsplashUrl = `https://unsplash.com/s/photos/${query}`;
      Logger.info(`Searching Unsplash for: ${this.options.query}`);
      Logger.debug(`Unsplash URL: ${unsplashUrl}`);

      // Navigate to Unsplash
      Logger.info('Navigating to Unsplash...');
      await this.page.goto(unsplashUrl, { waitUntil: 'networkidle', timeout: this.options.timeout });
      
      // Accept cookies if the dialog appears
      try {
        const cookieSelectors = [
          'button[data-test="tos-accept-button"]', 
          'button[data-test="cookies-accept-button"]',
          'button:has-text("Accept")',
          'button:has-text("I Agree")'
        ];
        
        for (const selector of cookieSelectors) {
          const cookieButton = await this.page.$(selector);
          if (cookieButton) {
            Logger.info(`Found cookie dialog, clicking accept button (${selector})...`);
            await cookieButton.click();
            await this.page.waitForTimeout(1000);
            break;
          }
        }
      } catch (error) {
        Logger.debug('No cookie dialog found or error accepting cookies:', error.message);
      }

      // Scroll to load more images
      Logger.info('Scrolling to load more images...');
      await this.autoScroll();
      Logger.info('Scrolling completed');

      // Extract image URLs using Playwright's evaluation
      const imageUrls = await this.page.evaluate(() => {
        // Try multiple selectors to find image containers
        const selectors = [
          'figure[itemprop="image"] img', 
          'div[data-test="photo-grid-masonry-figure"] img',
          'a[href*="/photos/"] img',
          'img[srcset]'
        ];
        
        let allImages = [];
        
        // Try each selector
        for (const selector of selectors) {
          const images = Array.from(document.querySelectorAll(selector));
          if (images.length > 0) {
            console.log(`Found ${images.length} images with selector: ${selector}`);
            allImages = [...allImages, ...images];
          }
        }
        
        // Extract URLs from image elements
        return [...new Set(allImages.map(img => {
          if (img.srcset) {
            // Parse srcset to get the largest image URL
            const srcsetParts = img.srcset.split(',');
            const lastPart = srcsetParts[srcsetParts.length - 1].trim();
            const url = lastPart.split(' ')[0];
            return url;
          }
          return img.src;
        }).filter(url => url && url.startsWith('http')))];
      });

      Logger.info(`Found ${imageUrls.length} images on Unsplash`);

      // Calculate how many images to download from this source
      const maxToDownload = remainingDownloads || this.totalDownloadLimit || this.options.maxDownloads;
      Logger.info(`Will download up to ${maxToDownload} images from Unsplash`);
      
      // Limit the URLs to process based on the remaining downloads
      const urlsToProcess = imageUrls.slice(0, maxToDownload);
      Logger.info(`Processing ${urlsToProcess.length} out of ${imageUrls.length} found images`);
      
      // Download images
      for (const url of urlsToProcess) {
        // Double-check we haven't exceeded the limit (in case other sources added downloads)
        if (this.downloadedCount >= this.totalDownloadLimit) {
          Logger.info(`Maximum download limit of ${this.totalDownloadLimit} reached`);
          break;
        }

        try {
          await this.downloadImage(url);
          
          this.trackProgress("Unsplash");
        } catch (error) {
          Logger.error(`Error downloading image: ${error.message}`);
          this.errorCount++;
        }
      }
      
      if (this.downloadedCount === 0 && imageUrls.length > 0) {
        Logger.warn('Found images but none were downloaded. They may not meet the size/dimension criteria.');
      } else if (imageUrls.length === 0) {
        Logger.warn('No images found on Unsplash for this query.');
      }
    } catch (error) {
      Logger.error('Error crawling Unsplash:', error);
      throw error;
    }
  }

  /**
   * Crawl Google Images for images
   * @param {number} remainingDownloads - Maximum number of images to download
   */
  async crawlGoogleImages(remainingDownloads) {
    try {
      const query = encodeURIComponent(this.options.query);
      const googleUrl = this.buildGoogleSearchUrl();
      Logger.info(`Searching Google Images for: ${this.options.query}`);
      Logger.debug(`Google URL: ${googleUrl}`);

      // Navigate to Google Images
      Logger.info('Navigating to Google Images...');
      await this.page.goto(googleUrl, { waitUntil: 'networkidle', timeout: this.options.timeout });
      
      // Accept cookies if the dialog appears
      try {
        const cookieSelectors = [
          'button[aria-label="Accept all"]', 
          'button[aria-label="I agree"]',
          'button:has-text("Accept all")',
          'button:has-text("I agree")'
        ];
        
        for (const selector of cookieSelectors) {
          const cookieButton = await this.page.$(selector);
          if (cookieButton) {
            Logger.info(`Found cookie dialog, clicking accept button (${selector})...`);
            await cookieButton.click();
            await this.page.waitForTimeout(1000);
            break;
          }
        }
      } catch (error) {
        Logger.debug('No cookie dialog found or error accepting cookies:', error.message);
      }

      // Scroll to load more images
      Logger.info('Scrolling to load more images...');
      await this.autoScroll();
      Logger.info('Scrolling completed');

      // Extract image URLs
      const imageUrls = await this.extractGoogleImageUrls();
      Logger.info(`Found ${imageUrls.length} images on Google Images`);

      if (imageUrls.length === 0) {
        // Try clicking on thumbnails to get more images
        Logger.info('No images found with standard extraction, trying alternative approach...');
        await this.clickGoogleThumbnails();
        
        // Try extracting again
        const moreUrls = await this.extractGoogleImageUrls();
        Logger.info(`Found ${moreUrls.length} additional images after clicking thumbnails`);
        
        imageUrls.push(...moreUrls);
      }

      // Calculate how many images to download from this source
      const maxToDownload = remainingDownloads || this.totalDownloadLimit || this.options.maxDownloads;
      Logger.info(`Will download up to ${maxToDownload} images from Google Images`);
      
      // Limit the URLs to process based on the remaining downloads
      const urlsToProcess = imageUrls.slice(0, maxToDownload);
      Logger.info(`Processing ${urlsToProcess.length} out of ${imageUrls.length} found images`);
      
      // Download images
      for (const url of urlsToProcess) {
        // Double-check we haven't exceeded the limit (in case other sources added downloads)
        if (this.downloadedCount >= this.totalDownloadLimit) {
          Logger.info(`Maximum download limit of ${this.totalDownloadLimit} reached`);
          break;
        }

        try {
          await this.downloadImage(url);
          
          this.trackProgress("Google Images");
          this.trackProgress("Google Images");
        } catch (error) {
          Logger.error(`Error downloading image: ${error.message}`);
          this.errorCount++;
        }
      }
      
      if (this.downloadedCount === 0 && imageUrls.length > 0) {
        Logger.warn('Found images but none were downloaded. They may not meet the size/dimension criteria.');
      } else if (imageUrls.length === 0) {
        Logger.warn('No images found on Google Images for this query.');
      }
    } catch (error) {
      Logger.error('Error crawling Google Images:', error);
      throw error;
    }
  }

  /**
   * Extract image URLs from Google Images
   */
  async extractGoogleImageUrls() {
    return await this.page.evaluate(() => {
      // Try multiple selectors to find image elements
      const selectors = [
        'img.rg_i', 
        'img[data-src]',
        'img[src^="http"]',
        'a img',
        'div[data-hveid] img',
        '.isv-r img'
      ];
      
      let allImages = [];
      
      // Try each selector
      for (const selector of selectors) {
        const images = Array.from(document.querySelectorAll(selector));
        if (images.length > 0) {
          console.log(`Found ${images.length} images with selector: ${selector}`);
          allImages = [...allImages, ...images];
        }
      }
      
      // Extract URLs from image elements
      return [...new Set(allImages.map(img => {
        return img.src || img.dataset.src || img.dataset.url || img.dataset.iurl;
      }).filter(url => url && url.startsWith('http')))];
    });
  }

  /**
   * Click on Google image thumbnails to load more images
   */
  async clickGoogleThumbnails() {
    try {
      // Find thumbnails
      const thumbnails = await this.page.$$('img[src^="http"], img[data-src^="http"]');
      Logger.info(`Found ${thumbnails.length} thumbnails to try clicking`);
      
      // Try clicking on a few thumbnails
      const maxClicks = Math.min(5, thumbnails.length);
      for (let i = 0; i < maxClicks; i++) {
        try {
          Logger.info(`Clicking thumbnail ${i+1}...`);
          await thumbnails[i].click();
          await this.page.waitForTimeout(2000);
          
          // Close the viewer if it opened
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(1000);
        } catch (error) {
          Logger.warn(`Error clicking thumbnail ${i+1}:`, error.message);
        }
      }
    } catch (error) {
      Logger.warn('Error clicking thumbnails:', error.message);
    }
  }

  /**
   * Build Google Images search URL
   */
  buildGoogleSearchUrl() {
    const baseUrl = 'https://www.google.com/search';
    const params = new URLSearchParams({
      q: this.options.query,
      tbm: 'isch', // Image search
      tbs: this.buildGoogleSearchParams(),
      safe: this.options.safeSearch ? 'active' : 'images',
      hl: 'en' // Set language to English for more consistent results
    });
    
    // Add additional parameters to improve results
    params.append('oq', this.options.query);
    params.append('sclient', 'img');
    
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Build search parameters for Google Images
   */
  buildGoogleSearchParams() {
    const params = [];
    
    // Image size parameters
    if (this.options.minWidth || this.options.minHeight) {
      params.push('isz:l'); // Large images
      
      if (this.options.minWidth && this.options.minHeight) {
        params.push(`islt:${this.options.minWidth}x${this.options.minHeight}`);
      }
    } else {
      params.push('isz:m'); // Medium images
    }
    
    // Add file type filter if specified
    if (this.options.fileTypes && this.options.fileTypes.length > 0) {
      const fileTypeParam = `ift:${this.options.fileTypes[0]}`;
      params.push(fileTypeParam);
    }
    
    // Add color parameter for better results
    params.push('ic:color');
    
    return params.join(',');
  }

  /**
   * Auto-scroll the page to load more images
   */
  async autoScroll() {
    // First scroll down quickly
    await this.page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 300;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= 3000) {
            clearInterval(timer);
            resolve();
          }
        }, 50);
      });
    });
    
    // Wait for content to load
    await this.page.waitForTimeout(1000);
    
    // Then scroll more slowly to ensure all images load
    await this.page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          
          // Try to click "Show more results" button if it exists
          const showMoreButton = document.querySelector('input[type="button"][value="Show more results"]');
          if (showMoreButton) {
            console.log('Clicking Show more results button');
            showMoreButton.click();
          }

          if (totalHeight >= 5000) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
    
    // Final wait to ensure images are loaded
    await this.page.waitForTimeout(2000);
  }

  /**
   * Download and save an image
   * @param {string} url - Image URL
   */
  async downloadImage(url) {
    try {
      // Generate a unique filename
      const urlObj = new URL(url);
      const ext = path.extname(urlObj.pathname).split('?')[0] || '.jpg';
      const filename = `img_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`;
      const outputPath = path.join(this.options.outputDir, filename);

      // Download the image
      const response = await this.page.goto(url, { waitUntil: 'networkidle', timeout: this.options.timeout });
      const buffer = await response.body();
      
      // Check if the response is an image
      const contentType = response.headers()['content-type'] || '';
      if (!contentType.includes('image/')) {
        Logger.debug(`Skipped non-image content: ${url} (${contentType})`);
        this.skippedCount++;
        return;
      }

      // Check image dimensions if needed
      if (this.options.minWidth > 0 || this.options.minHeight > 0) {
        try {
          const metadata = await sharp(buffer).metadata();
          if ((this.options.minWidth > 0 && metadata.width < this.options.minWidth) ||
              (this.options.minHeight > 0 && metadata.height < this.options.minHeight)) {
            this.skippedCount++;
            Logger.debug(`Skipped image (dimensions too small): ${url}`);
            return;
          }
        } catch (error) {
          Logger.debug(`Error checking image dimensions: ${error.message}`);
          this.skippedCount++;
          return;
        }
      }

      // Check file size
      if (buffer.length < this.options.minFileSize) {
        this.skippedCount++;
        Logger.debug(`Skipped image (file size too small): ${url}`);
        return;
      }

      // Save the image
      await fs.writeFile(outputPath, buffer);
      this.downloadedCount++;
      
      // Use the trackProgress utility to log progress consistently
      this.trackProgress('current');
      
      // Check if we've reached the limit
      if (this.downloadedCount >= this.totalDownloadLimit) {
        Logger.info(`Maximum download limit of ${this.totalDownloadLimit} reached`);
      }

      Logger.debug(`Downloaded: ${url} -> ${outputPath}`);
      
      // Navigate back to the search results
      await this.page.goBack();
    } catch (error) {
      Logger.error(`Error downloading image ${url}:`, error.message);
      throw error;
    }
  }
}

export default PlaywrightCrawler;
