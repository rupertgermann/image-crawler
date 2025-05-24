// ProviderRegistry: manages enabled providers and their order
import configManager from '../utils/config.js';
import { PROVIDER_CONFIGS } from './configs/provider-configs.js';
import GenericPlaywrightProvider from './generic-playwright-provider.js';

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
      // Check if it's an API-only provider first
      if (name === 'pexels') {
        const module = await import('./pexels-provider.js');
        return module.default;
      }
      if (name === 'flickr') {
        const module = await import('./flickr-provider.js');
        return module.default;
      }

      // Check if it's a Playwright provider defined in PROVIDER_CONFIGS
      if (PROVIDER_CONFIGS[name]) {
        // Return a new class that extends GenericPlaywrightProvider
        // and is pre-configured with the specific provider's config.
        // The constructor of this ad-hoc class will receive (providerSpecificConfigFromFile, emitter)
        // and it needs to pass (providerSpecificConfigFromFile, emitter, PROVIDER_CONFIGS[name]) to GenericPlaywrightProvider's constructor.
        return class ConfiguredProvider extends GenericPlaywrightProvider {
          constructor(providerSpecificConfigFromFile, emitter) {
            super(providerSpecificConfigFromFile, emitter, PROVIDER_CONFIGS[name]);
          }
        };
      }

      // Fallback for old Playwright providers during transition (optional, can be removed later)
      // This section can be removed once all providers are migrated to provider-configs.js
      let module;
      switch (name) {
        case 'google': module = await import('./google-provider.js'); break;
        case 'pixabay': module = await import('./pixabay-provider.js'); break;
        case 'unsplash': module = await import('./unsplash-provider.js'); break;
        // case 'pexels': module = await import('./pexels-provider.js'); break; // Handled above
        case 'bing': module = await import('./bing-provider.js'); break;
        // case 'flickr': module = await import('./flickr-provider.js'); break; // Handled above
        case 'duckduckgo': module = await import('./duckduckgo-provider.js'); break;
        case 'freeimages': module = await import('./freeimages-provider.js'); break;
        case 'wikimedia': module = await import('./wikimedia-provider.js'); break;
        case 'stocksnap': module = await import('./stocksnap-provider.js'); break;
        case 'freerangestock': module = await import('./freerangestock-provider.js'); break;
        case 'publicdomainpictures': module = await import('./publicdomainpictures-provider.js'); break;
        case 'reshot': module = await import('./reshot-provider.js'); break;
        case 'shutterstock': module = await import('./shutterstock-provider.js'); break;
        default: throw new Error(`Unknown or unmigrated provider: ${name}`);
      }
      this.emitLog('warn', `Loading provider ${name} using old system. Consider migrating to provider-configs.js.`);
      return module.default; // Return the default export from the module
    } catch (error) {
      console.error(`Error loading provider ${name}:`, error);
      // Attempt to emit log if possible, though emitter might not be available here
      if (this.activeProviders && this.activeProviders.length > 0 && this.activeProviders[0].emitLog) {
        this.activeProviders[0].emitLog('error', `Failed to load provider class ${name}: ${error.message}`);
      } else if (configManager.get('logging')?.level === 'debug') {
        console.error(`[ProviderRegistry] Critical error loading provider ${name}: ${error.stack}`);
      }
      throw error; // Re-throw to be handled by the caller
    }
  }

  getActiveProviders() {
    return this.activeProviders;
  }

  getProvider(name) {
    return this.providers[name];
  }

  // Helper to emit log events - this might be better placed in BaseProvider or a utility if used here
  // For now, assuming it's for logging within ProviderRegistry itself if needed.
  emitLog(level, message) {
    // Check if any provider has been initialized to use its emitter
    // This is a bit of a workaround; ideally, ProviderRegistry might get its own emitter or use a static logger.
    if (this.activeProviders && this.activeProviders.length > 0 && this.activeProviders[0].emitter) {
      this.activeProviders[0].emitter.emit('log', level, `[ProviderRegistry] ${message}`);
    } else {
      console.log(`[ProviderRegistry - ${level.toUpperCase()}] ${message}`);
    }
  }
}

export default ProviderRegistry;
