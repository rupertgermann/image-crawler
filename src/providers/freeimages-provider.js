import BaseProvider from './base-provider.js';
import fs from 'fs-extra';
import path from 'path';
import Logger from '../utils/logger.js';
import { chromium } from 'playwright';

// FreeImages provider using Playwright (simple grid scraping)
export default class FreeImagesProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.baseUrl = 'https://www.freeimages.com/search/';
  }

  async search(query, options = {}) {
    const url = `${this.baseUrl}${encodeURIComponent(query)}`;
    this.browser = await chromium.launch({ headless: true });
    this.page = await this.browser.newPage();
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);
    // Accept cookies if present
    try { await this.page.click('button:has-text("Accept")', { timeout: 2000 }); } catch {}
    // Scroll to load more images
    await this.page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, 1000);
        await new Promise(r => setTimeout(r, 400));
      }
    });
    await this.page.waitForTimeout(1000);
    // Get image elements
    this.imgHandles = await this.page.$$('img.MosaicAsset-module__thumb___yvFP5');
    return this.imgHandles;
  }

  async getImageUrls() {
    if (!this.imgHandles) return [];
    const urls = [];
    for (const img of this.imgHandles) {
      const src = await img.getAttribute('src');
      if (src && src.startsWith('http')) urls.push(src);
    }
    return urls;
  }

  async downloadImages(urls, options = {}) {
    const outputDir = options.outputDir || '.';
    let count = 0;
    for (const url of urls) {
      const fileName = `freeimages_${path.basename(url).split('?')[0]}`;
      const outPath = path.join(outputDir, fileName);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const stream = fs.createWriteStream(outPath);
        await new Promise((resolve, reject) => {
          res.body.pipe(stream);
          res.body.on('error', reject);
          stream.on('finish', resolve);
        });
        Logger.info(`FreeImages: Downloaded ${url} -> ${outPath}`);
        count++;
      } catch (err) {
        Logger.warn(`FreeImages: Failed to download ${url}: ${err.message}`);
      }
    }
    if (this.browser) await this.browser.close();
    return count;
  }
}
