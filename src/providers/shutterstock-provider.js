// src/providers/shutterstock-provider.js
import BaseProvider from './base-provider.js';

class ShutterstockProvider extends BaseProvider {
    constructor(config, emitter) {
        super(config, emitter);
        this.providerName = 'Shutterstock';
        this.apiKey = config.apiKey || process.env.SHUTTERSTOCK_API_KEY;

        if (this.apiKey) {
            this.emitLog('info', `${this.providerName}: API key found. Note: Full API download not yet implemented; will use preview scraping.`);
        } else {
            this.emitLog('info', `${this.providerName}: API key not found. Operating in preview scraping mode.`);
        }
    }

    async fetchImageUrls(query, options = {}, page) {
        // For now, always use scraping for previews, even if API key is present.
        // API implementation for fetching image lists can be added later.
        if (!page) {
            this.emitLog('error', 'Page object is required but was not provided');
            throw new Error('Page object is required for Shutterstock provider');
        }
        return this._scrapeFetchImageUrls(query, page, options);
    }

    async _scrapeFetchImageUrls(query, page, options = {}) {
        const maxResults = options.maxResults || this.config.maxResults || 30;
        this.emitLog('info', `Scraping ${this.providerName} for query: "${query}" (max: ${maxResults})`);
        const imageUrls = [];

        try {
            const searchUrl = `https://www.shutterstock.com/search?searchterm=${encodeURIComponent(query)}`;
            this.emitLog('info', `Navigating to ${searchUrl}`);
            await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });

            // Selector for image containers/links. This is a best guess and might need frequent updates.
            // Shutterstock uses complex, often dynamic, class names. Looking for 'a' tags with 'img' inside.
            const imageLinkSelector = 'a[href*="/image-photo/"], a[href*="/image-vector/"]';
            await page.waitForSelector(imageLinkSelector, { timeout: 25000 });
            const imageElements = await page.$$(imageLinkSelector);
            this.emitLog('info', `Found ${imageElements.length} potential image links on ${this.providerName} search page.`);

            for (let i = 0; i < imageElements.length; i++) {
                if (imageUrls.length >= maxResults) break;
                const element = imageElements[i];
                let detailPageUrl = await element.getAttribute('href');

                if (!detailPageUrl || !(detailPageUrl.includes('/image-photo/') || detailPageUrl.includes('/image-vector/'))) {
                    continue; // Skip if not a valid detail page link
                }
                if (!detailPageUrl.startsWith('http')) {
                    detailPageUrl = `https://www.shutterstock.com${detailPageUrl}`;
                }

                // Check for duplicates based on detailPageUrl
                if (imageUrls.some(img => img.detailPageUrl === detailPageUrl)) {
                    continue;
                }

                const imgElement = await element.$('img');
                const thumbnailUrl = imgElement ? await imgElement.getAttribute('src') : null;
                let title = imgElement ? (await imgElement.getAttribute('alt') || await imgElement.getAttribute('title')) : '';

                if (!title) {
                    const urlParts = detailPageUrl.split('/');
                    const slug = urlParts.find(part => part.match(/^[^\d\W]+(?:-[^\d\W]+)*-\d+$/));
                    if (slug) {
                        title = slug.substring(0, slug.lastIndexOf('-')).replace(/-/g, ' ');
                    }
                }
                title = title || query;

                if (thumbnailUrl) {
                    const idPart = detailPageUrl.substring(detailPageUrl.lastIndexOf('-') + 1);
                    imageUrls.push({
                        id: idPart || Date.now().toString(),
                        url: detailPageUrl, // This is the detail page URL for getFullSizeImage
                        thumbnailUrl: thumbnailUrl,
                        title: title,
                        provider: this.providerName,
                        detailPageUrl: detailPageUrl
                    });
                }
            }
            this.emitLog('info', `Collected ${imageUrls.length} unique image results from ${this.providerName} scraping.`);
            return imageUrls.slice(0, maxResults);

        } catch (error) {
            this.emitLog('error', `Error scraping ${this.providerName}: ${error.message}`, error);
            return [];
        }
    }

    async getFullSizeImage(imageInfo, page, options = {}) {
        // API implementation for non-watermarked image can be added here if key is valid.
        // For now, always scrape the preview.
        return this._scrapeGetFullSizeImage(imageInfo, page, options);
    }

    async _scrapeGetFullSizeImage(imageInfo, page, options = {}) {
        if (!imageInfo.detailPageUrl) {
            this.emitLog('warn', `${this.providerName}: No detail page URL for image ID ${imageInfo.id}.`);
            return super.getFullSizeImage(imageInfo, page, options); // Fallback
        }
        this.emitLog('info', `Scraping ${this.providerName} detail page for preview: ${imageInfo.detailPageUrl}`);
        try {
            await page.goto(imageInfo.detailPageUrl, { waitUntil: 'networkidle', timeout: 60000 });

            // Selector for the main preview image. Shutterstock often uses specific attributes or class structures.
            // Try to find a prominent image, possibly with 'preview' in its class or alt text.
            // This selector is a best guess: 'img[data-automation="asset-preview-image"]' was a previous good one.
            // Or look for an image with a src attribute pointing to their image CDN like 'image-assets.shutterstock.com'
            const candidateSelectors = [
                'img[data-automation="asset-preview-image"]',
                'img[alt*="stock photo" i]',
                'img[alt*="royalty-free" i]',
                'img[src*="image-assets.shutterstock.com/image-photo"]',
                'img[src*="image-assets.shutterstock.com/image-vector"]'
            ];
            
            let imgElement = null;
            for (const selector of candidateSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 3000 }); // Short timeout for each try
                    imgElement = await page.$(selector);
                    if (imgElement) break;
                } catch (e) {
                    // Selector not found, try next
                }
            }

            if (imgElement) {
                const fullImageUrl = await imgElement.getAttribute('src');
                if (fullImageUrl) {
                    this.emitLog('info', `Found ${this.providerName} preview image URL: ${fullImageUrl}`);
                    const updatedImageInfo = { ...imageInfo, url: fullImageUrl };
                    return await super.getFullSizeImage(updatedImageInfo, page, options);
                }
            }

            this.emitLog('warn', `Could not find preview image on ${this.providerName} detail page: ${imageInfo.detailPageUrl}`);
            return null;
        } catch (error) {
            this.emitLog('error', `Error scraping ${this.providerName} detail page ${imageInfo.detailPageUrl}: ${error.message}`, error);
            return null;
        }
    }
}

export default ShutterstockProvider;
