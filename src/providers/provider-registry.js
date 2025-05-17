// ProviderRegistry: manages enabled providers and their order
import configManager from '../utils/config.js';

export default class ProviderRegistry {
  constructor(config) {
    this.config = config;
    this.providers = {};
    this.activeProviders = [];
  }

  async initialize() {
    // Dynamically load providers based on config
    const order = this.config.providers.order;
    for (const providerName of order) {
      if (this.config.providers[providerName]?.enabled) {
        const ProviderClass = await this.loadProviderClass(providerName);
        this.providers[providerName] = new ProviderClass(this.config);
        this.activeProviders.push(this.providers[providerName]);
      }
    }
  }

  async loadProviderClass(name) {
    switch (name) {
      case 'google': return (await import('./google-provider.js')).default;
      case 'pixabay': return (await import('./pixabay-provider.js')).default;
      case 'unsplash': return (await import('./unsplash-provider.js')).default;
      case 'pexels': return (await import('./pexels-provider.js')).default;
      case 'bing': return (await import('./bing-provider.js')).default;
      case 'flickr': return (await import('./flickr-provider.js')).default;
      case 'duckduckgo': return (await import('./duckduckgo-provider.js')).default;
      case 'freeimages': return (await import('./freeimages-provider.js')).default;
      case 'wikimedia': return (await import('./wikimedia-provider.js')).default;
      // Add more providers here
      default: throw new Error(`Unknown provider: ${name}`);
    }
  }
}
