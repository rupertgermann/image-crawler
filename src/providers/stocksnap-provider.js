// src/providers/stocksnap-provider.js
import BaseProvider from './base-provider.js';

class StockSnapProvider extends BaseProvider {
    constructor(config, emitter) {
        super(config, emitter);
        this.providerName = 'StockSnap';
    }

    async fetchImageUrls(query, page, options = {}) {
        const maxResults = options.maxResults || this.config.maxResults || 30;
        this.logInfo(`Fetching images from ${this.providerName} for query: "${query}" (max: ${maxResults})`);
        const imageUrls = [];

        try {
            const searchUrl = `https://stocksnap.io/search/${encodeURIComponent(query)}`;
            this.logInfo(`Navigating to ${searchUrl}`);
            await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });

            await page.waitForSelector('div.photo-grid-item img', { timeout: 20000 });
            const imageElements = await page.$$('div.photo-grid-item a');
            this.logInfo(`Found ${imageElements.length} potential image links on ${this.providerName} search page.`);

            for (let i = 0; i < imageElements.length; i++) {
                if (imageUrls.length >= maxResults) break;

                const element = imageElements[i];
                const detailPageUrlPath = await element.getAttribute('href');
                const imgElement = await element.$('img');
                const thumbnailUrl = imgElement ? await imgElement.getAttribute('src') : null;
                const titleAttr = imgElement ? await imgElement.getAttribute('alt') : '';

                if (detailPageUrlPath && thumbnailUrl) {
                    const detailPageUrl = `https://stocksnap.io${detailPageUrlPath}`;
                    imageUrls.push({
                        id: detailPageUrlPath.split('/').pop() || Date.now().toString(), // Simple ID from URL or timestamp
                        url: detailPageUrl, // This is the detail page URL for getFullSizeImage
                        thumbnailUrl: thumbnailUrl,
                        title: titleAttr || query,
                        provider: this.providerName,
                        detailPageUrl: detailPageUrl 
                    });
                }
            }
            this.logInfo(`Collected ${imageUrls.length} image results from ${this.providerName}.`);
            return imageUrls.slice(0, maxResults);

        } catch (error) {
            this.logError(`Error fetching images from ${this.providerName}: ${error.message}`, error);
            return [];
        }
    }

    async getFullSizeImage(imageInfo, page, options = {}) {
        if (!imageInfo.detailPageUrl) {
            this.logWarn(`${this.providerName}: No detail page URL for image ID ${imageInfo.id}. Attempting direct download of 'url' if available.`);
            return super.getFullSizeImage(imageInfo, page, options); // Fallback to imageInfo.url if detailPageUrl is missing
        }

        this.logInfo(`Fetching full size image from ${this.providerName} detail page: ${imageInfo.detailPageUrl}`);
        try {
            await page.goto(imageInfo.detailPageUrl, { waitUntil: 'networkidle', timeout: 60000 });
            // Selector for the main image on the detail page. StockSnap uses 'img.photo-expanded'.
            await page.waitForSelector('img.photo-expanded', { timeout: 15000 });
            const imgElement = await page.$('img.photo-expanded');

            if (imgElement) {
                const fullImageUrl = await imgElement.getAttribute('src');
                if (fullImageUrl) {
                    this.logInfo(`Found full image URL on ${this.providerName}: ${fullImageUrl}`);
                    const updatedImageInfo = { ...imageInfo, url: fullImageUrl }; // Set the direct image URL
                    return await super.getFullSizeImage(updatedImageInfo, page, options); // Use BaseProvider to download
                }
            }
            this.logWarn(`Could not find full size image on ${this.providerName} detail page: ${imageInfo.detailPageUrl}`);
            return null;
        } catch (error) {
            this.logError(`Error fetching full size image from ${this.providerName} detail page ${imageInfo.detailPageUrl}: ${error.message}`, error);
            return null;
        }
    }
}

export default StockSnapProvider;
