import puppeteer from 'puppeteer';
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

class WebCrawler {
  constructor(options = {}) {
    this.options = {
      query: options.query || 'nature',
      outputDir: options.outputDir || pathUtils.getDefaultDownloadDir(),
      maxDownloads: options.maxDownloads || 100,
      minWidth: options.minWidth || 800,
      minHeight: options.minHeight || 600,
      minFileSize: options.minFileSize || 10240, // 10KB
      safeSearch: options.safeSearch !== false,
      headless: options.headless !== false,
      ...options
    };

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

      // Start crawling
      await this.crawlGoogleImages();

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

      await this.page.goto(searchUrl, { waitUntil: 'networkidle2' });

      // Scroll to load more images
      await this.autoScroll();

      // Extract image URLs
      const imageUrls = await this.extractImageUrls();
      Logger.info(`Found ${imageUrls.length} images`);

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
    } catch (error) {
      Logger.error('Error crawling Google Images:', error);
      throw error;
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
      tbs: this.buildSearchParams(),
      safe: this.options.safeSearch ? 'on' : 'off'
    });
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Build search parameters for Google Images
   */
  buildSearchParams() {
    const params = [];
    if (this.options.minWidth || this.options.minHeight) {
      const size = `isz:lt,islt:${this.options.minWidth || ''}x${this.options.minHeight || ''}`;
      params.push(size);
    }
    return params.join(',');
  }

  /**
   * Auto-scroll the page to load more images
   */
  async autoScroll() {
    await this.page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= 5000) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  /**
   * Extract image URLs from the page
   */
  async extractImageUrls() {
    return await this.page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img.rg_i'));
      return images
        .map(img => img.getAttribute('src') || img.getAttribute('data-src'))
        .filter(src => src && src.startsWith('http'));
    });
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