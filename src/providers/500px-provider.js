import axios from 'axios';
import BaseProvider from './base-provider.js';

class Px500Provider extends BaseProvider {
  constructor(providerConfig, emitter) {
    super(providerConfig, emitter);
    this.apiKey = providerConfig.apiKey; // Consumer Key
    this.name = '500px';
    this.apiBaseUrl = 'https://api.500px.com/v1';
  }

  /**
   * Fetches image URLs from 500px.
   * 
   * @param {string} query - The search query.
   * @param {object} options - Additional options (e.g., maxResults, page).
   * @param {import('playwright').Page} [page] - Optional Playwright page instance (not used in API mode).
   * @returns {Promise<Array<object>>} 
   *          A promise that resolves to an array of image information objects.
   */
  async fetchImageUrls(query, options, page) { // eslint-disable-line no-unused-vars
    this.emitLog('info', `Fetching images for query: "${query}" with options: ${JSON.stringify(options)}`);

    if (this.apiKey) {
      this.emitLog('info', 'API key (Consumer Key) found. Using 500px API mode.');
      
      const thumbnailSizeId = '3'; // Corresponds to 280px on the longest edge
      const previewSizeId = '2048'; // Corresponds to 2048px on the longest edge

      const params = {
        consumer_key: this.apiKey,
        term: query,
        rpp: options.maxResults || 20, // Default to 20, API max is 100
        page: options.page || 1,
        image_size: `${thumbnailSizeId},${previewSizeId}`, // Request specific image sizes
        tags: '1', // Include tags in the response
        // Other potential params: sort, exclude, license_type, etc.
      };

      const requestUrl = `${this.apiBaseUrl}/photos/search`;
      this.emitLog('debug', `500px API request URL: ${requestUrl} with params: ${JSON.stringify(params)}`);

      try {
        const response = await axios.get(requestUrl, { 
            params: params,
            timeout: options.timeout || 10000 
        });

        if (response.data && response.data.photos) {
          this.emitLog('info', `Received ${response.data.photos.length} items from 500px API.`);
          return response.data.photos.map(item => {
            const getImageUrlBySize = (sizeId) => {
              const img = item.images?.find(img => String(img.size) === String(sizeId));
              return img?.https_url || img?.url || null;
            };

            const thumbnailUrl = getImageUrlBySize(thumbnailSizeId);
            const fullSizeUrl = getImageUrlBySize(previewSizeId); // This is a large, watermarked preview

            return {
              id: item.id,
              title: item.name || 'Untitled',
              description: item.description || '',
              thumbnailUrl: thumbnailUrl,
              detailPageUrl: `https://500px.com/photo/${item.id}/${item.url?.split('/').pop() || ''}`,
              fullSizeUrl: fullSizeUrl, // Watermarked preview
              width: item.width,
              height: item.height,
              tags: item.tags_array || [],
              source: this.name,
              provider: this.name,
              originalData: item,
            };
          });
        } else {
          this.emitLog('warn', 'No photos found in 500px API response or unexpected structure.');
          return [];
        }
      } catch (error) {
        this.emitLog('error', `Error fetching images from 500px API: ${error.message}`);
        if (error.response) {
          this.emitLog('error', `API Error Details: Status ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        }
        return [];
      }
    } else {
      this.emitLog('warn', '500px provider currently only supports API mode. No API key provided.');
      return Promise.resolve([]);
    }
  }

  /**
   * Retrieves the full-size image URL (large watermarked preview).
   * 
   * @param {object} imageInfo - Object containing image details from fetchImageUrls.
   * @param {import('playwright').Page} [page] - Optional Playwright page instance (not used).
   * @returns {Promise<string|null>} A promise that resolves to the full-size image URL or null.
   */
  async getFullSizeImage(imageInfo, page) { // eslint-disable-line no-unused-vars
    this.emitLog('info', `Getting full-size image for 500px ID: ${imageInfo.id}, Title: ${imageInfo.title}`);

    if (imageInfo.fullSizeUrl) {
      // The fullSizeUrl (large watermarked preview) was already determined in fetchImageUrls
      this.emitLog('info', `Returning pre-fetched watermarked preview URL: ${imageInfo.fullSizeUrl}`);
      return Promise.resolve(imageInfo.fullSizeUrl);
    } else {
      this.emitLog('warn', 'fullSizeUrl not found in imageInfo for 500px.');
      return Promise.resolve(null);
    }
  }
}

export default Px500Provider;
