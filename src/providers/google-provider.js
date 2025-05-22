import BaseProvider from './base-provider.js';
// Logger will be replaced by event emitter in PlaywrightCrawler
// import Logger from '../utils/logger.js'; 

const GOOGLE_IMAGES_URL = 'https://www.google.com/imghp';

class GoogleProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.name = 'Google'; // For logging via events
  }

  // Initialize method might not be strictly needed if constructor does all setup
  // or if it's called by the PlaywrightCrawler after instantiation.
  // For now, keeping it simple. If it's called, it should use this.emit from its owner (crawler).
  async initialize(crawlerEmitter) { 
    if (crawlerEmitter) {
      crawlerEmitter.emit('log', 'info', `[${this.name}] Provider initialized.`);
    } else {
      console.log(`[${this.name}] Provider initialized (no emitter).`); // Fallback
    }
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
    const maxAttempts = 3;

    this.emitLog('info', `Searching for "${query}"...`);

    while (imageUrls.size < maxResults && attempt < maxAttempts) {
      attempt++;
      if (attempt > 1) {
        this.emitLog('info', `Attempt ${attempt}: Trying to find more images...`);
      }
      try {
        await page.goto(`${GOOGLE_IMAGES_URL}?q=${encodeURIComponent(query)}&safe=active&hl=en`, {
          waitUntil: 'networkidle',
          timeout: this.config.timeout || 60000
        });

        try {
          const consentButtonSelectors = [
            'button[aria-label="Accept all"]',
            'button[aria-label="Alles akzeptieren"]',
            'div[role="dialog"] button:nth-of-type(1)'
          ];
          for (const selector of consentButtonSelectors) {
            if (await page.isVisible(selector, { timeout: 2000 })) {
              await page.click(selector, { timeout: 5000 });
              this.emitLog('info', `Clicked cookie consent button (${selector}).`);
              await page.waitForLoadState('networkidle', { timeout: 5000 });
              break;
            }
          }
        } catch (e) {
          this.emitLog('debug', `No cookie consent dialog found or error clicking: ${e.message}`);
        }

        let previousImageCount = 0;
        let noNewImagesCount = 0;
        const maxScrolls = this.config.maxScrollsGoogle || 20;

        for (let i = 0; i < maxScrolls && imageUrls.size < maxResults; i++) {
          const currentImageElements = await page.locator('img[data-src], img[src^="http"]');
          const foundImageUrls = await currentImageElements.evaluateAll(imgs =>
            imgs.map(img => img.dataset.src || img.src).filter(src => src && !src.startsWith('data:'))
          );

          foundImageUrls.forEach(url => {
            if (url && !url.includes('gstatic.com/images') && !url.includes('googlelogo')) {
              imageUrls.add(url);
            }
          });

          this.emitLog('info', `Scroll ${i + 1}/${maxScrolls}. Found ${imageUrls.size} unique images so far (target: ${maxResults}).`);
          this.emitProgress({ foundCount: imageUrls.size, requestedCount: maxResults, currentUrl: null, message: `Scrolled ${i+1} times` });


          if (imageUrls.size >= maxResults) break;

          await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
          await page.waitForTimeout(this.config.scrollDelay || 2000);

          const showMoreButton = page.locator('input[type="button"][value="Show more results"], input[type="button"][value="Weitere Ergebnisse anzeigen"]');
          if (await showMoreButton.isVisible()) {
            this.emitLog('info', `Clicking "Show more results" button.`);
            await showMoreButton.click();
            await page.waitForTimeout(this.config.scrollDelay || 3000);
          }

          if (imageUrls.size === previousImageCount) {
            noNewImagesCount++;
          } else {
            noNewImagesCount = 0;
          }
          previousImageCount = imageUrls.size;

          if (noNewImagesCount >= (this.config.noNewImagesRetriesGoogle || 3)) {
            this.emitLog('info', `No new images found after ${noNewImagesCount} scrolls. Stopping scroll for this attempt.`);
            break;
          }
        }

      } catch (error) {
        this.emitLog('error', `Error during attempt ${attempt} for "${query}": ${error.message}`);
        if (attempt >= maxAttempts) throw error;
        await page.waitForTimeout(2000);
      }
    }

    this.emitLog('info', `Found a total of ${imageUrls.size} unique image URLs for "${query}".`);
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
    this.emitLog('debug', `getFullSizeImage called for: ${previewUrl}. Returning as is for Google.`);
    return previewUrl;
  }
}

export default GoogleProvider;
