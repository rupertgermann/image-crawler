const BaseProvider = require('./base-provider.js');
// const Logger = require('../utils/logger.js'); // Use this.emitLog

class UnsplashProvider extends BaseProvider {
  constructor(config, emitter) { // Added emitter
    super(config, emitter); // Pass emitter to BaseProvider
    this.name = 'Unsplash';
    // this.apiKey = this.config.apiKey;
  }

  async initialize() {
    this.emitLog('info', 'UnsplashProvider initialized.');
    // if (!this.config.apiKey) {
    //   this.emitLog('warn', `API key not configured. Scraping may be less reliable or subject to stricter limits.`);
    // }
  }

  /**
   * Fetches image URLs from Unsplash.
   * @param {string} query - The search query.
   * @param {object} options - Additional options (e.g., maxResults).
   * @param {import('playwright').Page} page - The Playwright page instance.
   * @returns {Promise<string[]>} - A promise that resolves to an array of image URLs.
   */
  async fetchImageUrls(query, options, page) {
    const { maxResults } = options;
    const searchUrl = `https://unsplash.com/s/photos/${encodeURIComponent(query)}`;
    const imageUrls = new Set();

    this.emitLog('info', `Searching for "${query}" at ${searchUrl}`);

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: this.config.timeout || 60000 });

      const imageSelector = 'figure a[href*="/photos/"] img[srcset]';
      let scrollCount = 0;
      const maxScrolls = this.config.maxScrollsUnsplash || 15;
      let noNewImagesCount = 0;

      while (imageUrls.size < maxResults && scrollCount < maxScrolls) {
        const currentImageCount = imageUrls.size;
        const images = await page.locator(imageSelector).evaluateAll(imgs =>
          imgs.map(img => {
            const srcset = img.getAttribute('srcset');
            if (!srcset) return null;
            const sources = srcset.split(',').map(s => s.trim().split(' ')[0]);
            return sources.pop();
          }).filter(url => url)
        );

        images.forEach(url => {
          if (imageUrls.size < maxResults && url) {
            try {
              const absoluteUrl = new URL(url, page.url()).toString();
              imageUrls.add(absoluteUrl);
            } catch (e) {
              this.emitLog('warn', `Invalid URL found: ${url}`);
            }
          }
        });

        this.emitLog('info', `Scroll ${scrollCount + 1}/${maxScrolls}. Found ${imageUrls.size} unique image URLs (target: ${maxResults}).`);
        this.emitProgress({ foundCount: imageUrls.size, requestedCount: maxResults, message: `Scrolled ${scrollCount + 1} times.` });

        if (imageUrls.size >= maxResults) break;

        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await page.waitForTimeout(this.config.scrollDelayUnsplash || 2500);
        scrollCount++;

        if (imageUrls.size === currentImageCount) {
          noNewImagesCount++;
        } else {
          noNewImagesCount = 0;
        }

        if (noNewImagesCount >= (this.config.noNewImagesRetriesUnsplash || 3)) {
          this.emitLog('info', `No new images found after ${noNewImagesCount} scrolls. Stopping scroll.`);
          break;
        }
      }

    } catch (error) {
      this.emitLog('error', `Error fetching image URLs for "${query}": ${error.message}`);
    }

    this.emitLog('info', `Found a total of ${imageUrls.size} unique image URLs for "${query}".`);
    return Array.from(imageUrls).slice(0, maxResults);
  }

  /**
   * For Unsplash, the URLs extracted from srcset are usually direct image links.
   * This method can be expanded if a different strategy is needed (e.g., finding a download button).
   * @param {import('playwright').Page} page - The Playwright page instance.
   * @param {string} imageUrl - The URL of the image (potentially from srcset).
   * @returns {Promise<string>} - The full-size image URL.
   */
  async getFullSizeImage(page, imageUrl) {
    this.emitLog('debug', `getFullSizeImage called for: ${imageUrl}.`);
    try {
      const urlObj = new URL(imageUrl);
      urlObj.searchParams.delete('w');
      urlObj.searchParams.delete('h');
      urlObj.searchParams.delete('fit');
      urlObj.searchParams.delete('crop');
      const cleanedUrl = urlObj.toString();
      this.emitLog('info', `Attempting to use cleaned URL: ${cleanedUrl}`);
      return cleanedUrl;
    } catch (e) {
      this.emitLog('warn', `Could not parse or clean URL ${imageUrl}: ${e.message}`);
      return imageUrl;
    }
  }
}

module.exports = UnsplashProvider;
