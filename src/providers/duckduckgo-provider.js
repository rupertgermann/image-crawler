const BaseProvider = require('./base-provider.js');
// fs and path are not directly used. Chromium is also not used here.
// const fs = require('fs-extra');
// const path = require('path');
// const { chromium } = require('playwright'); // Not used directly in this provider
// const Logger = require('../utils/logger.js'); // Use this.emitLog

// DuckDuckGo Images provider using Playwright
class DuckDuckGoProvider extends BaseProvider {
  constructor(config, emitter) { // Added emitter
    super(config, emitter); // Pass emitter to BaseProvider
    this.baseUrl = 'https://duckduckgo.com/';
    this.name = 'DuckDuckGo';
  }

  async initialize() {
    this.emitLog('info', 'DuckDuckGoProvider initialized.');
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
    const searchUrl = `${this.baseUrl}?q=${encodeURIComponent(query)}&iax=images&ia=images&kp=${this.config.safeSearch ? '-1' : '1'}`; // Added safeSearch from config
    const imageUrls = new Set();

    this.emitLog('info', `Searching for "${query}" at ${searchUrl}`);

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: this.config.timeout || 60000 });

      let scrollCount = 0;
      const maxScrolls = this.config.maxScrollsDDG || 15;
      const imageThumbnailSelector = 'img.tile--img__img';
      const loadMoreButtonSelector = '.results--more a.result--more__btn';

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

        this.emitLog('info', `Scroll/Load ${scrollCount + 1}. Found ${imageUrls.size} unique image URLs (target: ${maxResults}).`);
        this.emitProgress({ foundCount: imageUrls.size, requestedCount: maxResults, message: `Scrolled/Loaded ${scrollCount + 1} times.` });
        
        if (imageUrls.size >= maxResults) break;

        const loadMoreButton = page.locator(loadMoreButtonSelector);
        if (await loadMoreButton.isVisible({ timeout: 2000 })) {
          this.emitLog('info', `Clicking 'Load More' button.`);
          await loadMoreButton.click();
          await page.waitForLoadState('networkidle', { timeout: this.config.loadMoreTimeoutDDG || 10000 });
        } else {
          await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
          await page.waitForTimeout(this.config.scrollDelayDDG || 2000);
        }
        scrollCount++;

        if (imageUrls.size === initialImageCount && !(await loadMoreButton.isVisible({ timeout: 1000 }))) {
          this.emitLog('info', `No new images and no 'Load More' button. Stopping.`);
          break;
        }
      }
    } catch (error) {
      this.emitLog('error', `Error fetching image URLs for "${query}": ${error.message}`);
    }

    this.emitLog('info', `Found a total of ${imageUrls.size} unique proxied image URLs for "${query}".`);
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
    this.emitLog('debug', `Attempting to get full-size image from DDG proxied URL: ${proxiedImageUrl}`);
    try {
      if (!proxiedImageUrl.includes('external-content.duckduckgo.com/iu/')) {
        this.emitLog('warn', `URL ${proxiedImageUrl} does not appear to be a DDG proxied URL. Returning as is.`);
        return proxiedImageUrl;
      }
      const urlObj = new URL(proxiedImageUrl);
      const originalUrl = urlObj.searchParams.get('u');
      if (originalUrl) {
        const decodedUrl = decodeURIComponent(originalUrl);
        this.emitLog('info', `Extracted original URL: ${decodedUrl}`);
        return decodedUrl;
      }
      this.emitLog('warn', `Could not extract 'u' parameter from ${proxiedImageUrl}. Returning proxied URL.`);
      return proxiedImageUrl;
    } catch (error) {
      this.emitLog('error', `Error parsing DDG proxied URL ${proxiedImageUrl}: ${error.message}`);
      return proxiedImageUrl; // Fallback
    }
  }
}

module.exports = DuckDuckGoProvider;
