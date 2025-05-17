import BaseProvider from './base-provider.js';
import Logger from '../utils/logger.js';

export default class BingProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.baseUrl = 'https://www.bing.com/images/search';
    this.name = 'Bing'; // For logging
  }

  async initialize() {
    Logger.info('BingProvider initialized.');
  }

  /**
   * Fetches image URLs from Bing Images.
   * @param {string} query - The search query.
   * @param {object} options - Additional options (e.g., maxResults).
   * @param {import('playwright').Page} page - The Playwright page instance.
   * @returns {Promise<string[]>} - A promise that resolves to an array of thumbnail/preview image URLs.
   */
  async fetchImageUrls(query, options, page) {
    const { maxResults } = options;
    const searchUrl = `${this.baseUrl}?q=${encodeURIComponent(query)}&form=HDRSC2&first=1&tsc=ImageBasicHover&safesearch=strict`;
    const imageUrls = new Set();

    Logger.info(`[${this.name}] Searching for "${query}" at ${searchUrl}`);

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: this.config.timeout || 60000 });

      // Handle cookie consent if present (selectors might need adjustment)
      try {
        const consentSelectors = [
          '#bnp_btn_accept',
          'button[aria-label="Accept"]',
          'button:has-text("Accept all")' 
        ];
        for (const selector of consentSelectors) {
            const button = page.locator(selector);
            if (await button.isVisible({ timeout: 2000 })) {
                await button.click({ timeout: 3000 });
                Logger.info(`[${this.name}] Clicked cookie consent button (${selector}).`);
                await page.waitForLoadState('networkidle', { timeout: 5000 });
                break;
            }
        }
      } catch (e) {
        Logger.debug(`[${this.name}] No cookie consent dialog found or error clicking: ${e.message}`);
      }

      let scrollCount = 0;
      const maxScrolls = this.config.maxScrollsBing || 15;
      let noNewImagesCount = 0;
      const imageThumbnailSelector = 'a.iusc'; // Links surrounding image thumbnails

      while (imageUrls.size < maxResults && scrollCount < maxScrolls) {
        const currentImageCount = imageUrls.size;
        const thumbnailLinks = await page.locator(imageThumbnailSelector).evaluateAll(nodes =>
          nodes.map(node => {
            // Extract the murl which contains data about the image, including its URL
            const mAttribute = node.getAttribute('m');
            if (mAttribute) {
              try {
                const mData = JSON.parse(mAttribute);
                return mData.murl; // murl is often the direct preview image URL
              } catch (e) { /* Logger.debug(`Failed to parse m attribute: ${mAttribute}`); */ }
            }
            // Fallback if murl is not found or parsing fails
            const imgElement = node.querySelector('img');
            return imgElement ? (imgElement.getAttribute('src') || imgElement.getAttribute('data-src')) : null;
          }).filter(url => url && url.startsWith('http'))
        );

        thumbnailLinks.forEach(url => {
          if (imageUrls.size < maxResults) {
            imageUrls.add(url);
          }
        });

        Logger.info(`[${this.name}] Scroll ${scrollCount + 1}/${maxScrolls}. Found ${imageUrls.size} unique image URLs (target: ${maxResults}).`);
        if (imageUrls.size >= maxResults) break;

        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await page.waitForTimeout(this.config.scrollDelayBing || 2000);
        scrollCount++;

        // Bing might have a 'See more images' button or similar if not infinite scroll
        // const loadMoreButton = page.locator('selector-for-load-more');
        // if (await loadMoreButton.isVisible()) { ... }

        if (imageUrls.size === currentImageCount) {
          noNewImagesCount++;
        } else {
          noNewImagesCount = 0;
        }

        if (noNewImagesCount >= (this.config.noNewImagesRetriesBing || 3)) {
          Logger.info(`[${this.name}] No new images found after ${noNewImagesCount} scrolls. Stopping scroll.`);
          break;
        }
      }
    } catch (error) {
      Logger.error(`[${this.name}] Error fetching image URLs for "${query}": ${error.message}`);
      Logger.debug(error.stack);
    }

    Logger.info(`[${this.name}] Found a total of ${imageUrls.size} unique image preview URLs for "${query}".`);
    return Array.from(imageUrls).slice(0, maxResults);
  }

  /**
   * For Bing, this usually means clicking a thumbnail to open the image viewer/lightbox
   * and then extracting the source of the main image displayed there.
   * @param {import('playwright').Page} page - The Playwright page instance.
   * @param {string} previewImageUrl - The URL of the preview/thumbnail image (or from 'murl').
   * @returns {Promise<string|null>} - The full-size image URL, or null if not found.
   */
  async getFullSizeImage(page, previewImageUrl) {
    Logger.debug(`[${this.name}] Attempting to get full-size image for: ${previewImageUrl}`);
    try {
      // Find the 'a.iusc' link that contains the previewImageUrl in its 'm' attribute or its img child's src
      // This is a bit complex as previewImageUrl might be the 'murl' or a direct 'src'.
      const targetLinkLocator = page.locator(`a.iusc:has(img[src="${previewImageUrl}"]), a.iusc[m*="${previewImageUrl}"]`).first();
      
      if (!await targetLinkLocator.isVisible({timeout: 5000})) {
        Logger.warn(`[${this.name}] Thumbnail link for ${previewImageUrl} not found or not visible. Returning preview URL.`);
        return previewImageUrl;
      }

      await targetLinkLocator.click({ timeout: 5000 });
      // Wait for the lightbox/image viewer to appear and the main image to load
      // Common selectors for Bing's lightbox image. These can change.
      const lightboxImageSelectors = [
        '#iv_stage img#mainImage', // Main image in the lightbox
        '.ivg_img.loaded',         // Another possible selector for the loaded image in viewer
        'img.nofocus'              // General image that might be the one in focus
      ];

      await page.waitForTimeout(this.config.lightboxDelayBing || 1500); // Give lightbox time to animate/load

      for (const selector of lightboxImageSelectors) {
        const imgElement = page.locator(selector).first();
        if (await imgElement.isVisible({timeout: 2000})) {
          const fullSizeUrl = await imgElement.getAttribute('src');
          if (fullSizeUrl && fullSizeUrl.startsWith('http')) {
            Logger.info(`[${this.name}] Extracted full-size image URL: ${fullSizeUrl}`);
            // Click close button of lightbox to be ready for next one if applicable
            // const closeButton = page.locator('#iv_close'); // Or other selector
            // if (await closeButton.isVisible({timeout:500})) await closeButton.click();
            return fullSizeUrl;
          }
        }
      }
      Logger.warn(`[${this.name}] Could not find full-size image in lightbox for ${previewImageUrl}. Using preview URL.`);
      return previewImageUrl; // Fallback
    } catch (error) {
      Logger.error(`[${this.name}] Error getting full-size image for ${previewImageUrl}: ${error.message}`);
      Logger.debug(error.stack);
      return previewImageUrl; // Fallback to the preview URL on error
    }
  }
}
