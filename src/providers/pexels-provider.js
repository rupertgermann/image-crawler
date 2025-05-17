import BaseProvider from './base-provider.js';
import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';
import Logger from '../utils/logger.js';

// Simple and reliable Pexels provider using their public API
export default class PexelsProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.apiKey = config.pexelsApiKey || process.env.PEXELS_API_KEY;
    this.baseUrl = 'https://api.pexels.com/v1/search';
    this.name = 'Pexels'; // For logging
  }

  async initialize() {
    if (!this.apiKey) {
      Logger.warn(`[${this.name}] API key is missing. PexelsProvider will not be able to fetch images.`);
      // Optionally, throw an error or disable the provider if API key is crucial
      // throw new Error('Pexels API key is required for PexelsProvider.');
    }
    Logger.info('PexelsProvider initialized.');
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
      Logger.error(`[${this.name}] API key is missing. Cannot fetch images.`);
      return [];
    }

    const perPage = options.maxResults || this.config.perPage || 30;
    const url = `${this.baseUrl}?query=${encodeURIComponent(query)}&per_page=${perPage}`;
    Logger.info(`[${this.name}] Fetching from ${url}`);

    try {
      const response = await fetch(url, {
        headers: { Authorization: this.apiKey }
      });

      if (!response.ok) {
        const errorBody = await response.text();
        Logger.error(`[${this.name}] API error: ${response.status} - ${response.statusText}. Body: ${errorBody}`);
        throw new Error(`Pexels API error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();
      const photos = data.photos || [];
      const imageUrls = photos.map(photo => photo.src && photo.src.original).filter(Boolean);
      
      Logger.info(`[${this.name}] Found ${imageUrls.length} image URLs.`);
      return imageUrls;
    } catch (error) {
      Logger.error(`[${this.name}] Error fetching images for "${query}": ${error.message}`);
      Logger.debug(error.stack);
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
    Logger.debug(`[${this.name}] getFullSizeImage called for: ${imageUrl}. Returning as is.`);
    return imageUrl;
  }
}
