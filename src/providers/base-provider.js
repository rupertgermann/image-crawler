// BaseProvider: defines the interface and common utilities for all image providers
export default class BaseProvider {
  constructor(config) {
    this.config = config;
  }

  async initialize() {}

  /**
   * Fetches image URLs from the provider.
   * @param {string} query - The search query.
   * @param {object} options - Additional options (e.g., maxResults).
   * @param {import('playwright').Page} [playwrightPage] - Optional Playwright page instance for providers needing browser automation.
   * @returns {Promise<string[]>} - A promise that resolves to an array of image URLs.
   */
  async fetchImageUrls(query, options, playwrightPage) { // eslint-disable-line no-unused-vars
    throw new Error('fetchImageUrls() must be implemented by subclass');
  }

  // Universal: check image dimensions before downloading
  async detectImageDimensions(page, url) {
    // Try to get dimensions using HTML or network metadata
    return await page.evaluate(async (imgUrl) => {
      return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve({ width: 0, height: 0 });
        img.src = imgUrl;
      });
    }, url);
  }

  // Universal: validate image meets criteria (size, dimensions)
  async validateImageMeetsCriteria(page, url, criteria) {
    const { width, height } = await this.detectImageDimensions(page, url);
    if ((criteria.minWidth && width < criteria.minWidth) || (criteria.minHeight && height < criteria.minHeight)) {
      return false;
    }
    return true;
  }

  // Optionally overridden by provider
  async getFullSizeImage(page, previewUrl) {
    return previewUrl; // By default, return the same URL
  }
}
