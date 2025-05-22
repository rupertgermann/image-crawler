// ProviderRegistry: manages enabled providers and their order
const configManager = require('../utils/config.js'); // Is CJS

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

  async loadProviderClass(name) { // Keep async if provider constructors are async or have async init
    // For CommonJS, require is synchronous. If providers become complex, this might need adjustment.
    // Assuming provider files will export their class as module.exports.
    switch (name) {
      case 'google': return require('./google-provider.js');
      case 'pixabay': return require('./pixabay-provider.js');
      case 'unsplash': return require('./unsplash-provider.js');
      case 'pexels': return require('./pexels-provider.js');
      case 'bing': return require('./bing-provider.js');
      case 'flickr': return require('./flickr-provider.js');
      case 'duckduckgo': return require('./duckduckgo-provider.js');
      case 'freeimages': return require('./freeimages-provider.js');
      case 'wikimedia': return require('./wikimedia-provider.js');
      // Add more providers here
      default: throw new Error(`Unknown provider: ${name}`);
    }
    // Note: The original (await import(...)).default structure implies providers might be exporting
    // `export default class ...`. If so, after converting providers to CJS, they should use
    // `module.exports = class ...`, so direct require() will work.
  }

  getActiveProviders() {
    return this.activeProviders;
  }

  getProvider(name) {
    return this.providers[name];
  }
}

module.exports = ProviderRegistry;
