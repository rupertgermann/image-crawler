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
  minWidth: 800,
  minHeight: 600,
  minFileSize: '100KB',
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
  }
};

class ConfigManager {
  constructor() {
    this.config = null;
    this.configPath = path.join(process.cwd(), 'config.json');
    this.platform = getPlatformInfo();
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
}

// Export a singleton instance
export default new ConfigManager();
