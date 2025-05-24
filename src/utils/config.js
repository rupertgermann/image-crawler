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
    google: { enabled: false, maxResults: 100 },
    bing: {
      enabled: true,
      maxResults: 30,
      maxScrollsBing: 15,
      scrollDelayBing: 2000,
      lightboxDelayBing: 1500
    },
    duckduckgo: {
      enabled: true,
      maxResults: 30,
      maxScrollsDDG: 15,
      loadMoreTimeoutDDG: 10000,
      scrollDelayDDG: 2000
    },
    pixabay: { enabled: true, maxResults: 30 },
    unsplash: { enabled: true, maxResults: 30 },
    freeimages: {
      enabled: true,
      maxResults: 30,
      maxScrollsFreeImages: 10,
      scrollDelayFreeImages: 2500
    },
    stocksnap: { enabled: true, maxResults: 25 },
    shutterstock_preview: { 
      enabled: true, 
      maxResults: 20, 
      apiKey: "YOUR_SHUTTERSTOCK_API_KEY_OR_LEAVE_EMPTY_FOR_PREVIEWS" 
    },
    freerangestock: { enabled: true, maxResults: 30 },
    publicdomainpictures: { enabled: true, maxResults: 30 },
    reshot: { enabled: true, maxResults: 30 },
    pexels: { enabled: true, maxResults: 30 },
    flickr: { 
      enabled: false, 
      maxResults: 30,
      apiKey: "YOUR_FLICKR_API_KEY_HERE" 
    },
    wikimedia: { enabled: true, maxResults: 30 }
  },
  logLevel: 'INFO'
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
    // Use deepMerge to ensure all default keys are present and user's config overlays correctly
    this.config = this.deepMerge(JSON.parse(JSON.stringify(DEFAULT_CONFIG)), configData);
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
    // this.config is already a deep merge of DEFAULT_CONFIG and user's config.json from loadConfig/createDefaultConfig
    // If this.config is somehow null (e.g., before init), fallback to DEFAULT_CONFIG.
    const baseConfig = this.config ? JSON.parse(JSON.stringify(this.config)) : JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    // Now, deep-merge any runtime overrides onto this baseConfig
    return this.deepMerge(baseConfig, overrides);
  }

  /**
   * Update configuration
   * @param {Object} updates - Configuration updates
   */
  async updateConfig(updates) {
    // Ensure this.config is initialized if it hasn't been already
    if (!this.config) {
      // Attempt to load or create default; this path might need robust error handling
      // or rely on init() being called first.
      // For simplicity, assuming init() has run or we default to DEFAULT_CONFIG as base.
      this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }
    // Deep merge updates into the current config
    this.config = this.deepMerge(this.config, updates);
    await this.saveConfig();
    return this.config;
  }

  /**
   * Detect available Windows drives
   */
  async detectWindowsDrives() {
    if (!this.platform.isWindows) return [];
    try {
      // Dynamically import windows-drive-letters only on Windows
      const { getWindowsDriveLetters } = await import('windows-drive-letters');
      return getWindowsDriveLetters().map(drive => `${drive}:\\`);
    } catch (error) {
      console.warn('Failed to detect Windows drives, defaulting to C:\\:', error.message);
      return ['C:\\']; // Fallback
    }
  }

  /**
   * Set CLI provider overrides. This allows the CLI to specify which providers to use,
   * overriding the enabled status from config.json for a single run.
   * @param {string[]|null} providers - Array of provider names, or null to clear overrides.
   */
  setCliProviderOverrides(providers) {
    this.cliProviderOverrides = providers;
  }

  /**
   * Get the list of providers that should be active, considering config and CLI overrides.
   * This is primarily for determining which providers to *crawl* with.
   * The UI dropdown should show all *known* providers.
   */
  getActiveCrawlingProviders() {
    const currentConfig = this.getConfig(); // Gets fully merged config
    const providerSettings = currentConfig.providers;
    let activeProvidersList = [];

    if (this.cliProviderOverrides && this.cliProviderOverrides.length > 0) {
      // If CLI overrides are set, only these providers are considered, and they are treated as enabled.
      activeProvidersList = this.cliProviderOverrides.filter(name => providerSettings[name]); // Ensure provider exists in config
    } else {
      // Otherwise, use 'enabled' status from the merged config
      // Iterate over all known provider keys in providerSettings (which comes from DEFAULT_CONFIG merged with user's config)
      activeProvidersList = Object.keys(providerSettings).filter(name => providerSettings[name]?.enabled);
    }
    return activeProvidersList;
  }
}

// Create and export a singleton instance
const configManager = new ConfigManager();

// Export the singleton instance and DEFAULT_CONFIG
export default configManager;
export { DEFAULT_CONFIG };
