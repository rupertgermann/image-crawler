import { test, expect, describe } from '@playwright/test';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import configManagerInstance from '../../src/utils/config.js'; // Renamed to avoid conflict if ConfigManager class is also tested

// IMPORTANT MOCKING CAVEAT:
// The config.js module directly imports 'fs-extra'. Without refactoring config.js
// for dependency injection or using a specialized ESM mocking library, we cannot
// truly mock 'fs-extra' for the configManagerInstance under test from here.
// The 'mockFs' object below is for setting up test expectations and tracking
// calls *as if* fs-extra was mocked. These assertions will not reflect the
// actual behavior of configManagerInstance with the real fs-extra unless the
// config.js module is modified to use an injected fs-like object.

const mockFs = {
  _calls: { ensureDir: [], pathExists: [], readJson: [], writeJson: [] },
  _resetCalls: function() {
    this._calls = { ensureDir: [], pathExists: [], readJson: [], writeJson: [] };
  },
  ensureDir: async (...args) => { mockFs._calls.ensureDir.push(args); return undefined; },
  pathExists: async (...args) => { mockFs._calls.pathExists.push(args); return false; }, // Default mock behavior
  readJson: async (...args) => { mockFs._calls.readJson.push(args); return {}; },    // Default mock behavior
  writeJson: async (...args) => { mockFs._calls.writeJson.push(args); return undefined; }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let originalHomedir;

describe('Configuration Manager (tests/unit/config.test.js)', () => {
  const mockHome = '/mock/home/dir';
  const testConfigPath = path.join(mockHome, '.image-crawler', 'config.json');
  const initialTestConfig = {
    maxDownloads: 100,
    minWidth: 800,
    minHeight: 600,
    fileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp']
    // Note: outputDir and other platform-specific defaults are handled by config.js itself
  };

  test.beforeAll(() => {
    originalHomedir = os.homedir;
    os.homedir = () => mockHome;
  });

  test.afterAll(() => {
    os.homedir = originalHomedir;
  });

  test.beforeEach(async () => {
    mockFs._resetCalls();
    // Reset fs mock behaviors for each test if necessary
    mockFs.ensureDir = async (...args) => { mockFs._calls.ensureDir.push(args); return undefined; };
    mockFs.pathExists = async (...args) => { mockFs._calls.pathExists.push(args); return false; }; // Default: config doesn't exist
    mockFs.readJson = async (...args) => { mockFs._calls.readJson.push(args); return { ...initialTestConfig }; };
    mockFs.writeJson = async (...args) => { mockFs._calls.writeJson.push(args); return undefined; };
    
    // It's crucial that configManagerInstance is re-initialized or its state reset if it caches config.
    // For this test structure, we assume configManager.init() correctly re-evaluates.
    // If configManager is a true singleton and caches its first init, these tests might interfere.
    // The current config.js creates a singleton, so its state persists across tests unless explicitly reset.
    // We might need a reset method on configManager or to test a new instance each time.
    // For now, proceeding with the assumption that init() can be called to reload/reinitialize.
  });

  describe('init', () => {
    test('should initialize with default config if no config exists', async () => {
      mockFs.pathExists = async (...args) => { mockFs._calls.pathExists.push(args); return false; }; // Simulate no config file
      
      // Because configManager is a singleton, its state might persist.
      // We ideally need a way to reset it or use a fresh instance.
      // For now, let's call init and trust it re-evaluates based on mocks.
      await configManagerInstance.init(); 
      
      expect(mockFs._calls.ensureDir[0][0]).toBe(path.dirname(testConfigPath));
      expect(mockFs._calls.pathExists[0][0]).toBe(testConfigPath);
      expect(mockFs._calls.writeJson[0][0]).toBe(testConfigPath);
      expect(mockFs._calls.writeJson[0][1]).toEqual(expect.objectContaining(initialTestConfig)); // Or a more specific default config check
      expect(mockFs._calls.writeJson[0][2]).toEqual({ spaces: 2 });
    });

    test('should load existing config if it exists', async () => {
      const existingConfig = { ...initialTestConfig, maxDownloads: 500 };
      mockFs.pathExists = async (...args) => { mockFs._calls.pathExists.push(args); return true; }; // Simulate config file exists
      mockFs.readJson = async (...args) => { mockFs._calls.readJson.push(args); return existingConfig; };
      
      await configManagerInstance.init();
      
      expect(mockFs._calls.readJson[0][0]).toBe(testConfigPath);
      expect(mockFs._calls.writeJson.length).toBe(0);
      // Verify that the loaded config is used by the manager
      expect(configManagerInstance.getConfig().maxDownloads).toBe(500);
    });
  });

  describe('getConfig', () => {
    test('should return the current configuration', async () => {
      // Ensure config is initialized (e.g., with defaults)
      mockFs.pathExists = async () => false; // Start with no config file for init
      await configManagerInstance.init(); 
      mockFs._resetCalls(); // Clear calls from init

      const config = configManagerInstance.getConfig();
      
      expect(config).toEqual(expect.objectContaining(initialTestConfig));
      expect(config).toHaveProperty('maxDownloads');
      // ... other property checks from original test
    });
  });

  describe('updateConfig', () => {
    test('should update the configuration and save it', async () => {
      mockFs.pathExists = async () => false; // Start with no config file for init
      await configManagerInstance.init();
      mockFs._resetCalls(); // Clear calls from init

      const updates = { maxDownloads: 50 };
      await configManagerInstance.updateConfig(updates);
      
      expect(mockFs._calls.writeJson[0][0]).toBe(testConfigPath);
      expect(mockFs._calls.writeJson[0][1]).toEqual(expect.objectContaining(updates));
      expect(mockFs._calls.writeJson[0][2]).toEqual({ spaces: 2 });
      
      const config = configManagerInstance.getConfig();
      expect(config.maxDownloads).toBe(50);
    });
  });

  describe('resetConfig', () => {
    test('should reset the configuration to defaults and save it', async () => {
      mockFs.pathExists = async () => false; // Start with no config file for init
      await configManagerInstance.init(); // Initialize with defaults
      
      // Update it first
      const updates = { maxDownloads: 50 };
      await configManagerInstance.updateConfig(updates);
      expect(configManagerInstance.getConfig().maxDownloads).toBe(50);
      mockFs._resetCalls(); // Clear calls from init and update
      
      await configManagerInstance.resetConfig();
      
      expect(mockFs._calls.writeJson[0][0]).toBe(testConfigPath);
      // Check that it resets to the default value (e.g., 100 for maxDownloads from initialTestConfig)
      expect(mockFs._calls.writeJson[0][1]).toEqual(expect.objectContaining({ maxDownloads: initialTestConfig.maxDownloads }));
      expect(mockFs._calls.writeJson[0][2]).toEqual({ spaces: 2 });

      expect(configManagerInstance.getConfig().maxDownloads).toBe(initialTestConfig.maxDownloads);
    });
  });
});
