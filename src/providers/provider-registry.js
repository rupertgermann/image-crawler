// ProviderRegistry: manages enabled providers and their order
import configManager from '../utils/config.js';

class ProviderRegistry {
  constructor() { // No need to pass config here, will get from configManager
    this.providers = {};
    this.activeProviders = [];
  }

  /**
   * Initialize the provider registry
   * @param {Object} crawlerInstance - The crawler instance to use as event emitter
   */
  async initialize(crawlerInstance) {
    // Dynamically load providers based on effective config (CLI overrides + file config)
    const effectiveProvidersConfig = configManager.getEffectiveProvidersConfig();
    const order = effectiveProvidersConfig.order || [];

    for (const providerName of order) {
      if (effectiveProvidersConfig[providerName]?.enabled) {
        try {
          const ProviderClass = await this.loadProviderClass(providerName);
          // Pass both the provider's config and the crawler instance as emitter
          this.providers[providerName] = new ProviderClass(
            effectiveProvidersConfig[providerName],
            crawlerInstance
          );
          this.activeProviders.push(this.providers[providerName]);
        } catch (error) {
          const errorMsg = `Failed to load provider ${providerName}: ${error.message}`;
          if (crawlerInstance && crawlerInstance.emit) {
            crawlerInstance.emit('log', 'error', errorMsg);
          } else {
            console.warn(errorMsg);
          }
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
        case 'stocksnap': module = await import('./stocksnap-provider.js'); break;
        case 'freerangestock': module = await import('./freerangestock-provider.js'); break;
        case 'publicdomainpictures': module = await import('./publicdomainpictures-provider.js'); break;
        case 'reshot': module = await import('./reshot-provider.js'); break;
        case 'shutterstock': module = await import('./shutterstock-provider.js'); break;
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
