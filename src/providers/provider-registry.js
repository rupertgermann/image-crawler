// ProviderRegistry: manages enabled providers and their order
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import configManager from '../utils/config.js';
import GenericPlaywrightProvider from './generic-playwright-provider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProviderRegistry {
  constructor() { // No need to pass config here, will get from configManager
    this.providers = {};
    this.activeProviders = [];
    this.playwrightProviderConfigs = {};
  }

  /**
   * Load Playwright provider configurations from the configs/playwright directory.
   */
  async _loadPlaywrightConfigs() {
    const configsDir = path.join(__dirname, 'configs', 'playwright');
    try {
      const files = await fs.readdir(configsDir);
      for (const file of files) {
        if (file.endsWith('.js')) {
          const providerName = path.basename(file, '.js');
          const modulePath = path.join(configsDir, file);
          try {
            const fileUrl = pathToFileURL(modulePath);
            const module = await import(fileUrl.href);
            if (module.default) {
              this.playwrightProviderConfigs[providerName] = module.default;
            } else {
              console.warn(`[ProviderRegistry] Config file ${file} does not have a default export.`);
            }
          } catch (importError) {
            console.error(`[ProviderRegistry] Failed to import config file ${file}: ${importError.message}`);
          }
        }
      }
    } catch (error) {
      console.error(`[ProviderRegistry] Failed to read Playwright provider configs directory: ${error.message}`);
      // Ensure it's an empty object on failure so subsequent checks don't break
      this.playwrightProviderConfigs = {};
    }
  }

  /**
   * Initialize the provider registry
   * @param {Object} crawlerInstance - The crawler instance to use as event emitter
   */
  async initialize(crawlerInstance) {
    await this._loadPlaywrightConfigs();

    const fullConfig = configManager.getConfig(); // Get the fully merged configuration
    const providerSettings = fullConfig.providers;

    const playwrightProviderNames = Object.keys(this.playwrightProviderConfigs);
    const apiProviderNames = ['pexels', 'flickr', 'wikimedia']; // Define API providers
    const allKnownProviderNames = [...new Set([...playwrightProviderNames, ...apiProviderNames])];

    for (const providerName of allKnownProviderNames) {
      const specificProviderConfig = providerSettings[providerName];
      if (specificProviderConfig?.enabled) {
        try {
          const ProviderClass = await this.loadProviderClass(providerName);
          // Pass the provider's specific config from the merged fullConfig
          // and the crawler instance as emitter
          this.providers[providerName] = new ProviderClass(
            specificProviderConfig, // This is providerSettings[providerName]
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

      // Check if it's a Playwright provider defined in the loaded configs
      if (this.playwrightProviderConfigs[name]) {
        // Return a new class that extends GenericPlaywrightProvider
        // and is pre-configured with the specific provider's config.
        // The constructor of this ad-hoc class will receive (providerSpecificConfigFromFile, emitter)
        // and it needs to pass (providerSpecificConfigFromFile, emitter, this.playwrightProviderConfigs[name]) to GenericPlaywrightProvider's constructor.
        return class ConfiguredProvider extends GenericPlaywrightProvider {
          constructor(providerSpecificConfigFromFile, emitter) {
            super(providerSpecificConfigFromFile, emitter, this.playwrightProviderConfigs[name]);
          }
        };
      }

      // Check for Wikimedia (another API/specific provider not using generic Playwright)
      // This check is placed after playwrightProviderConfigs to allow overriding wikimedia with a config if ever needed.
      if (name === 'wikimedia') {
        const module = await import('./wikimedia-provider.js');
        return module.default;
      }

      // If not found in any of the above, it's an unknown or unconfigured provider
      throw new Error(`Unknown or unconfigured provider: ${name}`);
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

  /**
   * Returns a list of all known provider names, regardless of their enabled status.
   * This is typically used to populate UI elements like dropdowns.
   * Ensure _loadPlaywrightConfigs has been called before this.
   */
  getAllKnownProviderNames() {
    // Ensure playwrightProviderConfigs is populated, typically by calling initialize() first,
    // which calls _loadPlaywrightConfigs(). If called standalone, _loadPlaywrightConfigs might be needed.
    // For simplicity, assuming initialize() is the entry point that populates this.
    const playwrightProviderNames = Object.keys(this.playwrightProviderConfigs);
    const apiProviderNames = ['pexels', 'flickr', 'wikimedia']; // Consistent list of API providers
    // Combine, ensure uniqueness, and sort for consistent UI presentation
    return [...new Set([...playwrightProviderNames, ...apiProviderNames])].sort();
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
