// BaseProvider: defines the interface and common utilities for all image providers
export default class BaseProvider {
  constructor(config) {
    this.config = config;
  }

  async initialize() {}
  async search(query, options) { throw new Error('search() must be implemented by subclass'); }
  async getImageUrls() { throw new Error('getImageUrls() must be implemented by subclass'); }
  async downloadImages(urls, options) { throw new Error('downloadImages() must be implemented by subclass'); }

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
