import BaseProvider from './base-provider.js';
import Logger from '../utils/logger.js';

export default class PixabayProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.name = 'Pixabay';
    // An API key is highly recommended for Pixabay for stability and better limits.
    // this.apiKey = this.config.apiKey; 
  }

  async initialize() {
    Logger.info('PixabayProvider initialized.');
    if (!this.config.apiKey) {
      Logger.warn(`[${this.name}] API key not configured. Scraping may be less reliable. Consider adding PIXABAY_API_KEY.`);
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
    const imageUrls = new Set();

    Logger.info(`[${this.name}] Searching for "${query}" at ${searchUrl}`);

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: this.config.timeout || 60000 });

      // Pixabay might show a cookie banner or other overlays
      // Add selectors here if needed, e.g.:
      // try {
      //   const acceptButton = await page.waitForSelector('button.accept-button-selector', { timeout: 3000 });
      //   await acceptButton.click();
      //   Logger.info(`[${this.name}] Clicked cookie consent button.`);
      //   await page.waitForLoadState('networkidle', { timeout: 5000 });
      // } catch (e) {
      //   Logger.debug(`[${this.name}] No cookie consent dialog found or error clicking.`);
      // }

      const imageLinksSelector = 'div.item > a'; // Links to image detail pages
      let scrollCount = 0;
      const maxScrolls = this.config.maxScrollsPixabay || 10;

      while (imageUrls.size < maxResults && scrollCount < maxScrolls) {
        const links = await page.locator(imageLinksSelector).evaluateAll(nodes => 
            nodes.map(n => n.href).filter(href => href)
        );
        links.forEach(link => {
          if (imageUrls.size < maxResults) {
            imageUrls.add(link); // These are links to detail pages
          }
        });

        Logger.info(`[${this.name}] Scroll ${scrollCount + 1}/${maxScrolls}. Found ${imageUrls.size} image detail URLs (target: ${maxResults}).`);
        if (imageUrls.size >= maxResults) break;

        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await page.waitForTimeout(this.config.scrollDelay || 2000);
        scrollCount++;

        // Check if a 'Load more' button exists, if Pixabay uses one
        // const loadMoreButton = page.locator('button.load-more-selector');
        // if (await loadMoreButton.isVisible()) {
        //   Logger.info(`[${this.name}] Clicking 'Load More' button.`);
        //   await loadMoreButton.click();
        //   await page.waitForTimeout(this.config.scrollDelay || 3000);
        // } else if (links.length === 0 && scrollCount > 1) {
        //    Logger.info(`[${this.name}] No new images found and no 'Load More' button. Stopping scroll.`);
        //    break;
        // }
      }

    } catch (error) {
      Logger.error(`[${this.name}] Error fetching image URLs for "${query}": ${error.message}`);
      Logger.debug(error.stack);
      // Do not throw, return what was found
    }
    
    Logger.info(`[${this.name}] Found a total of ${imageUrls.size} unique image detail page URLs for "${query}".`);
    return Array.from(imageUrls).slice(0, maxResults); // Return detail page URLs
  }

  /**
   * Navigates to a Pixabay image detail page and extracts the full-size image URL.
   * @param {import('playwright').Page} page - The Playwright page instance.
   * @param {string} detailPageUrl - The URL of the image detail page.
   * @returns {Promise<string|null>} - The full-size image URL, or null if not found.
   */
  async getFullSizeImage(page, detailPageUrl) {
    Logger.debug(`[${this.name}] Getting full-size image from detail page: ${detailPageUrl}`);
    try {
      await page.goto(detailPageUrl, { waitUntil: 'networkidle', timeout: this.config.timeout || 60000 });
      
      // Common selectors for the main image or download button on Pixabay detail page
      // Adjust these selectors based on Pixabay's current HTML structure.
      const imageSelectors = [
        'img[srcset*="__large"]', // Often a good indicator for a large image
        'div.media_wrapper img', // A common wrapper
        'a[href*="/download/"]', // A download link might exist
        'picture > source[srcset]', // Check picture element
        'img[src*="pixabay.com/get/"]' // Direct image links from Pixabay sometimes follow this pattern
      ];

      for (const selector of imageSelectors) {
        const element = page.locator(selector).first();
        if (await element.isVisible({timeout:1000})) {
          if (element.getByRole('link')) { // If it's an <a> tag (download link)
             const href = await element.getAttribute('href');
             if (href) {
                // If it's a relative download link, make it absolute
                const fullUrl = new URL(href, page.url()).toString();
                Logger.info(`[${this.name}] Found download link: ${fullUrl}`);
                // This might lead to another page or direct download. For now, assume it is the direct file or leads to it.
                // Further navigation might be needed if it's not a direct image link.
                return fullUrl; 
             }
          } else { // If it's an <img> or <source> tag
            let imageUrl = await element.getAttribute('src') || await element.getAttribute('srcset');
            if (imageUrl) {
              // If srcset, take the largest or first one
              if (imageUrl.includes(',')) imageUrl = imageUrl.split(',').pop().trim().split(' ')[0];
              const fullUrl = new URL(imageUrl, page.url()).toString();
              Logger.info(`[${this.name}] Found full-size image source: ${fullUrl}`);
              return fullUrl;
            }
          }
        }
      }
      Logger.warn(`[${this.name}] Could not find a definitive full-size image URL on ${detailPageUrl}. Using detail page URL as fallback.`);
      return detailPageUrl; // Fallback to detail page URL if specific high-res not found
    } catch (error) {
      Logger.error(`[${this.name}] Error getting full-size image from ${detailPageUrl}: ${error.message}`);
      Logger.debug(error.stack);
      return detailPageUrl; // Fallback to the preview URL on error
    }
  }
}
