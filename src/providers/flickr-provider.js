import BaseProvider from './base-provider.js';
import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';
import Logger from '../utils/logger.js';

// Simple Flickr provider using the public Flickr API (requires API key)
export default class FlickrProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.apiKey = config.flickrApiKey || process.env.FLICKR_API_KEY;
    this.baseUrl = 'https://www.flickr.com/services/rest/';
    this.name = 'Flickr'; // For logging
  }

  async initialize() {
    if (!this.apiKey) {
      Logger.warn(`[${this.name}] API key is missing. FlickrProvider will not be able to fetch images.`);
      // Consider throwing an error: throw new Error('Flickr API key is required for FlickrProvider.');
    }
    Logger.info('FlickrProvider initialized.');
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
      Logger.error(`[${this.name}] API key is missing. Cannot fetch images.`);
      return [];
    }

    const perPage = options.maxResults || this.config.perPage || 30;
    // extras=url_o will attempt to get original image URL if available, url_l for large. Fallback to url_b.
    const extras = 'url_o,url_l,url_b'; 
    const url = `${this.baseUrl}?method=flickr.photos.search&api_key=${this.apiKey}&text=${encodeURIComponent(query)}&format=json&nojsoncallback=1&per_page=${perPage}&extras=${extras}&sort=relevance&safe_search=1`;
    
    Logger.info(`[${this.name}] Fetching from ${url}`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorBody = await response.text();
        Logger.error(`[${this.name}] API error: ${response.status} - ${response.statusText}. Body: ${errorBody}`);
        throw new Error(`Flickr API error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();
      if (data.stat !== 'ok') {
        Logger.error(`[${this.name}] API response not OK: ${data.message}`);
        throw new Error(`Flickr API response not OK: ${data.message}`);
      }
      
      const photos = data.photos && data.photos.photo ? data.photos.photo : [];
      const imageUrls = photos.map(photo => {
        // Prefer original (url_o), then large (url_l), then big (url_b)
        return photo.url_o || photo.url_l || photo.url_b;
      }).filter(Boolean); // Filter out any undefined URLs

      Logger.info(`[${this.name}] Found ${imageUrls.length} image URLs.`);
      return imageUrls;
    } catch (error) {
      Logger.error(`[${this.name}] Error fetching images for "${query}": ${error.message}`);
      Logger.debug(error.stack);
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
    Logger.debug(`[${this.name}] getFullSizeImage called for: ${imageUrl}. Returning as is.`);
    return imageUrl;
  }
}
