import BaseProvider from './base-provider.js';
import fetch from 'node-fetch';
// import Logger from '../utils/logger.js';

/**
 * Wikimedia Commons provider using their public API
 */
export default class WikimediaProvider extends BaseProvider {
  constructor(config, emitter) { // Added emitter
    super(config, emitter); // Pass emitter to BaseProvider
    this.baseUrl = 'https://commons.wikimedia.org/w/api.php';
    this.name = 'Wikimedia';
  }

  async initialize() {
    this.emitLog('info', 'WikimediaProvider initialized.');
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

    this.emitLog('info', `Fetching from ${apiUrl}`);
    this.emitProgress({ foundCount: 0, requestedCount: maxResults, message: `Fetching from Wikimedia API...` });
    const imageUrls = [];

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorBody = await response.text();
        this.emitLog('error', `API error: ${response.status} - ${response.statusText}. Body: ${errorBody}`);
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
      this.emitLog('info', `Found ${imageUrls.length} image URLs.`);
      this.emitProgress({ foundCount: imageUrls.length, requestedCount: maxResults, message: `Found ${imageUrls.length} images from Wikimedia API.` });
      return imageUrls;
    } catch (error) {
      this.emitLog('error', `Error fetching images for "${query}": ${error.message}`);
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
    this.emitLog('debug', `getFullSizeImage called for: ${imageUrl}. Returning as is for Wikimedia.`);
    return imageUrl;
  }
}


