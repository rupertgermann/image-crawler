import { test, expect } from '@playwright/test';
import EventEmitter from 'events';
import ProviderRegistry from '../src/providers/provider-registry.js';
import configManager from '../src/utils/config.js';

class TestCrawler extends EventEmitter {
  constructor() {
    super();
    this.logs = [];
    this.on('log', (level, message) => {
      this.logs.push({ level, message });
    });
  }
}

describe('Provider Registry Logging', () => {
  let testCrawler;
  let providerRegistry;

  test.beforeAll(async () => {
    // Initialize config manager
    await configManager.init();
    
    // Create test crawler instance
    testCrawler = new TestCrawler();
    
    // Create provider registry
    providerRegistry = new ProviderRegistry();
    
    // Override config for testing
    const config = configManager.getConfig();
    config.providers = {
      order: ['google', 'bing', 'unsplash', 'pixabay', 'pexels', 'flickr', 'duckduckgo', 'freeimages', 'wikimedia'],
      google: { enabled: true },
      bing: { enabled: true },
      unsplash: { enabled: true },
      pixabay: { enabled: true },
      pexels: { enabled: true },
      flickr: { enabled: true },
      duckduckgo: { enabled: true },
      freeimages: { enabled: true },
      wikimedia: { enabled: true }
    };
    configManager.updateConfig(config);
  });

  test.afterAll(async () => {
    // No-op
  });

  test('should pass crawler emitter to providers', async () => {
    // Initialize provider registry with test crawler
    await providerRegistry.initialize(testCrawler);
    
    // Get active providers
    const activeProviders = providerRegistry.getActiveProviders();
    
    // Verify providers were initialized
    expect(activeProviders.length).toBeGreaterThan(0);
    
    // Check that logs were emitted for each provider
    const providerNames = ['Google', 'Bing', 'Unsplash', 'Pixabay', 'Pexels', 'Flickr', 'DuckDuckGo', 'FreeImages', 'Wikimedia'];
    const loggedProviders = new Set();
    
    testCrawler.logs.forEach(log => {
      providerNames.forEach(provider => {
        if (log.message.includes(`${provider}Provider initialized`)) {
          loggedProviders.add(provider);
        }
      });
    });
    
    // Verify at least some providers were logged
    expect(loggedProviders.size).toBeGreaterThan(0);
    console.log(`Successfully initialized providers: ${Array.from(loggedProviders).join(', ')}`);
  });

  test('should handle provider initialization errors', async () => {
    // Force an error by disabling all providers
    const config = configManager.getConfig();
    config.providers = {
      order: ['nonexistent'],
      nonexistent: { enabled: true }
    };
    configManager.updateConfig(config);
    
    // Clear previous logs
    testCrawler.logs = [];
    
    // This should not throw
    await providerRegistry.initialize(testCrawler);
    
    // Check that error was logged
    const errorLogs = testCrawler.logs.filter(log => 
      log.level === 'error' && 
      log.message.includes('Failed to load provider')
    );
    
    expect(errorLogs.length).toBe(1);
  });
});
