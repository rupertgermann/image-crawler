// ProviderRegistry: manages enabled providers and their order
import configManager from '../utils/config.js';

export default class ProviderRegistry {
  constructor() { // No need to pass config here, will get from configManager
    this.providers = {};
    this.activeProviders = [];
  }

  async initialize() {
    // Dynamically load providers based on effective config (CLI overrides + file config)
    const effectiveProvidersConfig = configManager.getEffectiveProvidersConfig();
    const order = effectiveProvidersConfig.order || [];

    for (const providerName of order) {
      if (effectiveProvidersConfig[providerName]?.enabled) {
        try {
          const ProviderClass = await this.loadProviderClass(providerName);
          // Pass the specific provider's config part to its constructor
          this.providers[providerName] = new ProviderClass(effectiveProvidersConfig[providerName]); 
          this.activeProviders.push(this.providers[providerName]);
        } catch (error) {
            console.warn(`Failed to load provider ${providerName}: ${error.message}`);
            // Optionally, re-throw or log more verbosely
        }
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

  getActiveProviders() {
    return this.activeProviders;
  }

  getProvider(name) {
    return this.providers[name];
  }
}
