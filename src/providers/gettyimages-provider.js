import axios from 'axios';
import BaseProvider from './base-provider.js';

class GettyImagesProvider extends BaseProvider {
  constructor(providerConfig, emitter) {
    super(providerConfig, emitter);
    this.apiKey = providerConfig.apiKey;
    this.name = 'GettyImages';
    this.apiBaseUrl = 'https://api.gettyimages.com/v3/search/images/creative';
    // Note: Getty Images API typically requires an Authorization: Bearer <token> header for many operations.
    // Using Api-Key directly in the header is for specific endpoints or older API versions.
    // This implementation assumes Api-Key is sufficient for the intended preview/search functionality.
    // True OAuth2 token handling would be more complex.
  }

  /**
   * Fetches image URLs from Getty Images.
   * If an API key is present, it should use the API.
   * Otherwise, it should fall back to scraping.
   * 
   * @param {string} query - The search query.
   * @param {object} options - Additional options (e.g., maxResults, page for pagination).
   * @param {import('playwright').Page} [page] - Optional Playwright page instance for scraping.
   * @returns {Promise<Array<object>>} 
   *          A promise that resolves to an array of image information objects.
   */
  async fetchImageUrls(query, options, page) { // eslint-disable-line no-unused-vars
    this.emitLog('info', `Fetching images for query: "${query}" with options: ${JSON.stringify(options)}`);

    if (this.apiKey) {
      this.emitLog('info', 'API key found. Using API mode for Getty Images.');
      const maxResults = options.maxResults || 30;
      const pageNumber = options.page || 1; // API might use page number for pagination

      const params = {
        phrase: query,
        page_size: maxResults,
        page: pageNumber,
        fields: 'id,title,display_sizes,license_model,max_dimensions',
        // Add other parameters as needed, e.g., orientation, graphical_styles, etc.
        // 'minimum_size': 'medium' // Example: to filter by size if API supports
      };

      try {
        const response = await axios.get(this.apiBaseUrl, {
          headers: {
            'Api-Key': this.apiKey,
            // 'Authorization': `Bearer ${this.oauthToken}` // If OAuth2 token was implemented
          },
          params: params,
          timeout: options.timeout || 10000,
        });

        if (response.data && response.data.images) {
          this.emitLog('info', `Received ${response.data.images.length} items from Getty Images API.`);
          return response.data.images.map(item => {
            let thumbnailUrl = null;
            let fullSizeUrl = null; // This will be a preview/comp

            if (item.display_sizes && Array.isArray(item.display_sizes)) {
              const thumbObj = item.display_sizes.find(ds => ds.name === 'thumb');
              if (thumbObj) thumbnailUrl = thumbObj.uri;

              // For fullSizeUrl, 'comp' is typically a watermarked preview.
              // Other sizes might be available depending on API version and permissions.
              const compObj = item.display_sizes.find(ds => ds.name === 'comp');
              if (compObj) fullSizeUrl = compObj.uri;
              
              // Fallback if specific names aren't found, try to get something reasonable
              if (!thumbnailUrl && item.display_sizes.length > 0) {
                // Smallest available, assuming sorted or just take the first one
                thumbnailUrl = item.display_sizes[0].uri; 
              }
              if (!fullSizeUrl && item.display_sizes.length > 0) {
                 // A larger preview if 'comp' is not found
                const medPreview = item.display_sizes.find(ds => ds.name === 'preview_1024' || ds.name === 'low_res_comp');
                if (medPreview) fullSizeUrl = medPreview.uri;
                else fullSizeUrl = item.display_sizes[item.display_sizes.length -1].uri; // largest available as fallback
              }
            }
            
            return {
              id: item.id,
              title: item.title,
              thumbnailUrl: thumbnailUrl,
              // Constructing a detail page URL as it's not directly provided for creative images in this API response format.
              detailPageUrl: `https://www.gettyimages.com/detail/photo/-/${item.id}`, 
              fullSizeUrl: fullSizeUrl, // This is the preview/comp URL to be used by getFullSizeImage
              width: item.max_dimensions?.width,
              height: item.max_dimensions?.height,
              licenseModel: item.license_model,
              source: this.name,
              provider: this.name,
              originalData: item,
            };
          });
        } else {
          this.emitLog('warn', 'No images found in Getty Images API response or unexpected structure.');
          return [];
        }
      } catch (error) {
        this.emitLog('error', `Error fetching images from Getty Images API: ${error.message}`);
        if (error.response) {
          this.emitLog('error', `API Error Details: Status ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        }
        return [];
      }
    } else {
      this.emitLog('warn', 'No API key provided for Getty Images. Scraping fallback mode is not implemented.');
      return Promise.resolve([]);
    }
  }

  /**
   * Retrieves the full-size image URL.
   * For API mode, this typically means returning a pre-fetched comp URL or similar.
   * True full-size, non-watermarked images usually require a licensing step via API.
   * 
   * @param {object} imageInfo - Object containing image details from fetchImageUrls.
   * @param {import('playwright').Page} [page] - Optional Playwright page instance for scraping.
   * @returns {Promise<string|null>} A promise that resolves to the full-size image URL or null.
   */
  async getFullSizeImage(imageInfo, page) { // eslint-disable-line no-unused-vars
    this.emitLog('info', `Getting full-size image for Getty ID: ${imageInfo.id}, Title: ${imageInfo.title}`);

    if (this.apiKey && imageInfo.fullSizeUrl) {
      // The fullSizeUrl from fetchImageUrls (comp URL) is returned.
      this.emitLog('info', `API mode: Returning pre-fetched comp/preview URL: ${imageInfo.fullSizeUrl}`);
      return Promise.resolve(imageInfo.fullSizeUrl);
    } else if (!this.apiKey && imageInfo.detailPageUrl) {
      this.emitLog('warn', 'Scraping mode for getFullSizeImage (GettyImages) is not implemented.');
      // Placeholder for future scraping logic using GenericPlaywrightProvider and gettyimages.js config
      return Promise.resolve(null);
    } else {
      this.emitLog('warn', 'Cannot get full-size image: API key not present or fullSizeUrl/detailPageUrl missing in imageInfo.');
      return Promise.resolve(null);
    }
  }
}

export default GettyImagesProvider;
