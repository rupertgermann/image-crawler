import BaseProvider from './base-provider.js';
// fs and path are not used directly.
// import fs from 'fs-extra';
// import path from 'path';
// import Logger from '../utils/logger.js'; // Use this.emitLog

// FreeImages provider using Playwright (simple grid scraping)
export default class FreeImagesProvider extends BaseProvider {
  constructor(config, emitter) { // Added emitter
    super(config, emitter); // Pass emitter to BaseProvider
    this.baseUrl = 'https://www.freeimages.com';
    this.name = 'FreeImages';
  }

  async initialize() {
    this.emitLog('info', 'FreeImagesProvider initialized.');
  }

  /**
   * Fetches URLs of image detail pages from FreeImages.
   * @param {string} query - The search query.
   * @param {object} options - Additional options (e.g., maxResults).
   * @param {import('playwright').Page} page - The Playwright page instance.
   * @returns {Promise<string[]>} - A promise that resolves to an array of image detail page URLs.
   */
  async fetchImageUrls(query, options, page) {
    const { maxResults } = options;
    const searchPath = `/search/${encodeURIComponent(query)}`;
    const searchUrl = `${this.baseUrl}${searchPath}`;
    const detailPageUrls = new Set();

    this.emitLog('info', `Searching for "${query}" at ${searchUrl}`);

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: this.config.timeout || 60000 });

      try {
        const cookieButtonSelector = 'button#onetrust-accept-btn-handler';
        const cookieButton = page.locator(cookieButtonSelector);
        if (await cookieButton.isVisible({ timeout: 5000 })) {
          await cookieButton.click({ timeout: 3000 });
          this.emitLog('info', `Clicked cookie consent button.`);
          await page.waitForLoadState('networkidle', { timeout: 5000 });
        }
      } catch (e) {
        this.emitLog('debug', `No cookie consent dialog found or error clicking: ${e.message}`);
      }

      let scrollCount = 0;
      const maxScrolls = this.config.maxScrollsFreeImages || 10;
      const imageLinkSelector = 'div.MosaicAsset-module__container___L9x3s > a';

      while (detailPageUrls.size < maxResults && scrollCount < maxScrolls) {
        const initialCount = detailPageUrls.size;
        const links = await page.locator(imageLinkSelector).evaluateAll(anchors =>
          anchors.map(a => a.href).filter(href => href && href.startsWith(this.baseUrl)) // this.baseUrl might not be available in evaluateAll scope, pass it or make it static
        );

        links.forEach(href => {
          if (detailPageUrls.size < maxResults) {
            detailPageUrls.add(href);
          }
        });

        this.emitLog('info', `Scroll ${scrollCount + 1}/${maxScrolls}. Found ${detailPageUrls.size} unique detail page URLs (target: ${maxResults}).`);
        this.emitProgress({ foundCount: detailPageUrls.size, requestedCount: maxResults, message: `Scrolled ${scrollCount + 1} times.` });
        
        if (detailPageUrls.size >= maxResults) break;

        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await page.waitForTimeout(this.config.scrollDelayFreeImages || 2500);
        scrollCount++;

        if (detailPageUrls.size === initialCount && scrollCount > 2) {
          this.emitLog('info', `No new image detail page URLs found after ${scrollCount} scrolls. Stopping.`);
          break;
        }
      }
    } catch (error) {
      this.emitLog('error', `Error fetching image detail page URLs for "${query}": ${error.message}`);
    }

    this.emitLog('info', `Found a total of ${detailPageUrls.size} unique image detail page URLs for "${query}".`);
    return Array.from(detailPageUrls).slice(0, maxResults);
  }

  /**
   * Navigates to an image detail page and extracts the full-size image URL.
   * @param {import('playwright').Page} page - The Playwright page instance.
   * @param {string} detailPageUrl - The URL of the image detail page.
   * @returns {Promise<string|null>} - The full-size image URL, or null if not found.
   */
  async getFullSizeImage(page, detailPageUrl) {
    this.emitLog('info', `Navigating to detail page: ${detailPageUrl}`);
    try {
      await page.goto(detailPageUrl, { waitUntil: 'networkidle', timeout: this.config.timeout || 60000 });

      const mainImageSelector = 'img[data-testid="photo-details-image"]';
      const imageElement = page.locator(mainImageSelector);

      if (await imageElement.isVisible({ timeout: 10000 })) {
        const fullSizeUrl = await imageElement.getAttribute('src');
        if (fullSizeUrl && fullSizeUrl.startsWith('http')) {
          this.emitLog('info', `Extracted full-size image URL: ${fullSizeUrl}`);
          return fullSizeUrl;
        }
        this.emitLog('warn', `Main image 'src' attribute not found or invalid on ${detailPageUrl}`);
      } else {
        this.emitLog('warn', `Main image not visible on detail page ${detailPageUrl}`);
      }
      return null;
    } catch (error) {
      this.emitLog('error', `Error getting full-size image from ${detailPageUrl}: ${error.message}`);
      return null;
    }
  }
}


