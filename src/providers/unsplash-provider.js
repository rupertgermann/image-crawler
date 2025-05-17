import BaseProvider from './base-provider.js';
import Logger from '../utils/logger.js';

export default class UnsplashProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.name = 'Unsplash';
    // Unsplash API key can be used for more robust access if available.
    // this.apiKey = this.config.apiKey; 
  }

  async initialize() {
    Logger.info('UnsplashProvider initialized.');
    // if (!this.config.apiKey) {
    //   Logger.warn(`[${this.name}] API key not configured. Scraping may be less reliable or subject to stricter limits.`);
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

    Logger.info(`[${this.name}] Searching for "${query}" at ${searchUrl}`);

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: this.config.timeout || 60000 });

      // Handle potential pop-ups or cookie banners if Unsplash uses them
      // try {
      //   const acceptButton = await page.waitForSelector('button.accept-cookie-selector', { timeout: 3000 });
      //   await acceptButton.click();
      //   Logger.info(`[${this.name}] Clicked cookie consent button.`);
      //   await page.waitForLoadState('networkidle', { timeout: 5000 });
      // } catch (e) {
      //   Logger.debug(`[${this.name}] No cookie consent dialog found or error clicking.`);
      // }

      // Unsplash loads images as you scroll. Images are often within figure > div > img tags with srcset.
      const imageSelector = 'figure a[href*="/photos/"] img[srcset]'; // More specific selector for Unsplash structure
      let scrollCount = 0;
      const maxScrolls = this.config.maxScrollsUnsplash || 15;
      let noNewImagesCount = 0;

      while (imageUrls.size < maxResults && scrollCount < maxScrolls) {
        const currentImageCount = imageUrls.size;
        const images = await page.locator(imageSelector).evaluateAll(imgs => 
          imgs.map(img => {
            const srcset = img.getAttribute('srcset');
            if (!srcset) return null;
            // Heuristic: pick a URL from srcset, prefer larger ones if identifiable or just the last one
            const sources = srcset.split(',').map(s => s.trim().split(' ')[0]);
            return sources.pop(); // Get the last URL, often the largest listed
          }).filter(url => url)
        );

        images.forEach(url => {
          if (imageUrls.size < maxResults && url) {
            // Ensure URL is absolute
            try {
                const absoluteUrl = new URL(url, page.url()).toString();
                imageUrls.add(absoluteUrl);
            } catch (e) {
                Logger.warn(`[${this.name}] Invalid URL found: ${url}`);
            }
          }
        });

        Logger.info(`[${this.name}] Scroll ${scrollCount + 1}/${maxScrolls}. Found ${imageUrls.size} unique image URLs (target: ${maxResults}).`);
        if (imageUrls.size >= maxResults) break;

        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await page.waitForTimeout(this.config.scrollDelayUnsplash || 2500); // Unsplash might need a bit more time
        scrollCount++;

        if (imageUrls.size === currentImageCount) {
          noNewImagesCount++;
        } else {
          noNewImagesCount = 0;
        }

        if (noNewImagesCount >= (this.config.noNewImagesRetriesUnsplash || 3)) {
          Logger.info(`[${this.name}] No new images found after ${noNewImagesCount} scrolls. Stopping scroll.`);
          break;
        }
      }

    } catch (error) {
      Logger.error(`[${this.name}] Error fetching image URLs for "${query}": ${error.message}`);
      Logger.debug(error.stack);
    }
    
    Logger.info(`[${this.name}] Found a total of ${imageUrls.size} unique image URLs for "${query}".`);
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
    // The imageUrl from fetchImageUrls (via srcset) is typically already a good candidate.
    // Unsplash URLs often have query parameters like ?ixlib=rb-4.0.3&...&w=WIDTH&fit=max&fm=jpg&q=QUALITY
    // We can try to remove or adjust these to get the highest quality, or trust the largest from srcset.
    Logger.debug(`[${this.name}] getFullSizeImage called for: ${imageUrl}.`);
    
    // Example: try to strip some common resizing parameters to get a more 'raw' version
    // This is a heuristic and might need adjustment based on Unsplash's current URL structure.
    try {
      const urlObj = new URL(imageUrl);
      urlObj.searchParams.delete('w');
      urlObj.searchParams.delete('h');
      urlObj.searchParams.delete('fit');
      urlObj.searchParams.delete('crop');
      // urlObj.searchParams.set('fm', 'jpg'); // or 'png' if preferred and available
      // urlObj.searchParams.set('q', '90'); // Set quality if desired
      const cleanedUrl = urlObj.toString();
      Logger.info(`[${this.name}] Attempting to use cleaned URL: ${cleanedUrl}`);
      return cleanedUrl;
    } catch (e) {
      Logger.warn(`[${this.name}] Could not parse or clean URL ${imageUrl}: ${e.message}`);
      return imageUrl; // Return original on error
    }
  }
}
