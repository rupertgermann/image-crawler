import BaseProvider from './base-provider.js';
import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';
import Logger from '../utils/logger.js';

// Wikimedia Commons provider using their public API
export default class WikimediaProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.baseUrl = 'https://commons.wikimedia.org/w/api.php';
    this.name = 'Wikimedia'; // For logging
  }

  async initialize() {
    Logger.info('WikimediaProvider initialized.');
  }

  /**
   * Fetches image URLs from Wikimedia Commons API.
   * @param {string} query - The search query.
   * @param {object} options - Additional options (e.g., maxResults).
   * @param {import('playwright').Page} [playwrightPage] - Optional Playwright page (not used).
   * @returns {Promise<string[]>} - A promise that resolves to an array of image URLs.
   */
  async fetchImageUrls(query, options, playwrightPage) { // eslint-disable-line no-unused-vars
    const maxResults = options.maxResults || this.config.perPage || 30;
    // API parameters for Wikimedia Commons:
    // action=query: Perform a query.
    // generator=search: Use search results as a generator for pages.
    // gsrnamespace=6: Search only in the File namespace (namespace 6).
    // gsrsearch={query}: The search term.
    // gsrlimit={maxResults}: Number of results to return.
    // prop=imageinfo: Get information about images.
    // iiprop=url: Get the URL of the image file itself.
    // format=json: Return results in JSON format.
    // origin=*: Required for cross-domain AJAX requests from a browser, good practice for server-side too.
    const apiUrl = `${this.baseUrl}?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${maxResults}&prop=imageinfo&iiprop=url&format=json&origin=*`;
    
    Logger.info(`[${this.name}] Fetching from ${apiUrl}`);
    const imageUrls = [];

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorBody = await response.text();
        Logger.error(`[${this.name}] API error: ${response.status} - ${response.statusText}. Body: ${errorBody}`);
        throw new Error(`Wikimedia API error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();
      if (data.query && data.query.pages) {
        for (const pageId of Object.keys(data.query.pages)) {
          const page = data.query.pages[pageId];
          if (page.imageinfo && page.imageinfo.length > 0 && page.imageinfo[0].url) {
            imageUrls.push(page.imageinfo[0].url);
          }
        }
      }
      Logger.info(`[${this.name}] Found ${imageUrls.length} image URLs.`);
      return imageUrls;
    } catch (error) {
      Logger.error(`[${this.name}] Error fetching images for "${query}": ${error.message}`);
      Logger.debug(error.stack);
      return [];
    }
  }

  /**
   * For Wikimedia, the URL from fetchImageUrls should be the direct image URL.
   * @param {import('playwright').Page} page - The Playwright page instance (not used).
   * @param {string} imageUrl - The URL of the image.
   * @returns {Promise<string>} - The full-size image URL.
   */
  async getFullSizeImage(page, imageUrl) { // eslint-disable-line no-unused-vars
    Logger.debug(`[${this.name}] getFullSizeImage called for: ${imageUrl}. Returning as is.`);
    return imageUrl;
  }
}
