// src/providers/stocksnap-provider.js
import BaseProvider from './base-provider.js';

class StockSnapProvider extends BaseProvider {
    constructor(config, emitter) {
        super(config, emitter);
        this.providerName = 'StockSnap';
    }

    async fetchImageUrls(query, options = {}, page) {
        const maxResults = options.maxResults || this.config.maxResults || 30;
        this.emitLog('info', `Fetching images from ${this.providerName} for query: "${query}" (max: ${maxResults})`);
        
        if (!page) {
            this.emitLog('error', 'Page object is required but was not provided');
            throw new Error('Page object is required for StockSnap provider');
        }
        
        const imageUrls = [];

        try {
            const searchUrl = `https://stocksnap.io/search/${encodeURIComponent(query)}`;
            this.emitLog('info', `Navigating to ${searchUrl}`);
            await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });

            await page.waitForSelector('div.photo-grid-item img', { timeout: 20000 });
            const imageElements = await page.$$('div.photo-grid-item a');
            this.emitLog('info', `Found ${imageElements.length} potential image links on ${this.providerName} search page.`);

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
            this.emitLog('info', `Extracted ${imageUrls.length} unique image results from ${this.providerName}.`);
            return imageUrls.slice(0, maxResults);

        } catch (error) {
            this.emitLog('error', `Error fetching from ${this.providerName}: ${error.message}`, error);
            return [];
        }
    }

    async getFullSizeImage(imageInfo, page, options = {}) {
        if (!imageInfo.detailPageUrl) {
            this.emitLog('warn', `${this.providerName}: No detail page URL for image ID ${imageInfo.id}. Attempting direct download of 'url' if available.`);
            return super.getFullSizeImage(imageInfo, page, options); // Fallback to imageInfo.url if detailPageUrl is missing
        }

        this.emitLog('info', `Getting full-size image from ${this.providerName} for: ${imageInfo.detailPageUrl}`);
        try {
            await page.goto(imageInfo.detailPageUrl, { waitUntil: 'networkidle', timeout: 60000 });
            // Selector for the main image on the detail page. StockSnap uses 'img.photo-expanded'.
            await page.waitForSelector('img.photo-expanded', { timeout: 15000 });
            const imgElement = await page.$('img.photo-expanded');

            if (imgElement) {
                const fullImageUrl = await imgElement.getAttribute('src');
                if (fullImageUrl) {
                    this.emitLog('info', `Found full-size image URL on ${this.providerName}: ${fullImageUrl}`);
                    const updatedImageInfo = { ...imageInfo, url: fullImageUrl }; // Set the direct image URL
                    return await super.getFullSizeImage(updatedImageInfo, page, options); // Use BaseProvider to download
                }
            }
            this.emitLog('warn', `Could not find full size image on ${this.providerName} detail page: ${imageInfo.detailPageUrl}`);
            return null;
        } catch (error) {
            this.logError(`Error fetching full size image from ${this.providerName} detail page ${imageInfo.detailPageUrl}: ${error.message}`, error);
            return null;
        }
    }
}

export default StockSnapProvider;
