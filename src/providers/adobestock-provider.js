import axios from 'axios';
import BaseProvider from './base-provider.js';
import GenericPlaywrightProvider from './generic-playwright-provider.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AdobeStockProvider extends BaseProvider {
  constructor(providerConfig, emitter) {
    super(providerConfig, emitter);
    this.name = 'AdobeStock';
    this.apiKey = providerConfig.apiKey;
    this.apiBaseUrl = 'https://stock.adobe.io/Rest/Media/1/Search/Files';
    this.xProduct = providerConfig.xProduct || 'ImageBulkDownloader/1.0';
    
    // Initialize the scraping configuration
    this.playwrightScrapingConfig = null;
    this.loadPlaywrightConfig();
  }
  
  /**
   * Load the Playwright configuration for Adobe Stock
   */
  async loadPlaywrightConfig() {
    try {
      const configPath = path.join(__dirname, 'configs', 'playwright', 'adobestock.js');
      const module = await import(configPath);
      if (module.default) {
        this.playwrightScrapingConfig = module.default;
        this.emitLog('debug', `Successfully loaded Playwright config for Adobe Stock scraping`);
      } else {
        this.emitLog('warn', `Adobe Stock Playwright config file does not have a default export`);
      }
    } catch (error) {
      this.emitLog('error', `Failed to load Adobe Stock Playwright config: ${error.message}`);
    }
  }

  /**
   * Fetches image URLs from Adobe Stock.
   * If an API key is present, it should use the API.
   * Otherwise, it should fall back to scraping (placeholder for now).
   * 
   * @param {string} query - The search query.
   * @param {object} options - Additional options (e.g., maxResults).
   * @param {import('playwright').Page} [page] - Optional Playwright page instance for scraping.
   * @returns {Promise<Array<object>>} 
   *          A promise that resolves to an array of image information objects.
   */
  async fetchImageUrls(query, options, page) {
    this.emitLog('info', `Fetching images for query: "${query}" with options: ${JSON.stringify(options)}`);

    if (this.apiKey) {
      this.emitLog('info', 'API key found. Using API mode.');
      const searchParams = [
        `locale=en_US`,
        `search_parameters[words]=${encodeURIComponent(query)}`,
        `search_parameters[limit]=${options.maxResults || 30}` // Default to 30 if not provided
      ];
      
      const resultColumns = [
        'id', 'title', 'thumbnail_url', 'thumbnail_500_url', 'details_url', 
        'comp_url', 'width', 'height', 'content_type', 'nb_downloads',
        'premium_level_id' // To identify premium content
      ];
      const requestUrl = `${this.apiBaseUrl}?${searchParams.join('&')}&result_columns[]=${resultColumns.join(',')}`;

      this.emitLog('debug', `Adobe Stock API request URL: ${requestUrl}`);

      try {
        const response = await axios.get(requestUrl, {
          headers: {
            'x-api-key': this.apiKey,
            'x-Product': this.xProduct,
          },
          timeout: options.timeout || 10000, // Default timeout 10s
        });

        if (response.data && response.data.files) {
          this.emitLog('info', `Received ${response.data.files.length} items from Adobe Stock API.`);
          return response.data.files.map(item => ({
            id: item.id,
            title: item.title,
            thumbnailUrl: item.thumbnail_500_url || item.thumbnail_url, // Prefer 500px thumbnail
            detailPageUrl: item.details_url,
            fullSizeUrl: item.comp_url, 
            width: item.width,
            height: item.height,
            contentType: item.content_type,
            isPremium: item.premium_level_id > 0, // Basic check for premium
            source: this.name,
            provider: this.name,
            originalData: item, // Store the full API response item
          }));
        } else {
          this.emitLog('warn', 'No files found in Adobe Stock API response or unexpected structure.');
          return [];
        }
      } catch (error) {
        this.emitLog('error', `Error fetching images from Adobe Stock API: ${error.message}`);
        if (error.response) {
          this.emitLog('error', `API Error Details: Status ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        }
        return [];
      }
    } else {
      this.emitLog('info', 'No API key provided for Adobe Stock. Using scraping fallback mode.');
      
      // Make sure we have the Playwright config loaded
      if (!this.playwrightScrapingConfig) {
        await this.loadPlaywrightConfig();
      }
      
      if (!this.playwrightScrapingConfig) {
        this.emitLog('error', 'Failed to load Adobe Stock Playwright config for scraping.');
        return [];
      }
      
      // Use GenericPlaywrightProvider for scraping
      try {
        const genericProvider = new GenericPlaywrightProvider(
          this.config,
          this.emitter,
          this.playwrightScrapingConfig
        );
        
        // Use the GenericPlaywrightProvider to fetch image URLs
        const imageUrls = await genericProvider.fetchImageUrls(query, options, page);
        this.emitLog('info', `Scraping mode: Found ${imageUrls.length} images from Adobe Stock.`);
        
        // Transform the URLs into the expected format
        return imageUrls.map(url => ({
          detailPageUrl: url,
          thumbnailUrl: null, // Will be populated during getFullSizeImage
          title: `Adobe Stock Image - ${query}`,
          source: this.name,
          provider: this.name
        }));
      } catch (error) {
        this.emitLog('error', `Error in scraping fallback mode: ${error.message}`);
        return [];
      }
    }
  }

  /**
   * Retrieves the full-size image URL.
   * For API mode, this typically means returning a pre-fetched comp URL or similar.
   * For scraping, it would involve navigating to a detail page.
   * 
   * @param {object} imageInfo - Object containing image details from fetchImageUrls.
   * @param {import('playwright').Page} [page] - Optional Playwright page instance for scraping.
   * @returns {Promise<string|null>} A promise that resolves to the full-size image URL or null.
   */
  async getFullSizeImage(imageInfo, page) {
    this.emitLog('info', `Getting full-size image for item: ${imageInfo.title || 'Unknown title'}`);

    if (this.apiKey && imageInfo.fullSizeUrl) {
      // In API mode, fullSizeUrl (comp_url) was already fetched during fetchImageUrls
      this.emitLog('info', `API mode: Returning pre-fetched comp URL as fullSizeUrl: ${imageInfo.fullSizeUrl}`);
      return imageInfo.fullSizeUrl;
    } else if (!this.apiKey && imageInfo.detailPageUrl) {
      this.emitLog('info', `Scraping mode: Getting full-size image from detail page: ${imageInfo.detailPageUrl}`);
      
      // Make sure we have the Playwright config loaded
      if (!this.playwrightScrapingConfig) {
        await this.loadPlaywrightConfig();
      }
      
      if (!this.playwrightScrapingConfig) {
        this.emitLog('error', 'Failed to load Adobe Stock Playwright config for scraping.');
        return null;
      }
      
      try {
        // Use GenericPlaywrightProvider for scraping the detail page
        const genericProvider = new GenericPlaywrightProvider(
          this.config,
          this.emitter,
          this.playwrightScrapingConfig
        );
        
        // Get the full-size image URL from the detail page
        const fullSizeUrlFromGeneric = await genericProvider.getFullSizeImage(page, imageInfo.detailPageUrl);
        
        if (typeof fullSizeUrlFromGeneric === 'string' && fullSizeUrlFromGeneric.trim() !== '') {
          this.emitLog('info', `Successfully extracted full-size image URL: ${fullSizeUrlFromGeneric}`);
          return fullSizeUrlFromGeneric;
        } else {
          if (fullSizeUrlFromGeneric !== null) { // Log if it's not null but also not a valid string
            this.emitLog('warn', `GenericProvider returned non-string or empty string for full-size URL. Type: ${typeof fullSizeUrlFromGeneric}, Value: '${String(fullSizeUrlFromGeneric)}'. Detail page: ${imageInfo.detailPageUrl}`);
          } else {
            this.emitLog('warn', `Failed to extract full-size image URL (GenericProvider returned null) from detail page: ${imageInfo.detailPageUrl}`);
          }
          return null;
        }
      } catch (error) {
        this.emitLog('error', `Error getting full-size image in scraping mode: ${error.message}`);
        return null;
      }
    } else {
      this.emitLog('warn', 'Cannot get full-size image: API key not present or detailPageUrl missing in imageInfo.');
      return null;
    }
  }
}

export default AdobeStockProvider;
