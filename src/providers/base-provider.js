// BaseProvider: defines the interface and common utilities for all image providers
class BaseProvider {
  constructor(config, emitter) { // Added emitter
    this.config = config;
    this.emitter = emitter; // Store the emitter instance (PlaywrightCrawler instance)
    this.name = 'BaseProvider'; // Should be overridden by subclasses
  }

  // Helper to emit log events via the main crawler emitter
  emitLog(level, message) {
    if (this.emitter) {
      this.emitter.emit('log', level, `[${this.name}] ${message}`);
    } else {
      // Fallback if no emitter is present (e.g., during direct testing)
      console.log(`[${this.name} - ${level.toUpperCase()}] ${message}`);
    }
  }
  
  // Helper to emit progress events via the main crawler emitter
  emitProgress(progressData) {
    if (this.emitter) {
      // Add provider name to progress data
      this.emitter.emit('progress', { provider: this.name, ...progressData });
    }
  }


  async initialize(crawlerEmitter) { // crawlerEmitter might be passed if needed for specific init logic
    // If an emitter is passed here, it's likely the crawler itself.
    // Could also rely on this.emitter set in constructor.
    this.emitLog('info', 'Provider initialized.');
  }

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

export default BaseProvider;
