import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import configManager from '../../src/utils/config.js';

// Mock file system
jest.mock('fs-extra');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock OS homedir
jest.spyOn(os, 'homedir').mockImplementation(() => '/mock/home/dir');

describe('Configuration Manager', () => {
  const testConfigPath = path.join(os.homedir(), '.image-crawler', 'config.json');
  const testConfig = {
    maxDownloads: 100,
    minWidth: 800,
    minHeight: 600,
    fileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp']
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock fs-extra methods
    fs.ensureDir.mockResolvedValue(undefined);
    fs.pathExists.mockResolvedValue(false);
    fs.readJson.mockResolvedValue(testConfig);
    fs.writeJson.mockResolvedValue(undefined);
  });

  describe('init', () => {
    it('should initialize with default config if no config exists', async () => {
      fs.pathExists.mockResolvedValueOnce(false);
      
      await configManager.init();
      
      expect(fs.ensureDir).toHaveBeenCalledWith(path.dirname(testConfigPath));
      expect(fs.pathExists).toHaveBeenCalledWith(testConfigPath);
      expect(fs.writeJson).toHaveBeenCalledWith(
        testConfigPath,
        expect.any(Object),
        { spaces: 2 }
      );
    });

    it('should load existing config if it exists', async () => {
      fs.pathExists.mockResolvedValueOnce(true);
      
      await configManager.init();
      
      expect(fs.readJson).toHaveBeenCalledWith(testConfigPath);
      expect(fs.writeJson).not.toHaveBeenCalled();
    });
  });

  describe('getConfig', () => {
    it('should return the current configuration', async () => {
      await configManager.init();
      const config = configManager.getConfig();
      
      expect(config).toEqual(expect.any(Object));
      expect(config).toHaveProperty('maxDownloads');
      expect(config).toHaveProperty('minWidth');
      expect(config).toHaveProperty('minHeight');
      expect(config).toHaveProperty('fileTypes');
    });
  });

  describe('updateConfig', () => {
    it('should update the configuration', async () => {
      await configManager.init();
      
      const updates = { maxDownloads: 50 };
      await configManager.updateConfig(updates);
      
      expect(fs.writeJson).toHaveBeenCalledWith(
        testConfigPath,
        expect.objectContaining(updates),
        { spaces: 2 }
      );
      
      const config = configManager.getConfig();
      expect(config.maxDownloads).toBe(50);
    });
  });

  describe('resetConfig', () => {
    it('should reset the configuration to defaults', async () => {
      await configManager.init();
      
      // First update the config
      await configManager.updateConfig({ maxDownloads: 50 });
      
      // Then reset it
      await configManager.resetConfig();
      
      expect(fs.writeJson).toHaveBeenCalledWith(
        testConfigPath,
        expect.objectContaining({ maxDownloads: 100 }), // Default value
        { spaces: 2 }
      );
    });
  });
});
