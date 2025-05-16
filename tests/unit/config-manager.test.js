import { jest } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import ConfigManager from '../../src/utils/config-manager.js';

// Mock fs-extra
jest.mock('fs-extra');

// Mock os.homedir
const mockHomedir = jest.spyOn(os, 'homedir');
mockHomedir.mockReturnValue('/mock/home/dir');

describe('ConfigManager', () => {
  let configManager;
  const testConfigDir = path.join(os.homedir(), '.image-crawler');
  const testConfigPath = path.join(testConfigDir, 'config.json');
  
  const testConfig = {
    maxDownloads: 100,
    minWidth: 800,
    minHeight: 600,
    fileTypes: ['jpg', 'png', 'gif'],
    outputDir: path.join(os.homedir(), 'Downloads')
  };
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create a new ConfigManager instance for each test
    configManager = new ConfigManager();
    
    // Mock fs-extra methods
    fs.ensureDir.mockResolvedValue(true);
    fs.pathExists.mockResolvedValue(false);
    fs.readJson.mockResolvedValue({});
    fs.writeJson.mockResolvedValue(true);
  });
  
  afterEach(() => {
    // Restore all mocks after each test
    jest.restoreAllMocks();
  });
  
  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(configManager.config).toEqual(expect.objectContaining({
        maxDownloads: 100,
        minWidth: 800,
        minHeight: 600,
        fileTypes: expect.arrayContaining(['jpg', 'jpeg', 'png', 'gif', 'webp']),
        outputDir: expect.any(String)
      }));
    });
    
    it('should use custom config path if provided', () => {
      const customPath = '/custom/config/path/config.json';
      const customConfigManager = new ConfigManager(customPath);
      expect(customConfigManager.configPath).toBe(customPath);
    });
  });
  
  describe('init', () => {
    it('should create config directory if it does not exist', async () => {
      await configManager.init();
      expect(fs.ensureDir).toHaveBeenCalledWith(testConfigDir);
    });
    
    it('should load existing config if it exists', async () => {
      // Mock that config file exists
      fs.pathExists.mockResolvedValueOnce(true);
      fs.readJson.mockResolvedValueOnce(testConfig);
      
      await configManager.init();
      
      expect(fs.pathExists).toHaveBeenCalledWith(testConfigPath);
      expect(fs.readJson).toHaveBeenCalledWith(testConfigPath);
      expect(configManager.config).toEqual(expect.objectContaining(testConfig));
    });
    
    it('should save default config if no config exists', async () => {
      // Mock that config file does not exist
      fs.pathExists.mockResolvedValueOnce(false);
      
      await configManager.init();
      
      expect(fs.writeJson).toHaveBeenCalledWith(
        testConfigPath,
        configManager.config,
        { spaces: 2 }
      );
    });
    
    it('should handle errors during initialization', async () => {
      const testError = new Error('Test error');
      fs.ensureDir.mockRejectedValueOnce(testError);
      
      await expect(configManager.init()).rejects.toThrow(testError);
    });
  });
  
  describe('get', () => {
    it('should return the entire config if no key is provided', async () => {
      await configManager.init();
      const config = configManager.get();
      expect(config).toEqual(expect.any(Object));
      expect(config).toHaveProperty('maxDownloads');
      expect(config).toHaveProperty('minWidth');
      expect(config).toHaveProperty('minHeight');
      expect(config).toHaveProperty('fileTypes');
      expect(config).toHaveProperty('outputDir');
    });
    
    it('should return a specific config value if key is provided', async () => {
      await configManager.init();
      const maxDownloads = configManager.get('maxDownloads');
      expect(maxDownloads).toBe(100);
    });
    
    it('should return undefined for non-existent keys', async () => {
      await configManager.init();
      const nonExistent = configManager.get('nonExistentKey');
      expect(nonExistent).toBeUndefined();
    });
  });
  
  describe('set', () => {
    it('should update a single config value', async () => {
      await configManager.init();
      
      // Update a single value
      await configManager.set('maxDownloads', 50);
      
      expect(configManager.config.maxDownloads).toBe(50);
      expect(fs.writeJson).toHaveBeenCalledWith(
        testConfigPath,
        expect.objectContaining({ maxDownloads: 50 }),
        { spaces: 2 }
      );
    });
    
    it('should update multiple config values', async () => {
      await configManager.init();
      
      // Update multiple values
      const updates = {
        maxDownloads: 200,
        minWidth: 1024,
        minHeight: 768
      };
      
      await configManager.set(updates);
      
      expect(configManager.config).toEqual(expect.objectContaining(updates));
      expect(fs.writeJson).toHaveBeenCalledWith(
        testConfigPath,
        expect.objectContaining(updates),
        { spaces: 2 }
      );
    });
    
    it('should throw an error for invalid updates', async () => {
      await configManager.init();
      
      // Invalid update (non-object and not a string key with value)
      await expect(configManager.set(123)).rejects.toThrow('Invalid update parameter');
      
      // Invalid key type
      await expect(configManager.set(123, 'value')).rejects.toThrow('Key must be a string');
    });
    
    it('should handle errors during save', async () => {
      await configManager.init();
      
      const testError = new Error('Test error');
      fs.writeJson.mockRejectedValueOnce(testError);
      
      await expect(configManager.set('maxDownloads', 50)).rejects.toThrow(testError);
    });
  });
  
  describe('reset', () => {
    it('should reset the config to default values', async () => {
      await configManager.init();
      
      // Change some values
      await configManager.set({
        maxDownloads: 500,
        minWidth: 1920,
        minHeight: 1080
      });
      
      // Reset to defaults
      await configManager.reset();
      
      expect(configManager.config.maxDownloads).toBe(100);
      expect(configManager.config.minWidth).toBe(800);
      expect(configManager.config.minHeight).toBe(600);
      
      expect(fs.writeJson).toHaveBeenCalledWith(
        testConfigPath,
        expect.objectContaining({
          maxDownloads: 100,
          minWidth: 800,
          minHeight: 600
        }),
        { spaces: 2 }
      );
    });
  });
});
