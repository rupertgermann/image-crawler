const BaseProvider = require('./base-provider.js');
// Logger will be replaced by event emitter in PlaywrightCrawler
// const Logger = require('../utils/logger.js'); 

class PixabayProvider extends BaseProvider {
  constructor(config, emitter) { // Added emitter
    super(config, emitter); // Pass emitter to BaseProvider
    this.name = 'Pixabay';
    // this.apiKey = this.config.apiKey; // API key usage can be added later
  }

  async initialize() { // Emitter is available via this.emitter from BaseProvider
    this.emitLog('info', 'PixabayProvider initialized.');
    if (!this.config.apiKey) {
      this.emitLog('warn', `API key not configured. Scraping may be less reliable. Consider adding PIXABAY_API_KEY.`);
    }
  }

  /**
   * Fetches image URLs from Pixabay.
   * @param {string} query - The search query.
   * @param {object} options - Additional options (e.g., maxResults).
   * @param {import('playwright').Page} page - The Playwright page instance.
   * @returns {Promise<string[]>} - A promise that resolves to an array of image detail page URLs.
   */
  async fetchImageUrls(query, options, page) {
    const { maxResults } = options;
    const searchUrl = `https://pixabay.com/images/search/${encodeURIComponent(query)}/?safesearch=true`;
    const imageUrls = new Set(); // Stores detail page URLs

    this.emitLog('info', `Searching for "${query}" at ${searchUrl}`);

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: this.config.timeout || 60000 });

      const imageLinksSelector = 'div.item > a'; 
      let scrollCount = 0;
      const maxScrolls = this.config.maxScrollsPixabay || 10;

      while (imageUrls.size < maxResults && scrollCount < maxScrolls) {
        const links = await page.locator(imageLinksSelector).evaluateAll(nodes =>
          nodes.map(n => n.href).filter(href => href)
        );
        links.forEach(link => {
          if (imageUrls.size < maxResults) {
            imageUrls.add(link);
          }
        });
        
        this.emitLog('info', `Scroll ${scrollCount + 1}/${maxScrolls}. Found ${imageUrls.size} image detail URLs (target: ${maxResults}).`);
        this.emitProgress({ foundCount: imageUrls.size, requestedCount: maxResults, message: `Scrolled ${scrollCount + 1} times.` });

        if (imageUrls.size >= maxResults) break;

        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await page.waitForTimeout(this.config.scrollDelay || 2000);
        scrollCount++;
      }

    } catch (error) {
      this.emitLog('error', `Error fetching image URLs for "${query}": ${error.message}`);
      // Do not throw, return what was found
    }

    this.emitLog('info', `Found a total of ${imageUrls.size} unique image detail page URLs for "${query}".`);
    return Array.from(imageUrls).slice(0, maxResults);
  }

  /**
   * Navigates to a Pixabay image detail page and extracts the full-size image URL.
   * @param {import('playwright').Page} page - The Playwright page instance.
   * @param {string} detailPageUrl - The URL of the image detail page.
   * @returns {Promise<string|null>} - The full-size image URL, or null if not found.
   */
  async getFullSizeImage(page, detailPageUrl) {
    this.emitLog('debug', `Getting full-size image from detail page: ${detailPageUrl}`);
    try {
      await page.goto(detailPageUrl, { waitUntil: 'networkidle', timeout: this.config.timeout || 60000 });

      const imageSelectors = [
        'img[srcset*="__large"]',
        'div.media_wrapper img',
        'a[href*="/download/"]',
        'picture > source[srcset]',
        'img[src*="pixabay.com/get/"]'
      ];

      for (const selector of imageSelectors) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          if ((await element.evaluate(node => node.tagName)) === 'A') { // Check if it's an <a> tag
             const href = await element.getAttribute('href');
             if (href) {
                const fullUrl = new URL(href, page.url()).toString();
                this.emitLog('info', `Found download link: ${fullUrl}`);
                return fullUrl;
             }
          } else {
            let imageUrl = await element.getAttribute('src') || await element.getAttribute('srcset');
            if (imageUrl) {
              if (imageUrl.includes(',')) imageUrl = imageUrl.split(',').pop().trim().split(' ')[0];
              const fullUrl = new URL(imageUrl, page.url()).toString();
              this.emitLog('info', `Found full-size image source: ${fullUrl}`);
              return fullUrl;
            }
          }
        }
      }
      this.emitLog('warn', `Could not find a definitive full-size image URL on ${detailPageUrl}. Using detail page URL as fallback.`);
      return detailPageUrl;
    } catch (error) {
      this.emitLog('error', `Error getting full-size image from ${detailPageUrl}: ${error.message}`);
      return detailPageUrl;
    }
  }
}

module.exports = PixabayProvider;
