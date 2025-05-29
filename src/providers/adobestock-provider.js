import axios from 'axios'; // Assuming axios is available
import BaseProvider from './base-provider.js';

class AdobeStockProvider extends BaseProvider {
  constructor(providerConfig, emitter) {
    super(providerConfig, emitter); // providerConfig here is from config.json (e.g., { enabled, apiKey })
    this.name = 'AdobeStock';
    this.apiKey = providerConfig.apiKey; // API key from config.json
    this.apiBaseUrl = 'https://stock.adobe.io/Rest/Media/1/Search/Files';
    this.xProduct = providerConfig.xProduct || 'ImageBulkDownloader/1.0'; // Use from config or default

    // Note: Playwright-specific configs (like selectors for scraping) are typically loaded
    // by GenericPlaywrightProvider using the separate adobestock.js config file.
    // This class primarily handles API logic or orchestrates scraping if needed.
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
  async fetchImageUrls(query, options, page) { // eslint-disable-line no-unused-vars
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
        'comp_url', 'width', 'height', 'content_type', 'nb_downloads', // Added nb_downloads for potential sorting/filtering
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
            // comp_url is often a watermarked preview, suitable for display before licensing.
            // For actual "full size" in the context of original, one might need licensing step via API.
            // This is good enough for a preview/selection UI.
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
      this.emitLog('warn', 'No API key provided for Adobe Stock. Scraping fallback mode is not yet fully implemented here.');
      // Placeholder: In a full implementation, this might delegate to GenericPlaywrightProvider
      // or use the 'page' object with configs loaded from adobestock.js (configs/playwright).
      // For this task, we are just setting up the structure.
      this.emitLog('info', 'Scraping mode would use GenericPlaywrightProvider logic with its config.');
      return Promise.resolve([]);
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
  async getFullSizeImage(imageInfo, page) { // eslint-disable-line no-unused-vars
    this.emitLog('info', `Getting full-size image for item ID: ${imageInfo.id || 'N/A'}, Title: ${imageInfo.title}`);

    if (this.apiKey && imageInfo.fullSizeUrl) {
      // In API mode, fullSizeUrl (comp_url) was already fetched during fetchImageUrls.
      // This URL is typically for a watermarked composition.
      // True full-size, non-watermarked images usually require a licensing step via API.
      this.emitLog('info', `API mode: Returning pre-fetched comp URL as fullSizeUrl: ${imageInfo.fullSizeUrl}`);
      return Promise.resolve(imageInfo.fullSizeUrl);
    } else if (!this.apiKey && imageInfo.detailPageUrl) {
      this.emitLog('warn', `Scraping mode for getFullSizeImage is not yet fully implemented for AdobeStock directly in this provider.`);
      // Placeholder: This would normally involve using GenericPlaywrightProvider logic
      // with configs from adobestock.js to scrape the detailPageUrl.
      // For example:
      // const gpp = new GenericPlaywrightProvider(this.config, this.emitter, this.playwrightScrapingConfig);
      // return gpp.getFullSizeImage(page, imageInfo.detailPageUrl);
      // For now, as per instructions:
      return Promise.resolve(null);
    } else {
      this.emitLog('warn', 'Cannot get full-size image: API key not present or fullSizeUrl/detailPageUrl missing in imageInfo.');
      return Promise.resolve(null);
    }
  }
}

export default AdobeStockProvider;
