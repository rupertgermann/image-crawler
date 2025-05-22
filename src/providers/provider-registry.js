// ProviderRegistry: manages enabled providers and their order
import configManager from '../utils/config.js';

class ProviderRegistry {
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
    // Use dynamic imports for ES modules
    try {
      let module;
      switch (name) {
        case 'google': module = await import('./google-provider.js'); break;
        case 'pixabay': module = await import('./pixabay-provider.js'); break;
        case 'unsplash': module = await import('./unsplash-provider.js'); break;
        case 'pexels': module = await import('./pexels-provider.js'); break;
        case 'bing': module = await import('./bing-provider.js'); break;
        case 'flickr': module = await import('./flickr-provider.js'); break;
        case 'duckduckgo': module = await import('./duckduckgo-provider.js'); break;
        case 'freeimages': module = await import('./freeimages-provider.js'); break;
        case 'wikimedia': module = await import('./wikimedia-provider.js'); break;
        default: throw new Error(`Unknown provider: ${name}`);
      }
      return module.default; // Return the default export from the module
    } catch (error) {
      console.error(`Error loading provider ${name}:`, error);
      throw error; // Re-throw to be handled by the caller
    }
  }

  getActiveProviders() {
    return this.activeProviders;
  }

  getProvider(name) {
    return this.providers[name];
  }
}

export default ProviderRegistry;
