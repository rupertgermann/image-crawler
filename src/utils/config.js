import fs from 'fs-extra';
import path from 'path';
import { getPlatformInfo } from './platform.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default configuration
const DEFAULT_CONFIG = {
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
      scanNetworkDrives: false
    },
    darwin: {
      defaultScanPath: path.join(process.env.HOME, 'Pictures')
    },
    linux: {
      defaultScanPath: path.join(process.env.HOME, 'Pictures')
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
   * Get the current configuration
   */
  getConfig() {
    return this.config;
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
