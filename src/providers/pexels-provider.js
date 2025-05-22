const BaseProvider = require('./base-provider.js');
const fetch = require('node-fetch'); // node-fetch is CJS compatible
// fs and path are not used directly in this file by the looks of it, but good practice if they were.
// const fs = require('fs-extra');
// const path = require('path');
// const Logger = require('../utils/logger.js'); // Use this.emitLog

// Simple and reliable Pexels provider using their public API
class PexelsProvider extends BaseProvider {
  constructor(config, emitter) { // Added emitter
    super(config, emitter); // Pass emitter to BaseProvider
    this.apiKey = config.pexelsApiKey || process.env.PEXELS_API_KEY;
    this.baseUrl = 'https://api.pexels.com/v1/search';
    this.name = 'Pexels';
  }

  async initialize() {
    if (!this.apiKey) {
      this.emitLog('warn', `API key is missing. PexelsProvider will not be able to fetch images.`);
      // Optionally, throw an error or disable the provider if API key is crucial
      // throw new Error('Pexels API key is required for PexelsProvider.');
    }
    this.emitLog('info', 'PexelsProvider initialized.');
  }

  /**
   * Fetches image URLs from Pexels API.
   * @param {string} query - The search query.
   * @param {object} options - Additional options (e.g., maxResults).
   * @param {import('playwright').Page} [playwrightPage] - Optional Playwright page instance (not used by Pexels API).
   * @returns {Promise<string[]>} - A promise that resolves to an array of image URLs.
   */
  async fetchImageUrls(query, options, playwrightPage) { // eslint-disable-line no-unused-vars
    if (!this.apiKey) {
      this.emitLog('error', `API key is missing. Cannot fetch images.`);
      return [];
    }

    const perPage = options.maxResults || this.config.perPage || 30; // Use maxResults from UI options
    const url = `${this.baseUrl}?query=${encodeURIComponent(query)}&per_page=${perPage}`;
    this.emitLog('info', `Fetching from ${url}`);
    this.emitProgress({ foundCount: 0, requestedCount: perPage, message: `Fetching from Pexels API...` });


    try {
      const response = await fetch(url, {
        headers: { Authorization: this.apiKey }
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.emitLog('error', `API error: ${response.status} - ${response.statusText}. Body: ${errorBody}`);
        throw new Error(`Pexels API error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();
      const photos = data.photos || [];
      const imageUrls = photos.map(photo => photo.src && photo.src.original).filter(Boolean);
      
      this.emitLog('info', `Found ${imageUrls.length} image URLs.`);
      this.emitProgress({ foundCount: imageUrls.length, requestedCount: perPage, message: `Found ${imageUrls.length} images from Pexels API.` });
      return imageUrls;
    } catch (error) {
      this.emitLog('error', `Error fetching images for "${query}": ${error.message}`);
      return []; // Return empty array on error to allow other providers to continue
    }
  }

  /**
   * For Pexels, the URL from fetchImageUrls (photo.src.original) is already the full-size image.
   * @param {import('playwright').Page} page - The Playwright page instance (not used).
   * @param {string} imageUrl - The URL of the image.
   * @returns {Promise<string>} - The full-size image URL.
   */
  async getFullSizeImage(page, imageUrl) { // eslint-disable-line no-unused-vars
    this.emitLog('debug', `getFullSizeImage called for: ${imageUrl}. Returning as is for Pexels.`);
    return imageUrl;
  }
}

module.exports = PexelsProvider;
