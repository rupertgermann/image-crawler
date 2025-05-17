import BaseProvider from './base-provider.js';
import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';
import Logger from '../utils/logger.js';

// Simple and reliable Pexels provider using their public API
export default class PexelsProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.apiKey = config.pexelsApiKey || process.env.PEXELS_API_KEY;
    this.baseUrl = 'https://api.pexels.com/v1/search';
  }

  async search(query, options = {}) {
    if (!this.apiKey) throw new Error('Pexels API key required');
    const url = `${this.baseUrl}?query=${encodeURIComponent(query)}&per_page=${options.maxResults || 30}`;
    const response = await fetch(url, {
      headers: { Authorization: this.apiKey }
    });
    if (!response.ok) throw new Error(`Pexels API error: ${response.status}`);
    const data = await response.json();
    this.photos = data.photos || [];
    return this.photos;
  }

  async getImageUrls() {
    return (this.photos || []).map(photo => photo.src.original);
  }

  async downloadImages(urls, options = {}) {
    const outputDir = options.outputDir || '.';
    let count = 0;
    for (const url of urls) {
      const fileName = `pexels_${path.basename(url).split('?')[0]}`;
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
        Logger.info(`Pexels: Downloaded ${url} -> ${outPath}`);
        count++;
      } catch (err) {
        Logger.warn(`Pexels: Failed to download ${url}: ${err.message}`);
      }
    }
    return count;
  }
}
