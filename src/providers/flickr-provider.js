import BaseProvider from './base-provider.js';
import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';
import Logger from '../utils/logger.js';

// Simple Flickr provider using the public Flickr API (requires API key)
export default class FlickrProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.apiKey = config.flickrApiKey || process.env.FLICKR_API_KEY;
    this.baseUrl = 'https://www.flickr.com/services/rest/';
  }

  async search(query, options = {}) {
    if (!this.apiKey) throw new Error('Flickr API key required');
    const url = `${this.baseUrl}?method=flickr.photos.search&api_key=${this.apiKey}&text=${encodeURIComponent(query)}&format=json&nojsoncallback=1&per_page=${options.maxResults||30}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Flickr API error: ${response.status}`);
    const data = await response.json();
    this.photos = data.photos && data.photos.photo ? data.photos.photo : [];
    return this.photos;
  }

  async getImageUrls() {
    return (this.photos || []).map(photo => {
      return `https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`;
    });
  }

  async downloadImages(urls, options = {}) {
    const outputDir = options.outputDir || '.';
    let count = 0;
    for (const url of urls) {
      const fileName = `flickr_${path.basename(url).split('?')[0]}`;
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
        Logger.info(`Flickr: Downloaded ${url} -> ${outPath}`);
        count++;
      } catch (err) {
        Logger.warn(`Flickr: Failed to download ${url}: ${err.message}`);
      }
    }
    return count;
  }
}
