import BaseProvider from './base-provider.js';
import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';
import Logger from '../utils/logger.js';

// Wikimedia Commons provider using their public API
export default class WikimediaProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.baseUrl = 'https://commons.wikimedia.org/w/api.php';
  }

  async search(query, options = {}) {
    // API: action=query&generator=search&gsrnamespace=6&gsrsearch={query}&gsrlimit=30&prop=imageinfo&iiprop=url&format=json
    const url = `${this.baseUrl}?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${options.maxResults||30}&prop=imageinfo&iiprop=url&format=json&origin=*`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Wikimedia API error: ${response.status}`);
    const data = await response.json();
    this.images = [];
    if (data.query && data.query.pages) {
      for (const pageId of Object.keys(data.query.pages)) {
        const page = data.query.pages[pageId];
        if (page.imageinfo && page.imageinfo.length > 0) {
          this.images.push(page.imageinfo[0].url);
        }
      }
    }
    return this.images;
  }

  async getImageUrls() {
    return this.images || [];
  }

  async downloadImages(urls, options = {}) {
    const outputDir = options.outputDir || '.';
    let count = 0;
    for (const url of urls) {
      const fileName = `wikimedia_${path.basename(url).split('?')[0]}`;
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
        Logger.info(`Wikimedia: Downloaded ${url} -> ${outPath}`);
        count++;
      } catch (err) {
        Logger.warn(`Wikimedia: Failed to download ${url}: ${err.message}`);
      }
    }
    return count;
  }
}
