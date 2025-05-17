// This module has been removed. Use PlaywrightCrawler instead.
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

import { DEFAULT_CONFIG } from '../utils/config.js';

class WebCrawler {
  constructor(options = {}) {
    // Merge: CLI/explicit options > config file > DEFAULT_CONFIG
    const config = configManager.getConfig();
    this.options = { ...DEFAULT_CONFIG, ...config, ...options };

    this.downloadedCount = 0;
    this.skippedCount = 0;
    this.errorCount = 0;
    this.browser = null;
    this.page = null;
  }

  /**
   * Start the web crawling process
   */
  async start() {
    try {
      Logger.info('Starting web crawler...');
      Logger.debug(`Options: ${JSON.stringify(this.options, null, 2)}`);

      // Ensure output directory exists
      await pathUtils.ensureDir(this.options.outputDir);

      // Validate output directory is writable
      const outputValidation = await validators.validateWritable(this.options.outputDir);
      if (!outputValidation.valid) {
        throw new Error(`Output directory is not writable: ${outputValidation.message}`);
      }

      // Launch browser
      this.browser = await puppeteer.launch({
        headless: this.options.headless ? 'new' : false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1280, height: 800 });
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

      // Try different image sources
      let success = false;
      
      // First try Pixabay (most reliable)
      try {
        Logger.info('Trying to crawl Pixabay...');
        await this.crawlPixabay();
        success = this.downloadedCount > 0;
      } catch (error) {
        Logger.warn(`Error crawling Pixabay: ${error.message}`);
      }
      
      // Then try Unsplash if Pixabay didn't work
      if (!success) {
        Logger.info('Pixabay crawling failed or returned no results, trying Unsplash...');
        try {
          await this.crawlUnsplash();
          success = this.downloadedCount > 0;
        } catch (error) {
          Logger.warn(`Error crawling Unsplash: ${error.message}`);
        }
      }
      
      // Finally try Google Images as last resort
      if (!success) {
        Logger.info('Unsplash crawling failed or returned no results, trying Google Images as fallback...');
        try {
          await this.crawlGoogleImages();
        } catch (error) {
          Logger.error(`Error crawling Google Images: ${error.message}`);
          // If all methods fail, we'll still throw the error
          if (this.downloadedCount === 0) {
            throw error;
          }
        }
      }

      Logger.success(`Crawling completed. Downloaded: ${this.downloadedCount}, skipped: ${this.skippedCount}, errors: ${this.errorCount}`);
      return {
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
   * Crawl Google Images
   */
  async crawlGoogleImages() {
    try {
      const searchUrl = this.buildGoogleSearchUrl();
      Logger.info(`Searching for: ${this.options.query}`);
      Logger.debug(`Search URL: ${searchUrl}`);

      // Navigate to Google Images
      Logger.info('Navigating to Google Images...');
      await this.page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Accept cookies if the dialog appears
      try {
        const cookieAcceptSelector = 'button[aria-label="Accept all"], button[aria-label="I agree"], button[id*="accept"]';
        const cookieButton = await this.page.$(cookieAcceptSelector);
        if (cookieButton) {
          Logger.info('Accepting cookies dialog...');
          await cookieButton.click();
          await this.page.waitForTimeout(1000);
        }
      } catch (error) {
        Logger.debug('No cookie dialog found or error accepting cookies:', error.message);
      }

      // Scroll to load more images
      await this.autoScroll();
      
      // Try different strategies to extract images
      let imageUrls = [];
      
      // First attempt - standard extraction
      imageUrls = await this.extractImageUrls();
      Logger.info(`Found ${imageUrls.length} images with standard extraction`);
      
      // If we didn't find many images, try a more aggressive approach
      if (imageUrls.length < 5) {
        Logger.info('Trying alternative extraction method...');
        
        // Click on a thumbnail to open the image viewer
        const thumbnails = await this.page.$$('img[src^="http"], img[data-src^="http"]');
        if (thumbnails.length > 0) {
          Logger.info(`Found ${thumbnails.length} thumbnails to try clicking`);
          
          // Try clicking on a few thumbnails to open the image viewer
          for (let i = 0; i < Math.min(3, thumbnails.length); i++) {
            try {
              Logger.info(`Clicking thumbnail ${i+1}...`);
              await thumbnails[i].click();
              await this.page.waitForTimeout(2000);
              
              // Try to extract the large image from the viewer
              const largeImageUrl = await this.page.evaluate(() => {
                // Look for large images in the viewer
                const viewerImg = document.querySelector('img[class*="image"][src^="http"], img.n3VNCb, img[style*="transform"]');
                return viewerImg ? viewerImg.src : null;
              });
              
              if (largeImageUrl && !imageUrls.includes(largeImageUrl)) {
                Logger.info(`Found large image in viewer: ${largeImageUrl}`);
                imageUrls.push(largeImageUrl);
              }
              
              // Close the viewer
              await this.page.keyboard.press('Escape');
              await this.page.waitForTimeout(1000);
            } catch (error) {
              Logger.warn(`Error clicking thumbnail ${i+1}:`, error.message);
            }
          }
        }
        
        // If still not enough, try one more extraction
        if (imageUrls.length < 5) {
          // Scroll more aggressively
          await this.autoScroll();
          const moreUrls = await this.extractImageUrls();
          
          // Add any new URLs
          for (const url of moreUrls) {
            if (!imageUrls.includes(url)) {
              imageUrls.push(url);
            }
          }
          
          Logger.info(`Found ${imageUrls.length} total images after additional extraction`);
        }
      }

      // Download images
      for (const url of imageUrls) {
        if (this.downloadedCount >= this.options.maxDownloads) {
          Logger.info('Maximum download limit reached');
          break;
        }

        try {
          await this.downloadImage(url);
        } catch (error) {
          Logger.error(`Error downloading image: ${error.message}`);
          this.errorCount++;
        }
      }
      
      if (this.downloadedCount === 0) {
        Logger.warn('No images were downloaded. Google may be blocking the crawler or the search returned no results.');
        Logger.info('Try using a different search query or running with --headless false to see what\'s happening.');
      }
    } catch (error) {
      Logger.error('Error crawling Google Images:', error);
      throw error;
    }
  }

  /**
   * Build Google Images search URL
   */
  buildGoogleSearchUrl() {
    Logger.debug(`Building search URL for query: ${this.options.query}`);
    
    const baseUrl = 'https://www.google.com/search';
    const params = new URLSearchParams({
      q: this.options.query,
      tbm: 'isch', // Image search
      tbs: this.buildSearchParams(),
      safe: this.options.safeSearch ? 'active' : 'images', // Updated safe search parameter
      hl: 'en' // Set language to English for more consistent results
    });
    
    // Add additional parameters to improve results
    params.append('oq', this.options.query); // Original query
    params.append('sclient', 'img'); // Client type: image search
    params.append('ved', '0ahUKEwi'); // Add a ved parameter to simulate a regular search
    
    const url = `${baseUrl}?${params.toString()}`;
    Logger.debug(`Generated search URL: ${url}`);
    return url;
  }

  /**
   * Build search parameters for Google Images
   */
  buildSearchParams() {
    const params = [];
    
    // Image size parameters
    if (this.options.minWidth || this.options.minHeight) {
      // Use large image size filter as a base
      params.push('isz:l');
      
      // Add exact dimensions if specified
      if (this.options.minWidth && this.options.minHeight) {
        params.push(`islt:${this.options.minWidth}x${this.options.minHeight}`);
      }
    } else {
      // Default to medium-large images if no specific dimensions
      params.push('isz:m');
    }
    
    // Add file type filter if specified
    if (this.options.fileTypes && this.options.fileTypes.length > 0) {
      const fileTypeParam = `ift:${this.options.fileTypes[0]}`; // Use first file type as filter
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
    Logger.info('Scrolling to load more images...');
    
    try {
      // First scroll down quickly to trigger initial image loading
      await this.page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 300;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= 3000) {
              clearInterval(timer);
              resolve();
            }
          }, 50);
        });
      });
      
      // Wait a bit for images to load
      await this.page.waitForTimeout(1000);
      
      // Then scroll more slowly to ensure all images load properly
      await this.page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 100;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            
            // Click on the "Show more results" button if it exists
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
      Logger.info('Scrolling completed');
    } catch (error) {
      Logger.warn(`Error during scrolling: ${error.message}`);
    }
  }

  /**
   * Extract image URLs from the page
   */
  async extractImageUrls() {
    // Wait a bit for images to load
    await this.page.waitForTimeout(2000);
    
    return await this.page.evaluate(() => {
      // Try multiple selectors to be more robust against Google's HTML changes
      const selectors = [
        'img.rg_i', // Traditional selector
        'img[data-src]', // Images with data-src attribute
        'img[src^="http"]', // Images with http src
        'a img', // Images inside links
        'div[data-hveid] img', // Images inside Google's data-hveid containers
        '.isv-r img' // Another common Google Images container class
      ];
      
      let allImages = [];
      
      // Try each selector
      for (const selector of selectors) {
        const images = Array.from(document.querySelectorAll(selector));
        if (images.length > 0) {
          console.log(`Found ${images.length} images with selector: ${selector}`);
        }
        allImages = [...allImages, ...images];
      }
      
      // Remove duplicates by creating a Map with the image element as the key
      const uniqueImages = [...new Map(allImages.map(img => [img, img])).values()];
      console.log(`Total unique images found: ${uniqueImages.length}`);
      
      // Extract URLs from image elements
      return uniqueImages
        .map(img => {
          // Try multiple attributes where URLs might be stored
          return img.getAttribute('src') || 
                 img.getAttribute('data-src') || 
                 img.getAttribute('data-url') || 
                 img.getAttribute('data-iurl') || 
                 (img.parentNode && img.parentNode.tagName === 'A' ? img.parentNode.href : null);
        })
        .filter(src => src && src.startsWith('http'))
        // Remove duplicates in URLs
        .filter((url, index, self) => self.indexOf(url) === index);
    });
  }

  /**
   * Crawl Pixabay for images
   */
  async crawlPixabay() {
    try {
      const query = encodeURIComponent(this.options.query);
      const pixabayUrl = `https://pixabay.com/images/search/${query}/`;
      Logger.info(`Searching Pixabay for: ${this.options.query}`);
      Logger.debug(`Pixabay URL: ${pixabayUrl}`);

      // Navigate to Pixabay
      Logger.info('Navigating to Pixabay...');
      await this.page.goto(pixabayUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Accept cookies if the dialog appears
      try {
        const cookieAcceptSelector = 'button.accept, button[data-testid="cookie-accept-button"], button.cookie-accept';
        const cookieButton = await this.page.$(cookieAcceptSelector);
        if (cookieButton) {
          Logger.info('Accepting cookies dialog...');
          await cookieButton.click();
          await this.page.waitForTimeout(1000);
        }
      } catch (error) {
        Logger.debug('No cookie dialog found or error accepting cookies:', error.message);
      }

      // Scroll to load more images
      Logger.info('Scrolling to load more images...');
      await this.page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 200;
          const timer = setInterval(() => {
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= 4000) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      });
      
      // Wait for images to load
      await this.page.waitForTimeout(2000);
      Logger.info('Scrolling completed');

      // Extract image URLs
      const imageUrls = await this.page.evaluate(() => {
        // Pixabay image containers have specific classes
        const containers = Array.from(document.querySelectorAll('.container--HcTw2 img, .search-result-container img, .item img'));
        
        return containers
          .map(img => {
            // Try to get the highest resolution version
            return img.dataset.fullsize || img.dataset.src || img.src;
          })
          .filter(url => url && url.startsWith('http'))
          // Remove duplicates
          .filter((url, index, self) => self.indexOf(url) === index);
      });

      Logger.info(`Found ${imageUrls.length} images on Pixabay`);

      // Download images
      for (const url of imageUrls) {
        if (this.downloadedCount >= this.options.maxDownloads) {
          Logger.info('Maximum download limit reached');
          break;
        }

        try {
          await this.downloadImage(url);
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
   */
  async crawlUnsplash() {
    try {
      const query = encodeURIComponent(this.options.query);
      const unsplashUrl = `https://unsplash.com/s/photos/${query}`;
      Logger.info(`Searching Unsplash for: ${this.options.query}`);
      Logger.debug(`Unsplash URL: ${unsplashUrl}`);

      // Navigate to Unsplash
      Logger.info('Navigating to Unsplash...');
      await this.page.goto(unsplashUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Accept cookies if the dialog appears
      try {
        const cookieAcceptSelector = 'button[data-test="tos-accept-button"], button[data-test="cookies-accept-button"]';
        const cookieButton = await this.page.$(cookieAcceptSelector);
        if (cookieButton) {
          Logger.info('Accepting cookies dialog...');
          await cookieButton.click();
          await this.page.waitForTimeout(1000);
        }
      } catch (error) {
        Logger.debug('No cookie dialog found or error accepting cookies:', error.message);
      }

      // Scroll to load more images
      Logger.info('Scrolling to load more images...');
      await this.page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 200;
          const timer = setInterval(() => {
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= 4000) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      });
      
      // Wait for images to load
      await this.page.waitForTimeout(2000);
      Logger.info('Scrolling completed');

      // Extract image URLs
      const imageUrls = await this.page.evaluate(() => {
        // Unsplash image containers have specific classes
        const containers = Array.from(document.querySelectorAll('figure[itemprop="image"] a, div[data-test="photo-grid-masonry-figure"] a'));
        
        // Extract the URLs from the containers
        return containers
          .filter(container => container.href && container.href.includes('/photos/'))
          .map(container => {
            // Find the image inside the container
            const img = container.querySelector('img');
            if (img && img.srcset) {
              // Parse srcset to get the largest image URL
              const srcsetParts = img.srcset.split(',');
              const lastPart = srcsetParts[srcsetParts.length - 1].trim();
              const url = lastPart.split(' ')[0];
              return url;
            } else if (img && img.src) {
              return img.src;
            }
            return null;
          })
          .filter(url => url && url.startsWith('http'))
          // Remove duplicates
          .filter((url, index, self) => self.indexOf(url) === index);
      });

      Logger.info(`Found ${imageUrls.length} images on Unsplash`);

      // Download images
      for (const url of imageUrls) {
        if (this.downloadedCount >= this.options.maxDownloads) {
          Logger.info('Maximum download limit reached');
          break;
        }

        try {
          await this.downloadImage(url);
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
      const response = await this.page.goto(url, { waitUntil: 'networkidle2' });
      const buffer = await response.buffer();

      // Check image dimensions if needed
      if (this.options.minWidth > 0 || this.options.minHeight > 0) {
        const metadata = await sharp(buffer).metadata();
        if ((this.options.minWidth > 0 && metadata.width < this.options.minWidth) ||
            (this.options.minHeight > 0 && metadata.height < this.options.minHeight)) {
          this.skippedCount++;
          Logger.debug(`Skipped image (dimensions too small): ${url}`);
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

      if (this.downloadedCount % 10 === 0) {
        Logger.info(`Downloaded ${this.downloadedCount} images...`);
      }

      Logger.debug(`Downloaded: ${url} -> ${outputPath}`);
    } catch (error) {
      Logger.error(`Error downloading image ${url}:`, error.message);
      throw error;
    }
  }
}

export default WebCrawler;