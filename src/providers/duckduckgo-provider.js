import BaseProvider from './base-provider.js';
import fs from 'fs-extra';
import path from 'path';
import Logger from '../utils/logger.js';
import { chromium } from 'playwright';

// DuckDuckGo Images provider using Playwright
export default class DuckDuckGoProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.baseUrl = 'https://duckduckgo.com/'; // Base URL, query params added in fetchImageUrls
    this.name = 'DuckDuckGo'; // For logging
  }

  async initialize() {
    Logger.info('DuckDuckGoProvider initialized.');
  }

  /**
   * Fetches proxied image URLs from DuckDuckGo Images.
   * @param {string} query - The search query.
   * @param {object} options - Additional options (e.g., maxResults).
   * @param {import('playwright').Page} page - The Playwright page instance.
   * @returns {Promise<string[]>} - A promise that resolves to an array of proxied image URLs.
   */
  async fetchImageUrls(query, options, page) {
    const { maxResults } = options;
    // vqd is a token DDG uses, might be obtainable or might work without for basic scraping
    // For simplicity, starting without attempting to fetch vqd. Filter for safesearch: &kl=us-en&kp=-1 (strict)
    const searchUrl = `${this.baseUrl}?q=${encodeURIComponent(query)}&iax=images&ia=images&kp=-1`;
    const imageUrls = new Set();

    Logger.info(`[${this.name}] Searching for "${query}" at ${searchUrl}`);

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: this.config.timeout || 60000 });

      // DDG usually doesn't have aggressive cookie banners, but good to be aware.

      let scrollCount = 0;
      const maxScrolls = this.config.maxScrollsDDG || 15; // Configurable max scrolls
      const imageThumbnailSelector = 'img.tile--img__img'; // Selector for the image thumbnails
      const loadMoreButtonSelector = '.results--more a.result--more__btn'; // Selector for "Load More" button

      while (imageUrls.size < maxResults && scrollCount < maxScrolls) {
        const initialImageCount = imageUrls.size;

        const currentThumbnails = await page.locator(imageThumbnailSelector).evaluateAll(imgs => 
          imgs.map(img => img.getAttribute('src') || img.getAttribute('data-src')).filter(src => src && src.startsWith('http'))
        );
        currentThumbnails.forEach(url => {
          if (imageUrls.size < maxResults) {
            imageUrls.add(url);
          }
        });

        Logger.info(`[${this.name}] Scroll/Load ${scrollCount + 1}. Found ${imageUrls.size} unique image URLs (target: ${maxResults}).`);
        if (imageUrls.size >= maxResults) break;

        const loadMoreButton = page.locator(loadMoreButtonSelector);
        if (await loadMoreButton.isVisible({ timeout: 2000 })) {
          Logger.info(`[${this.name}] Clicking 'Load More' button.`);
          await loadMoreButton.click();
          await page.waitForLoadState('networkidle', { timeout: this.config.loadMoreTimeoutDDG || 10000 });
        } else {
          // If no 'load more' button, try scrolling
          await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
          await page.waitForTimeout(this.config.scrollDelayDDG || 2000); 
        }
        scrollCount++;
        
        if (imageUrls.size === initialImageCount && !(await loadMoreButton.isVisible({timeout:1000}))) {
            // If no new images and no load more button, assume end of results
            Logger.info(`[${this.name}] No new images and no 'Load More' button. Stopping.`);
            break;
        }
      }
    } catch (error) {
      Logger.error(`[${this.name}] Error fetching image URLs for "${query}": ${error.message}`);
      Logger.debug(error.stack);
    }

    Logger.info(`[${this.name}] Found a total of ${imageUrls.size} unique proxied image URLs for "${query}".`);
    return Array.from(imageUrls).slice(0, maxResults);
  }

  /**
   * Extracts the original image URL from a DuckDuckGo proxied URL.
   * Example: https://external-content.duckduckgo.com/iu/?u=ENCODED_URL&f=1...
   * @param {import('playwright').Page} page - The Playwright page instance (not actively used).
   * @param {string} proxiedImageUrl - The proxied image URL from DuckDuckGo.
   * @returns {Promise<string|null>} - The original full-size image URL, or the proxied URL if extraction fails.
   */
  async getFullSizeImage(page, proxiedImageUrl) { // eslint-disable-line no-unused-vars
    Logger.debug(`[${this.name}] Attempting to get full-size image from DDG proxied URL: ${proxiedImageUrl}`);
    try {
      if (!proxiedImageUrl.includes('external-content.duckduckgo.com/iu/')) {
        Logger.warn(`[${this.name}] URL ${proxiedImageUrl} does not appear to be a DDG proxied URL. Returning as is.`);
        return proxiedImageUrl;
      }
      const urlObj = new URL(proxiedImageUrl);
      const originalUrl = urlObj.searchParams.get('u');
      if (originalUrl) {
        const decodedUrl = decodeURIComponent(originalUrl);
        Logger.info(`[${this.name}] Extracted original URL: ${decodedUrl}`);
        return decodedUrl;
      }
      Logger.warn(`[${this.name}] Could not extract 'u' parameter from ${proxiedImageUrl}. Returning proxied URL.`);
      return proxiedImageUrl;
    } catch (error) {
      Logger.error(`[${this.name}] Error parsing DDG proxied URL ${proxiedImageUrl}: ${error.message}`);
      Logger.debug(error.stack);
      return proxiedImageUrl; // Fallback
    }
  }
}
