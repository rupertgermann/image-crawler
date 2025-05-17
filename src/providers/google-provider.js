import BaseProvider from './base-provider.js';
import Logger from '../utils/logger.js';

const GOOGLE_IMAGES_URL = 'https://www.google.com/imghp';

export default class GoogleProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.name = 'Google'; // For logging
  }

  async initialize() {
    Logger.info('GoogleProvider initialized.');
    // Any specific initialization for Google can go here
  }

  /**
   * Fetches image URLs from Google Images.
   * @param {string} query - The search query.
   * @param {object} options - Additional options (e.g., maxResults).
   * @param {import('playwright').Page} page - The Playwright page instance.
   * @returns {Promise<string[]>} - A promise that resolves to an array of image URLs.
   */
  async fetchImageUrls(query, options, page) {
    const { maxResults } = options;
    const imageUrls = new Set();
    let attempt = 0;
    const maxAttempts = 3; // Max attempts to find images if initial search yields few results

    Logger.info(`[${this.name}] Searching for "${query}"...`);

    while (imageUrls.size < maxResults && attempt < maxAttempts) {
      attempt++;
      if (attempt > 1) {
        Logger.info(`[${this.name}] Attempt ${attempt}: Trying to find more images...`);
      }
      try {
        await page.goto(`${GOOGLE_IMAGES_URL}?q=${encodeURIComponent(query)}&safe=active&hl=en`, {
          waitUntil: 'networkidle',
          timeout: this.config.timeout || 60000 
        });

        // Handle cookie consent - adjust selector if needed
        try {
          const consentButtonSelectors = [
            'button[aria-label="Accept all"]',
            'button[aria-label="Alles akzeptieren"]', // German
            'div[role="dialog"] button:nth-of-type(1)' // More generic
          ];
          for (const selector of consentButtonSelectors) {
            if (await page.isVisible(selector, {timeout: 2000} )){
              await page.click(selector, { timeout: 5000 });
              Logger.info(`[${this.name}] Clicked cookie consent button (${selector}).`);
              await page.waitForLoadState('networkidle', { timeout: 5000 });
              break;
            }
          }
        } catch (e) {
          Logger.debug(`[${this.name}] No cookie consent dialog found or error clicking: ${e.message}`);
        }

        let previousImageCount = 0;
        let noNewImagesCount = 0;
        const maxScrolls = this.config.maxScrollsGoogle || 20; // Configurable max scrolls

        for (let i = 0; i < maxScrolls && imageUrls.size < maxResults; i++) {
          const currentImageElements = await page.locator('img[data-src], img[src^="http"]');
          const foundImageUrls = await currentImageElements.evaluateAll(imgs => 
            imgs.map(img => img.dataset.src || img.src).filter(src => src && !src.startsWith('data:'))
          );

          foundImageUrls.forEach(url => {
            if (url && !url.includes('gstatic.com/images') && !url.includes('googlelogo') ) { // Filter out logos/thumbnails
                 // Basic URL validation can be added here if needed
                imageUrls.add(url);
            }
          });
          
          Logger.info(`[${this.name}] Scroll ${i + 1}/${maxScrolls}. Found ${imageUrls.size} unique images so far (target: ${maxResults}).`);

          if (imageUrls.size >= maxResults) break;

          await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
          await page.waitForTimeout(this.config.scrollDelay || 2000); // Wait for new images to load

          // Check for "Show more results" button
          const showMoreButton = page.locator('input[type="button"][value="Show more results"], input[type="button"][value="Weitere Ergebnisse anzeigen"]');
          if (await showMoreButton.isVisible()) {
            Logger.info(`[${this.name}] Clicking "Show more results" button.`);
            await showMoreButton.click();
            await page.waitForTimeout(this.config.scrollDelay || 3000); // Wait for results to load
          }

          if (imageUrls.size === previousImageCount) {
            noNewImagesCount++;
          } else {
            noNewImagesCount = 0;
          }
          previousImageCount = imageUrls.size;

          if (noNewImagesCount >= (this.config.noNewImagesRetriesGoogle || 3)) {
            Logger.info(`[${this.name}] No new images found after ${noNewImagesCount} scrolls. Stopping scroll for this attempt.`);
            break;
          }
        }

      } catch (error) {
        Logger.error(`[${this.name}] Error during attempt ${attempt} for "${query}": ${error.message}`);
        Logger.debug(error.stack);
        if (attempt >= maxAttempts) throw error; // Rethrow if max attempts reached
        await page.waitForTimeout(2000); // Wait before retrying
      }
    }

    Logger.info(`[${this.name}] Found a total of ${imageUrls.size} unique image URLs for "${query}".`);
    return Array.from(imageUrls).slice(0, maxResults);
  }

  /**
   * For Google Images, the initial URL is often the best available or leads directly to it.
   * This method can be expanded if a more complex extraction (e.g., from a lightbox) is needed.
   * @param {import('playwright').Page} page - The Playwright page instance.
   * @param {string} previewUrl - The URL of the image preview.
   * @returns {Promise<string>} - The full-size image URL.
   */
  async getFullSizeImage(page, previewUrl) {
    // For Google, often the previewUrl is good enough or directly the full image.
    // If Google starts using complex lightboxes that hide the direct URL, this method would need enhancement.
    // Example: click thumbnail, wait for lightbox, extract src from the main image in lightbox.
    // For now, we assume previewUrl is the one to use or leads directly to it.
    Logger.debug(`[${this.name}] getFullSizeImage called for: ${previewUrl}. Returning as is.`);
    return previewUrl; 
  }
}
