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
            console.log(`[ProviderRegistry DEBUG] Attempting to import playwright config: ${modulePath} as ${fileUrl.href}`);
            const module = await import(fileUrl.href);
            if (module.default) {
              this.playwrightProviderConfigs[providerName] = module.default;
              console.log(`[ProviderRegistry DEBUG] Successfully loaded and stored config for playwright provider: ${providerName}`);
            } else {
              console.warn(`[ProviderRegistry] Config file ${file} does not have a default export.`);
            }
          } catch (importError) {
            console.error(`[ProviderRegistry] Failed to import config file ${file}: ${importError.message} - Stack: ${importError.stack}`);
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
    console.log(`[ProviderRegistry DEBUG] Playwright provider names from loaded configs: ${playwrightProviderNames.join(', ')}`);
    const apiProviderNames = ['pexels', 'flickr', 'wikimedia']; // Define API providers
    const allKnownProviderNames = [...new Set([...playwrightProviderNames, ...apiProviderNames])];
    console.log(`[ProviderRegistry DEBUG] All known provider names for initialization: ${allKnownProviderNames.join(', ')}`);

    for (const providerName of allKnownProviderNames) {
      console.log(`[ProviderRegistry DEBUG] Checking provider: ${providerName}`);
      const specificProviderConfig = providerSettings[providerName];
      console.log(`[ProviderRegistry DEBUG] Settings for ${providerName} from fullConfig.providers: ${JSON.stringify(specificProviderConfig)}`);

      if (specificProviderConfig?.enabled) {
        console.log(`[ProviderRegistry DEBUG] Provider ${providerName} is enabled. Attempting to load class.`);
        try {
          const ProviderClass = await this.loadProviderClass(providerName);
          console.log(`[ProviderRegistry DEBUG] Successfully loaded class for ${providerName}.`);
          // Pass the provider's specific config from the merged fullConfig
          // and the crawler instance as emitter
          this.providers[providerName] = new ProviderClass(
            specificProviderConfig, // This is providerSettings[providerName]
            crawlerInstance
          );
          this.activeProviders.push(this.providers[providerName]);
          console.log(`[ProviderRegistry DEBUG] Provider ${providerName} instantiated and added to activeProviders. Count: ${this.activeProviders.length}`);
        } catch (error) {
          const errorMsg = `Failed to load provider ${providerName}: ${error.message} - Stack: ${error.stack}`;
          if (crawlerInstance && crawlerInstance.emit) {
            crawlerInstance.emit('log', 'error', errorMsg);
          } else {
            console.warn(errorMsg);
          }
        }
      } else {
        console.log(`[ProviderRegistry DEBUG] Provider ${providerName} is NOT enabled or no config in providerSettings.`);
      }
    }
    console.log(`[ProviderRegistry DEBUG] Finished provider initialization loop. Active providers count: ${this.activeProviders.length}`);
  }

  async loadProviderClass(name) {
    console.log(`[ProviderRegistry DEBUG] loadProviderClass called for: ${name}`);
    // Use dynamic imports for ES modules
    try {
      // Check if it's an API-only provider first
      if (name === 'pexels') {
        console.log(`[ProviderRegistry DEBUG] Loading Pexels (API) provider class.`);
        const module = await import('./pexels-provider.js');
        return module.default;
      }
      if (name === 'flickr') {
        console.log(`[ProviderRegistry DEBUG] Loading Flickr (API) provider class.`);
        const module = await import('./flickr-provider.js');
        return module.default;
      }

      // Check if it's a Playwright provider defined in the loaded configs
      if (this.playwrightProviderConfigs[name]) {
        console.log(`[ProviderRegistry DEBUG] Found '${name}' in playwrightProviderConfigs. Creating ConfiguredProvider.`);
        // Capture the specific provider's configuration from the ProviderRegistry instance
        const specificPlaywrightConfig = this.playwrightProviderConfigs[name];
        console.log(`[ProviderRegistry DEBUG] specificPlaywrightConfig for '${name}': ${JSON.stringify(specificPlaywrightConfig).substring(0, 100)}...`);

        // Return a new class that extends GenericPlaywrightProvider
        // and is pre-configured with the specific provider's config.
        // The constructor of this ad-hoc class will receive (providerSpecificConfigFromFile, emitter)
        return class ConfiguredProvider extends GenericPlaywrightProvider {
          constructor(providerSpecificConfigFromFile, emitter) {
            console.log(`[ProviderRegistry DEBUG] Constructing ConfiguredProvider for '${name}'.`);
            // Use the captured specificPlaywrightConfig here
            super(providerSpecificConfigFromFile, emitter, specificPlaywrightConfig);
          }
        };
      }

      // Check for Wikimedia (another API/specific provider not using generic Playwright)
      // This check is placed after playwrightProviderConfigs to allow overriding wikimedia with a config if ever needed.
      if (name === 'wikimedia') {
        console.log(`[ProviderRegistry DEBUG] Loading Wikimedia (API) provider class.`);
        const module = await import('./wikimedia-provider.js');
        return module.default;
      }

      // If not found in any of the above, it's an unknown or unconfigured provider
      console.error(`[ProviderRegistry DEBUG] Unknown or unconfigured provider in loadProviderClass: ${name}`);
      throw new Error(`Unknown or unconfigured provider: ${name}`);
    } catch (error) {
      console.error(`[ProviderRegistry DEBUG] Error loading provider ${name}: ${error.message} - Stack: ${error.stack}`);
      // Attempt to emit log if possible, though emitter might not be available here
      if (this.activeProviders && this.activeProviders.length > 0 && this.activeProviders[0].emitLog) {
        this.activeProviders[0].emitLog('error', `Failed to load provider class ${name}: ${error.message}`);
      } else if (configManager.get('logging')?.level === 'debug') { // This might not work if configManager is not fully setup or if this is called before config is loaded
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
