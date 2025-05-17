import fs from 'fs-extra';
import path from 'path';
import { getPlatformInfo } from './platform.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default configuration
export const DEFAULT_CONFIG = {
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
      defaultScanPath: 'C:\\Users\\Pictures',
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
  
  // Search engines
  searchEngines: {
    google: {
      enabled: true,
      maxResults: 100,
      safeSearch: true
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
    google: { enabled: true, maxResults: 100 },
    pexels: { enabled: false, maxResults: 30 },
    bing: { 
      enabled: false, 
      maxResults: 30,
      maxScrollsBing: 15,
      scrollDelayBing: 2000,
      lightboxDelayBing: 1500 
    },
    flickr: { enabled: false, maxResults: 30 },
    duckduckgo: { 
      enabled: false, 
      maxResults: 30,
      maxScrollsDDG: 15,
      loadMoreTimeoutDDG: 10000,
      scrollDelayDDG: 2000
    },
    freeimages: { 
      enabled: false, 
      maxResults: 30,
      maxScrollsFreeImages: 10,
      scrollDelayFreeImages: 2500
    },
    wikimedia: { enabled: false, maxResults: 30 },
    pixabay: { enabled: false, maxResults: 30 },
    unsplash: { enabled: false, maxResults: 30 }
  }
};

class ConfigManager {
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
    const baseProvidersConfig = { ...this.getConfig().providers }; // Deep copy might be needed if mutable

    if (this.cliProviderOverrides === 'all') {
      // Enable all providers in the order array
      baseProvidersConfig.order.forEach(providerName => {
        if (baseProvidersConfig[providerName]) {
          baseProvidersConfig[providerName].enabled = true;
        } else {
          // Handle case where a provider in 'order' might not have a config block
          baseProvidersConfig[providerName] = { enabled: true, maxResults: DEFAULT_CONFIG.providers[providerName]?.maxResults || 30 };
        }
      });
    } else if (Array.isArray(this.cliProviderOverrides) && this.cliProviderOverrides.length > 0) {
      // Disable all first, then enable only specified providers
      Object.keys(baseProvidersConfig).forEach(key => {
        if (key !== 'order' && baseProvidersConfig[key] && typeof baseProvidersConfig[key] === 'object') {
          baseProvidersConfig[key].enabled = false;
        }
      });
      this.cliProviderOverrides.forEach(providerName => {
        if (baseProvidersConfig[providerName]) {
          baseProvidersConfig[providerName].enabled = true;
        } else {
          // If CLI specifies a provider not in config, add and enable it (using defaults)
          baseProvidersConfig[providerName] = { enabled: true, maxResults: DEFAULT_CONFIG.providers[providerName]?.maxResults || 30 };
          // Also, ensure it's in the order array if not already present (add to end)
          if (!baseProvidersConfig.order.includes(providerName)) {
            baseProvidersConfig.order.push(providerName);
          }
        }
      });
    }
    // If no CLI overrides, it returns the original config's provider section
    return baseProvidersConfig;
  }
}

// Export a singleton instance
export default new ConfigManager();
