const BaseProvider = require('./base-provider.js');
const fetch = require('node-fetch');
// fs and path are not used directly in this file.
// const fs = require('fs-extra');
// const path = require('path');
// const Logger = require('../utils/logger.js'); // Use this.emitLog

// Simple Flickr provider using the public Flickr API (requires API key)
class FlickrProvider extends BaseProvider {
  constructor(config, emitter) { // Added emitter
    super(config, emitter); // Pass emitter to BaseProvider
    this.apiKey = config.flickrApiKey || process.env.FLICKR_API_KEY;
    this.baseUrl = 'https://www.flickr.com/services/rest/';
    this.name = 'Flickr';
  }

  async initialize() {
    if (!this.apiKey) {
      this.emitLog('warn', `API key is missing. FlickrProvider will not be able to fetch images.`);
      // Consider throwing an error: throw new Error('Flickr API key is required for FlickrProvider.');
    }
    this.emitLog('info', 'FlickrProvider initialized.');
  }

  /**
   * Fetches image URLs from Flickr API.
   * @param {string} query - The search query.
   * @param {object} options - Additional options (e.g., maxResults).
   * @param {import('playwright').Page} [playwrightPage] - Optional Playwright page instance (not used by Flickr API).
   * @returns {Promise<string[]>} - A promise that resolves to an array of image URLs.
   */
  async fetchImageUrls(query, options, playwrightPage) { // eslint-disable-line no-unused-vars
    if (!this.apiKey) {
      this.emitLog('error', `API key is missing. Cannot fetch images.`);
      return [];
    }

    const perPage = options.maxResults || this.config.perPage || 30;
    const extras = 'url_o,url_l,url_b';
    const url = `${this.baseUrl}?method=flickr.photos.search&api_key=${this.apiKey}&text=${encodeURIComponent(query)}&format=json&nojsoncallback=1&per_page=${perPage}&extras=${extras}&sort=relevance&safe_search=1`;

    this.emitLog('info', `Fetching from ${url}`);
    this.emitProgress({ foundCount: 0, requestedCount: perPage, message: `Fetching from Flickr API...` });

    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorBody = await response.text();
        this.emitLog('error', `API error: ${response.status} - ${response.statusText}. Body: ${errorBody}`);
        throw new Error(`Flickr API error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();
      if (data.stat !== 'ok') {
        this.emitLog('error', `API response not OK: ${data.message}`);
        throw new Error(`Flickr API response not OK: ${data.message}`);
      }

      const photos = data.photos && data.photos.photo ? data.photos.photo : [];
      const imageUrls = photos.map(photo => {
        return photo.url_o || photo.url_l || photo.url_b;
      }).filter(Boolean);

      this.emitLog('info', `Found ${imageUrls.length} image URLs.`);
      this.emitProgress({ foundCount: imageUrls.length, requestedCount: perPage, message: `Found ${imageUrls.length} images from Flickr API.` });
      return imageUrls;
    } catch (error) {
      this.emitLog('error', `Error fetching images for "${query}": ${error.message}`);
      return [];
    }
  }

  /**
   * For Flickr, the URL from fetchImageUrls should already be a good quality/size.
   * @param {import('playwright').Page} page - The Playwright page instance (not used).
   * @param {string} imageUrl - The URL of the image.
   * @returns {Promise<string>} - The full-size image URL.
   */
  async getFullSizeImage(page, imageUrl) { // eslint-disable-line no-unused-vars
    this.emitLog('debug', `getFullSizeImage called for: ${imageUrl}. Returning as is for Flickr.`);
    return imageUrl;
  }
}

module.exports = FlickrProvider;
