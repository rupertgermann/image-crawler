// src/providers/freerangestock-provider.js
import BaseProvider from './base-provider.js';

class FreeRangeStockProvider extends BaseProvider {
    constructor(config, emitter) {
        super(config, emitter);
        this.providerName = 'FreeRangeStock';
        this.baseUrl = 'https://freerangestock.com';
    }

    async fetchImageUrls(query, options = {}, page) {
        const maxResults = options.maxResults || this.config.maxResults || 30;
        this.emitLog('info', `Fetching images from ${this.providerName} for query: "${query}"`);
        
        if (!page) {
            this.emitLog('error', 'Page object is required but was not provided');
            throw new Error('Page object is required for FreeRangeStock provider');
        }
        
        const imageUrls = [];

        try {
            const searchUrl = `${this.baseUrl}/search/${encodeURIComponent(query.toLowerCase().replace(/\s+/g, '-'))}/`;
            this.emitLog('debug', `Navigating to ${searchUrl}`);
            
            await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });
            
            // Wait for the main content to load
            await page.waitForSelector('div.photo-list', { timeout: 20000 });
            
            // Get all image elements
            const imageElements = await page.$$('div.photo-list a.photo-list__item');
            this.emitLog('info', `Found ${imageElements.length} potential images on ${this.providerName} search page`);

            for (const element of imageElements) {
                if (imageUrls.length >= maxResults) break;

                try {
                    const detailPageUrl = await element.getAttribute('href');
                    const imgElement = await element.$('img');
                    const thumbnailUrl = imgElement ? await imgElement.getAttribute('src') : null;
                    const title = imgElement ? (await imgElement.getAttribute('alt') || '').trim() : '';

                    if (detailPageUrl && thumbnailUrl) {
                        const fullDetailPageUrl = detailPageUrl.startsWith('http') ? detailPageUrl : `${this.baseUrl}${detailPageUrl}`;
                        
                        imageUrls.push({
                            id: detailPageUrl.split('/').filter(Boolean).pop() || Date.now().toString(),
                            url: fullDetailPageUrl,
                            thumbnailUrl: thumbnailUrl,
                            title: title || query,
                            provider: this.providerName,
                            detailPageUrl: fullDetailPageUrl
                        });
                    }
                } catch (error) {
                    this.emitLog('error', `Error processing image element: ${error.message}`);
                }
            }

            this.emitLog('info', `Collected ${imageUrls.length} image results from ${this.providerName}`);
            return imageUrls.slice(0, maxResults);

        } catch (error) {
            this.emitLog('error', `Error fetching images from ${this.providerName}: ${error.message}`);
            return [];
        }
    }

    async getFullSizeImage(page, imageInfo) {
        try {
            if (!imageInfo.detailPageUrl) {
                throw new Error('No detail page URL provided for full-size image');
            }

            this.emitLog('debug', `Fetching full-size image from ${imageInfo.detailPageUrl}`);
            await page.goto(imageInfo.detailPageUrl, { waitUntil: 'networkidle', timeout: 30000 });
            
            // Wait for the download button to be visible
            await page.waitForSelector('a.download-button', { timeout: 15000 });
            
            // Get the download URL (which is the full-size image)
            const downloadUrl = await page.$eval('a.download-button', a => a.href);
            
            if (!downloadUrl) {
                throw new Error('Could not find download URL for full-size image');
            }

            this.emitLog('debug', `Found full-size image URL: ${downloadUrl}`);
            return {
                ...imageInfo,
                fullSizeUrl: downloadUrl,
                width: null, // Could be extracted from page if needed
                height: null
            };

        } catch (error) {
            this.emitLog('error', `Error getting full-size image from ${this.providerName}: ${error.message}`);
            // Fallback to the detail page URL if available
            return {
                ...imageInfo,
                fullSizeUrl: imageInfo.detailPageUrl,
                error: error.message
            };
        }
    }
}

export default FreeRangeStockProvider;
