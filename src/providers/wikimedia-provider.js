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
   * @returns {Promise<Array<object>>} - A promise that resolves to an array of imageInfo objects.
   */
  async fetchImageUrls(query, options, playwrightPage) { // eslint-disable-line no-unused-vars
    const maxResults = options.maxResults || this.config.perPage || 30;
    
    const apiUrlParams = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrnamespace: '6',
      gsrsearch: query,
      gsrlimit: maxResults,
      prop: 'imageinfo',
      iiprop: 'url|size|mime|user|timestamp|commonmetadata|extmetadata', // Updated iiprop
      iiurlwidth: '200', // Request 200px wide thumbnail
      format: 'json',
      origin: '*'
    });
    const apiUrl = `${this.baseUrl}?${apiUrlParams.toString()}`;

    this.emitLog('info', `Fetching from ${apiUrl}`);
    this.emitProgress({ foundCount: 0, requestedCount: maxResults, message: `Fetching from Wikimedia API...` });
    
    const imageInfoArray = [];

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
          if (page.imageinfo && page.imageinfo.length > 0) {
            const imgInfo = page.imageinfo[0];
            const metadata = imgInfo.commonmetadata || imgInfo.extmetadata || null;
            
            // Construct imageInfo object
            const imageDetails = {
              id: page.pageid,
              title: page.title,
              thumbnailUrl: imgInfo.thumburl,
              detailPageUrl: imgInfo.descriptionurl,
              fullSizeUrl: imgInfo.url,
              width: imgInfo.width,
              height: imgInfo.height,
              fileSize: imgInfo.size,
              mimeType: imgInfo.mime,
              uploader: imgInfo.user,
              uploadTimestamp: imgInfo.timestamp,
              metadata: metadata,
              source: this.name,
              provider: this.name,
              originalData: imgInfo,
            };
            imageInfoArray.push(imageDetails);
          }
        }
      }
      this.emitLog('info', `Found ${imageInfoArray.length} images.`);
      this.emitProgress({ foundCount: imageInfoArray.length, requestedCount: maxResults, message: `Found ${imageInfoArray.length} images from Wikimedia API.` });
      return imageInfoArray;
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
    // The imageUrl parameter is expected to be an imageInfo object now, due to changes in how PlaywrightCrawler calls this.
    // However, the task stated this method should remain "as is".
    // If PlaywrightCrawler passes the full imageInfo object, we should extract fullSizeUrl.
    // If it passes a string URL (as it might have previously), then that's what we return.
    // For safety and adhering to the "as is" instruction while accommodating the new imageInfo structure:
    if (typeof imageUrl === 'string') {
        this.emitLog('debug', `getFullSizeImage called with URL: ${imageUrl}. Returning as is for Wikimedia.`);
        return imageUrl;
    } else if (imageUrl && imageUrl.fullSizeUrl) {
        this.emitLog('debug', `getFullSizeImage called with imageInfo. Returning fullSizeUrl: ${imageUrl.fullSizeUrl}`);
        return imageUrl.fullSizeUrl;
    } else {
        this.emitLog('warn', `getFullSizeImage called with unexpected parameter: ${JSON.stringify(imageUrl)}. Returning null.`);
        return null;
    }
  }
}
