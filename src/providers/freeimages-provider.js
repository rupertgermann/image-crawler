import BaseProvider from './base-provider.js';
import fs from 'fs-extra';
import path from 'path';
import Logger from '../utils/logger.js';

// FreeImages provider using Playwright (simple grid scraping)
export default class FreeImagesProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.baseUrl = 'https://www.freeimages.com'; // Base URL, path added in methods
    this.name = 'FreeImages'; // For logging
  }

  async initialize() {
    Logger.info('FreeImagesProvider initialized.');
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

    Logger.info(`[${this.name}] Searching for "${query}" at ${searchUrl}`);

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: this.config.timeout || 60000 });

      // Handle cookie consent (selector specific to FreeImages)
      try {
        const cookieButtonSelector = 'button#onetrust-accept-btn-handler';
        const cookieButton = page.locator(cookieButtonSelector);
        if (await cookieButton.isVisible({ timeout: 5000 })) {
          await cookieButton.click({ timeout: 3000 });
          Logger.info(`[${this.name}] Clicked cookie consent button.`);
          await page.waitForLoadState('networkidle', { timeout: 5000 });
        }
      } catch (e) {
        Logger.debug(`[${this.name}] No cookie consent dialog found or error clicking: ${e.message}`);
      }

      let scrollCount = 0;
      const maxScrolls = this.config.maxScrollsFreeImages || 10;
      // Selector for links to individual image detail pages
      const imageLinkSelector = 'div.MosaicAsset-module__container___L9x3s > a'; 

      while (detailPageUrls.size < maxResults && scrollCount < maxScrolls) {
        const initialCount = detailPageUrls.size;
        const links = await page.locator(imageLinkSelector).evaluateAll(anchors => 
          anchors.map(a => a.href).filter(href => href && href.startsWith(this.baseUrl))
        );
        
        links.forEach(href => {
          if (detailPageUrls.size < maxResults) {
            detailPageUrls.add(href);
          }
        });

        Logger.info(`[${this.name}] Scroll ${scrollCount + 1}/${maxScrolls}. Found ${detailPageUrls.size} unique detail page URLs (target: ${maxResults}).`);
        if (detailPageUrls.size >= maxResults) break;

        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await page.waitForTimeout(this.config.scrollDelayFreeImages || 2500);
        scrollCount++;

        if (detailPageUrls.size === initialCount && scrollCount > 2) { // Stop if no new URLs after a few scrolls
            Logger.info(`[${this.name}] No new image detail page URLs found after ${scrollCount} scrolls. Stopping.`);
            break;
        }
      }
    } catch (error) {
      Logger.error(`[${this.name}] Error fetching image detail page URLs for "${query}": ${error.message}`);
      Logger.debug(error.stack);
    }

    Logger.info(`[${this.name}] Found a total of ${detailPageUrls.size} unique image detail page URLs for "${query}".`);
    return Array.from(detailPageUrls).slice(0, maxResults);
  }

  /**
   * Navigates to an image detail page and extracts the full-size image URL.
   * @param {import('playwright').Page} page - The Playwright page instance.
   * @param {string} detailPageUrl - The URL of the image detail page.
   * @returns {Promise<string|null>} - The full-size image URL, or null if not found.
   */
  async getFullSizeImage(page, detailPageUrl) {
    Logger.info(`[${this.name}] Navigating to detail page: ${detailPageUrl}`);
    try {
      await page.goto(detailPageUrl, { waitUntil: 'networkidle', timeout: this.config.timeout || 60000 });
      
      // Selector for the main image on the detail page
      const mainImageSelector = 'img[data-testid="photo-details-image"]'; 
      const imageElement = page.locator(mainImageSelector);

      if (await imageElement.isVisible({ timeout: 10000 })) {
        const fullSizeUrl = await imageElement.getAttribute('src');
        if (fullSizeUrl && fullSizeUrl.startsWith('http')) {
          Logger.info(`[${this.name}] Extracted full-size image URL: ${fullSizeUrl}`);
          return fullSizeUrl;
        }
        Logger.warn(`[${this.name}] Main image 'src' attribute not found or invalid on ${detailPageUrl}`);
      } else {
        Logger.warn(`[${this.name}] Main image not visible on detail page ${detailPageUrl}`);
      }
      return null;
    } catch (error) {
      Logger.error(`[${this.name}] Error getting full-size image from ${detailPageUrl}: ${error.message}`);
      Logger.debug(error.stack);
      return null;
    }
  }
}
