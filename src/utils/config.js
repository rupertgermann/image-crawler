import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPlatformInfo } from './platform.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default configuration
const DEFAULT_CONFIG = {
  // General settings
  maxDownloads: 100,
  minWidth: 640,
  minHeight: 480,
  minFileSize: '50KB',
  fileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  
  // Platform specific settings
  platformSpecific: {
    windows: {
      selectedDrives: ['C:\\'],
      scanNetworkDrives: false,
      defaultScanPath: process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'Pictures') : 'C:\\Pictures',
      defaultOutputDir: path.join(process.cwd(), 'downloads')
    },
    darwin: {
      defaultScanPath: path.join(process.env.HOME, 'Pictures'),
      defaultOutputDir: path.join(process.env.HOME, 'Downloads', 'image-crawler')
    },
    linux: {
      defaultScanPath: path.join(process.env.HOME, 'Pictures'),
      defaultOutputDir: path.join(process.env.HOME, 'Downloads', 'image-crawler')
    }
  },

  // Providers configuration
  providers: {
    order: [
      'google',
      'pexels',
      'bing',
      'flickr',
      'duckduckgo',
      'freeimages',
      'wikimedia',
      'pixabay',
      'unsplash'
    ],
    google: { enabled: false, maxResults: 100 },
    pexels: { enabled: true, maxResults: 30 },
    bing: {
      enabled: true,
      maxResults: 30,
      maxScrollsBing: 15,
      scrollDelayBing: 2000,
      lightboxDelayBing: 1500
    },
    flickr: { enabled: false, maxResults: 30 },
    duckduckgo: {
      enabled: true,
      maxResults: 30,
      maxScrollsDDG: 15,
      loadMoreTimeoutDDG: 10000,
      scrollDelayDDG: 2000
    },
    freeimages: {
      enabled: true,
      maxResults: 30,
      maxScrollsFreeImages: 10,
      scrollDelayFreeImages: 2500
    },
    wikimedia: { enabled: true, maxResults: 30 },
    pixabay: { enabled: true, maxResults: 30 },
    unsplash: { enabled: true, maxResults: 30 }
  }
};

class ConfigManager {
  // Make DEFAULT_CONFIG accessible if needed, e.g., via a getter or by attaching to instance/prototype
  static DEFAULT_CONFIG = DEFAULT_CONFIG; // Or this.DEFAULT_CONFIG = DEFAULT_CONFIG in constructor

  constructor() {
    this.config = null;
    this.configPath = path.join(process.cwd(), 'config.json');
    this.platform = getPlatformInfo();
    this.cliProviderOverrides = null; // Store CLI provider choices
  }

  /**
   * Initialize configuration
   */
  async init() {
    try {
      // Try to load existing config
      await this.loadConfig();
    } catch (error) {
      // If config doesn't exist, create a new one
      if (error.code === 'ENOENT') {
        await this.createDefaultConfig();
      } else {
        console.error('Error loading configuration:', error);
        throw error;
      }
    }
    return this.config;
  }

  /**
   * Load configuration from file
   */
  async loadConfig() {
    const configData = await fs.readJson(this.configPath);
    this.config = { ...DEFAULT_CONFIG, ...configData };
    return this.config;
  }

  /**
   * Create a new default configuration file
   */
  async createDefaultConfig() {
    this.config = { ...DEFAULT_CONFIG };
    
    // Set platform-specific defaults
    if (this.platform.isWindows) {
      this.config.platformSpecific.windows = {
        ...DEFAULT_CONFIG.platformSpecific.windows,
        selectedDrives: await this.detectWindowsDrives()
      };
    }
    
    // Ensure config directory exists
    await fs.ensureDir(path.dirname(this.configPath));
    await fs.writeJson(this.configPath, this.config, { spaces: 2 });
    return this.config;
  }

  /**
   * Save current configuration to file
   */
  async saveConfig() {
    await fs.writeJson(this.configPath, this.config, { spaces: 2 });
    return this.config;
  }

  /**
   * Deep merge utility for config objects
   * @param {Object} target - Target object to merge into
   * @param {...Object} sources - Source objects to merge from
   * @returns {Object} Merged object
   */
  deepMerge(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();
    
    if (source === null || typeof source !== 'object') return this.deepMerge(target, ...sources);
    
    if (target === null || typeof target !== 'object') {
      target = {};
    }
    
    Object.keys(source).forEach(key => {
      const targetValue = target[key];
      const sourceValue = source[key];
      
      if (Array.isArray(sourceValue)) {
        target[key] = Array.isArray(targetValue) ? targetValue.concat(sourceValue) : sourceValue;
      } else if (sourceValue && typeof sourceValue === 'object') {
        target[key] = this.deepMerge(
          Object.prototype.toString.call(targetValue) === '[object Object]' ? targetValue : {},
          sourceValue
        );
      } else {
        target[key] = sourceValue;
      }
    });
    
    return this.deepMerge(target, ...sources);
  }

  /**
   * Get the current configuration (deep merged with DEFAULT_CONFIG)
   */
  getConfig(overrides = {}) {
    // Always return a config with all DEFAULT_CONFIG keys
    return this.deepMerge(
      JSON.parse(JSON.stringify(DEFAULT_CONFIG)),
      this.config || {},
      overrides
    );
  }

  /**
   * Update configuration
   * @param {Object} updates - Configuration updates
   */
  async updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();
    return this.config;
  }

  /**
   * Detect available drives on Windows
   */
  async detectWindowsDrives() {
    if (!this.platform.isWindows) return [];
    
    try {
      // Use dynamic import for ES modules compatibility
      const { getWindowsDrives } = await import('./platform.js');
      return await getWindowsDrives();
    } catch (error) {
      console.error('Error detecting Windows drives:', error);
      return ['C:\\'];
    }
  }

  /**
   * Get platform-specific settings
   */
  getPlatformSettings() {
    if (this.platform.isWindows) {
      return this.config.platformSpecific.windows;
    } else if (this.platform.isMac) {
      return this.config.platformSpecific.darwin;
    } else {
      return this.config.platformSpecific.linux;
    }
  }

  /**
   * Set provider overrides from CLI arguments.
   * @param {string|null} providerArg - The --provider argument (e.g., 'google,bing' or 'all')
   */
  setCliProviderOverrides(providerArg) {
    if (!providerArg) {
      this.cliProviderOverrides = null;
      return;
    }
    if (providerArg.toLowerCase() === 'all') {
      this.cliProviderOverrides = 'all';
    } else {
      this.cliProviderOverrides = providerArg.toLowerCase().split(',').map(p => p.trim()).filter(p => p);
    }
  }

  /**
   * Get the effective provider configuration, considering CLI overrides.
   * @returns {object} Provider configuration section
   */
  getEffectiveProvidersConfig() {
    const currentConfig = this.getConfig(); // This already merges DEFAULT_CONFIG and this.config
    let effectiveProviders = currentConfig.providers;

    // Handle different types of cliProviderOverrides
    if (this.cliProviderOverrides) {
      // Case 1: 'all' - enable all providers in their original order
      if (this.cliProviderOverrides === 'all') {
        // Enable all providers in the order array
        for (const providerName of effectiveProviders.order) {
          if (effectiveProviders[providerName]) {
            effectiveProviders[providerName].enabled = true;
          }
        }
      } 
      // Case 2: Array of specific providers
      else if (Array.isArray(this.cliProviderOverrides) && this.cliProviderOverrides.length > 0) {
        // Convert CLI overrides to a partial config structure
        const cliConfigPartial = { providers: { order: [], ...currentConfig.providers } }; // Start with current provider settings

        // Disable all providers first
        for (const providerName in cliConfigPartial.providers) {
          if (providerName !== 'order' && typeof cliConfigPartial.providers[providerName] === 'object') {
            cliConfigPartial.providers[providerName].enabled = false;
          }
        }
        
        // Enable only the CLI-specified providers and set them as the order
        cliConfigPartial.providers.order = [...this.cliProviderOverrides]; // Use a copy
        
        // Now safely iterate through the array
        for (const pName of this.cliProviderOverrides) {
          if (!cliConfigPartial.providers[pName]) {
            cliConfigPartial.providers[pName] = {}; // Ensure provider config object exists
          }
          cliConfigPartial.providers[pName].enabled = true;
        }
        
        // Deep merge this partial config with the existing effectiveProviders
        effectiveProviders = this.deepMerge(JSON.parse(JSON.stringify(currentConfig.providers)), cliConfigPartial.providers);
        // Explicitly set order from CLI
        effectiveProviders.order = [...this.cliProviderOverrides];
      }
    }
    
    return effectiveProviders;
  }
}

// Create and export a singleton instance
const configManager = new ConfigManager();

// Export the singleton instance and DEFAULT_CONFIG
export default configManager;
export { DEFAULT_CONFIG };
