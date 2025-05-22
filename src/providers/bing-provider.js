import BaseProvider from './base-provider.js';
// import Logger from '../utils/logger.js';

export default class BingProvider extends BaseProvider {
  constructor(config, emitter) { // Added emitter
    super(config, emitter); // Pass emitter to BaseProvider
    this.baseUrl = 'https://www.bing.com/images/search';
    this.name = 'Bing';
  }

  async initialize() {
    this.emitLog('info', 'BingProvider initialized.');
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

    this.emitLog('info', `Searching for "${query}" at ${searchUrl}`);

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: this.config.timeout || 60000 });

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
            this.emitLog('info', `Clicked cookie consent button (${selector}).`);
            await page.waitForLoadState('networkidle', { timeout: 5000 });
            break;
          }
        }
      } catch (e) {
        this.emitLog('debug', `No cookie consent dialog found or error clicking: ${e.message}`);
      }

      let scrollCount = 0;
      const maxScrolls = this.config.maxScrollsBing || 15;
      let noNewImagesCount = 0;
      const imageThumbnailSelector = 'a.iusc';

      while (imageUrls.size < maxResults && scrollCount < maxScrolls) {
        const currentImageCount = imageUrls.size;
        const thumbnailLinks = await page.locator(imageThumbnailSelector).evaluateAll(nodes =>
          nodes.map(node => {
            const mAttribute = node.getAttribute('m');
            if (mAttribute) {
              try {
                const mData = JSON.parse(mAttribute);
                return mData.murl;
              } catch (e) { /* this.emitLog('debug', `Failed to parse m attribute: ${mAttribute}`); */ }
            }
            const imgElement = node.querySelector('img');
            return imgElement ? (imgElement.getAttribute('src') || imgElement.getAttribute('data-src')) : null;
          }).filter(url => url && url.startsWith('http'))
        );

        thumbnailLinks.forEach(url => {
          if (imageUrls.size < maxResults) {
            imageUrls.add(url);
          }
        });

        this.emitLog('info', `Scroll ${scrollCount + 1}/${maxScrolls}. Found ${imageUrls.size} unique image URLs (target: ${maxResults}).`);
        this.emitProgress({ foundCount: imageUrls.size, requestedCount: maxResults, message: `Scrolled ${scrollCount + 1} times.` });

        if (imageUrls.size >= maxResults) break;

        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await page.waitForTimeout(this.config.scrollDelayBing || 2000);
        scrollCount++;

        if (imageUrls.size === currentImageCount) {
          noNewImagesCount++;
        } else {
          noNewImagesCount = 0;
        }

        if (noNewImagesCount >= (this.config.noNewImagesRetriesBing || 3)) {
          this.emitLog('info', `No new images found after ${noNewImagesCount} scrolls. Stopping scroll.`);
          break;
        }
      }
    } catch (error) {
      this.emitLog('error', `Error fetching image URLs for "${query}": ${error.message}`);
    }

    this.emitLog('info', `Found a total of ${imageUrls.size} unique image preview URLs for "${query}".`);
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
    this.emitLog('debug', `Attempting to get full-size image for: ${previewImageUrl}`);
    try {
      const overlayIframeSelector = 'iframe#OverlayIFrame';
      const overlayFrame = page.frameLocator(overlayIframeSelector);

      if (await page.locator(overlayIframeSelector).isVisible({ timeout: 2000 })) {
        this.emitLog('info', `Overlay iframe detected. Attempting to find and click consent/close button within it.`);
        const consentButtonSelectors = [
          'button[id*="accept" i]', 'button[aria-label*="accept" i]', 'button[aria-label*="agree" i]',
          'button:has-text(/accept|agree|got it|confirm/i)', 'button[id*="close" i]', 'button[aria-label*="close" i]',
        ];
        let closedOverlay = false;
        for (const btnSelector of consentButtonSelectors) {
          const buttonInFrame = overlayFrame.locator(btnSelector).first();
          if (await buttonInFrame.isVisible({ timeout: 500 })) {
            this.emitLog('info', `Found potential consent button in iframe: ${btnSelector}. Clicking it.`);
            try {
              await buttonInFrame.click({ timeout: 3000 });
              await page.waitForTimeout(1000);
              closedOverlay = true;
              this.emitLog('info', `Clicked consent button in iframe.`);
              break;
            } catch (clickError) {
              this.emitLog('warn', `Error clicking consent button ${btnSelector} in iframe: ${clickError.message}`);
            }
          }
        }
        if (!closedOverlay) {
          this.emitLog('warn', `Overlay iframe was present, but no known consent/close button was found or successfully clicked within it.`);
        }
      }

      const targetLinkLocator = page.locator(`a.iusc:has(img[src="${previewImageUrl}"]), a.iusc[m*="${previewImageUrl}"]`).first();
      if (!await targetLinkLocator.isVisible({ timeout: 5000 })) {
        this.emitLog('warn', `Thumbnail link for ${previewImageUrl} not found or not visible. Returning preview URL.`);
        return previewImageUrl;
      }

      await targetLinkLocator.click({ timeout: 5000 });
      const lightboxImageSelectors = ['#iv_stage img#mainImage', '.ivg_img.loaded', 'img.nofocus'];
      await page.waitForTimeout(this.config.lightboxDelayBing || 1500);

      for (const selector of lightboxImageSelectors) {
        const imgElement = page.locator(selector).first();
        if (await imgElement.isVisible({ timeout: 2000 })) {
          const fullSizeUrl = await imgElement.getAttribute('src');
          if (fullSizeUrl && fullSizeUrl.startsWith('http')) {
            this.emitLog('info', `Extracted full-size image URL: ${fullSizeUrl}`);
            return fullSizeUrl;
          }
        }
      }
      this.emitLog('warn', `Could not find full-size image in lightbox for ${previewImageUrl}. Using preview URL.`);
      return previewImageUrl;
    } catch (error) {
      this.emitLog('error', `Error getting full-size image for ${previewImageUrl}: ${error.message}`);
      return previewImageUrl;
    }
  }
}


