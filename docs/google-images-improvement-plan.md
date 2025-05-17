# Image Crawler Enhancement Plan

## Current Problems
1. **Image Provider Quality Issues**
   - Image providers often download small preview thumbnails directly
   - These small preview images rarely meet the minimum size criteria
   - Google Images particularly struggles with downloading only small previews
   - This leads to many skipped downloads and inefficiency across all providers

2. **Image Provider Architecture**
   - Need a centralized way to manage multiple image providers
   - Configuration is currently scattered
   - Adding new providers requires changes in multiple locations

3. **Configuration Management**
   - Configuration is split between `src/utils/config.js` and `config.json`
   - Need to consolidate configuration into a single, well-structured system
   - Current approach makes it harder to maintain and extend the application

## Solution Overview

### Part 1: Enhanced Image Provider System
Create a universal image provider enhancement system:
1. Implement a base provider class with common functionality for all providers
2. Add advanced image detection and extraction techniques for each provider
3. Implement pre-download dimension and size checking for all providers
4. Add special handling for Google Images to extract full-size images from detail panels
5. Create unified image validation and processing pipeline for all providers

### Part 2: Modular Provider Architecture
Implement a centralized provider management system:
1. Create a unified configuration structure for all image providers
2. Design a plugin-like architecture for easily adding new providers
3. Standardize the provider interface with common methods
4. Create a provider registry to dynamically load configured providers

### Part 3: Configuration Consolidation
Redevelop the configuration system to be more maintainable and extensible:
1. Consolidate configuration between `config.js` and `config.json`
2. Create a more robust and standardized configuration structure
3. Improve configuration validation and error handling
4. Add support for environment-specific configuration overrides

## Implementation Plan

### Part 1: Universal Image Provider Enhancements

#### 1. Create Common Image Handling System
Implement a set of core utilities for all providers:
- `detectImageDimensions`: Detect dimensions without downloading full image
- `validateImageMeetsCriteria`: Check if image meets size/dimension requirements
- `getFullSizeImage`: Extract full-size version of preview images when possible
- `optimizeImageDownload`: Download with proper error handling and validation

#### 2. Provider-Specific Full-Size Image Extraction
Implement provider-specific methods for extracting full-size images:
- **Google Images**: Click thumbnails to open detail panel and extract larger images
- **Unsplash**: Replace preview URL parameters to get full-resolution images
- **Pixabay**: Extract direct full-size download links instead of previews
- **Other providers**: Implement similar optimizations for each

#### 3. Universal Image Processing Pipeline
Create a standardized image processing pipeline for all providers:
1. Extract candidate image URLs from provider
2. Check dimensions and file size before downloading
3. If image meets criteria, download directly
4. If image doesn't meet criteria but has a larger version available, get that instead
5. Validate final image before saving to ensure quality requirements

#### 4. Implement Pre-Download Validation
Add pre-download validation for all providers:
- Use HEAD requests to check Content-Length header
- Use Playwright's network interception to analyze image metadata
- Check image dimensions via HTML properties and/or internal metadata
- Validate file type and format before downloading

#### 5. Add Comprehensive Error Handling
Implement robust error handling across all providers:
- Handle network timeouts and retries
- Manage rate limiting and provider-specific restrictions
- Handle image validation failures gracefully
- Provide detailed logging for troubleshooting

### Part 2: Provider Architecture Redesign

#### 1. Define Provider Interface
Create a standard interface that all image providers must implement:
```javascript
class ImageProvider {
  // Required methods
  async initialize() {}
  async search(query, options) {}
  async getImageUrls() {}
  async downloadImages(urls, options) {}
  // Optional utility methods
  async checkImageDimensions(url) {}
}
```

#### 2. Enhance Configuration System
Expand the config.js to include comprehensive provider settings:
- Add configuration sections for each provider
- Include enable/disable flags
- Set provider-specific options
- Support provider priority ordering

#### 3. Create Provider Registry
Implement a registry system that:
- Loads providers dynamically based on configuration
- Manages provider lifecycle (initialization, execution, cleanup)
- Handles fallback logic when a provider fails

#### 4. Refactor Existing Providers
Refactor existing providers (Google, Pixabay, Unsplash) to implement the new interface

#### 5. Create Provider Factory
Implement a factory pattern to instantiate providers based on configuration

### Part 3: Configuration System Redesign

#### 1. Create Standard Configuration Structure
Define a comprehensive configuration schema that includes:
- General application settings
- Provider-specific settings
- Platform-specific settings
- User preferences

#### 2. Implement Configuration Manager
Enhance the ConfigManager class to:
- Load configuration from a single, well-defined location
- Support multiple configuration environments (dev, prod)
- Validate configuration values against a schema
- Provide helpful error messages for invalid configurations

#### 3. Add Configuration Utilities
Create utility functions for:
- Merging default and user configurations
- Validating configuration values
- Handling backward compatibility with older config formats
- Providing typed configuration access

#### 4. Implement Migration System
Build a migration system to:
- Detect older configuration formats
- Automatically upgrade configurations to the new format
- Preserve user settings during upgrades

#### 5. Update Application to Use New Configuration
Modify the application to use the new configuration system:
- Update the CLI to use the new configuration
- Update all providers to use the standardized configuration
- Ensure all components access configuration through the ConfigManager

## Expected Outcomes

### Universal Image Enhancement
- Significantly higher percentage of downloaded images that meet size criteria across all providers
- More efficient use of bandwidth by pre-checking dimensions for all images
- Better quality images in the final output directory
- Consistent behavior and quality across all image providers

### Provider Architecture
- Easier addition of new image providers
- Consistent configuration interface for all providers
- More maintainable and extensible codebase
- Better error handling and failover between providers

### Configuration System
- Single source of truth for all configuration
- Simplified configuration management
- Better validation and error handling
- Improved developer experience
- Easier addition of new features and providers

## Implementation Details

### Image Size Detection
We'll use Playwright's network interception capabilities to check the image dimensions before downloading the full image. This can be done by:
1. Setting up a route to intercept image requests
2. Getting the Content-Length header to determine file size
3. Using the sharp library or HTML image properties to determine dimensions

### Full-Size Image Extraction
Google Images displays larger versions when you click on a thumbnail. We'll need to:
1. Click on the thumbnail
2. Wait for the larger image to load in the detail panel
3. Extract the src attribute of the larger image
4. Return this URL for downloading

### Consolidated Configuration System
The enhanced configuration system will look like this:

```javascript
// In config.js
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
      defaultOutputDir: 'downloads'
    },
    darwin: {
      defaultScanPath: '$HOME/Pictures',
      defaultOutputDir: '$HOME/Downloads/image-crawler'
    },
    linux: {
      defaultScanPath: '$HOME/Pictures',
      defaultOutputDir: '$HOME/Downloads/image-crawler'
    }
  },
  
  // Provider configuration
  providers: {
    // Enable/disable providers and set their priority order (lower = higher priority)
    order: ['pixabay', 'unsplash', 'google', 'bing', 'pexels'],
    
    // Provider-specific settings
    pixabay: {
      enabled: true,
      apiKey: '',
      maxResults: 100,
      safeSearch: true,
      imageType: 'photo'
    },
    unsplash: {
      enabled: true,
      apiKey: '',
      maxResults: 100,
      orientation: 'landscape'
    },
    google: {
      enabled: true,
      maxResults: 100,
      safeSearch: true,
      // Google Images specific settings
      clickThumbnails: true,           // Click thumbnails to get larger images
      maxClickAttempts: 3,             // Max attempts to click a thumbnail
      detailPanelTimeout: 5000         // Timeout for detail panel to appear (ms)
    },
    bing: {
      enabled: false,
      maxResults: 100,
      safeSearch: true
    },
    pexels: {
      enabled: false,
      apiKey: '',
      maxResults: 100
    }
  },
  
  // User interface settings
  ui: {
    useNativeDialogs: false,
    logLevel: 'info',
    showProgressBar: true
  },
  
  // Universal image handling settings
  imageHandling: {
    extractFullSizeImages: true,     // Always try to get full-size images
    checkDimensions: true,           // Check image dimensions before downloading
    validateBeforeDownload: true,    // Validate images before downloading
    maxValidationAttempts: 3,        // Maximum attempts to validate an image
    skipInvalidImages: true,         // Skip images that fail validation
    preferOriginalSize: true,        // Always prefer largest available version
    downloadTimeout: 30000           // Timeout for image downloads (ms)
  }
};
```

### ConfigManager Improvements
The enhanced ConfigManager will support a more robust configuration loading mechanism:

```javascript
export class ConfigManager {
  constructor(options = {}) {
    // Support multiple config file locations with cascade/fallback
    this.configLocations = [
      // Command line specified location
      options.configPath,
      // Current working directory
      path.join(process.cwd(), 'config.json'),
      // User's home directory
      path.join(os.homedir(), '.image-crawler', 'config.json')
    ].filter(Boolean); // Remove undefined entries
    
    // Initialize with default config
    this.config = { ...DEFAULT_CONFIG };
    this.loaded = false;
  }
  
  /**
   * Initialize configuration by loading from the first available location
   */
  async init() {
    for (const configPath of this.configLocations) {
      if (await fs.pathExists(configPath)) {
        try {
          const userConfig = await fs.readJson(configPath);
          this.config = this.deepMerge(this.config, userConfig);
          this.configPath = configPath; // Remember which path worked
          this.loaded = true;
          Logger.debug(`Loaded configuration from ${configPath}`);
          break;
        } catch (error) {
          Logger.warn(`Error loading configuration from ${configPath}: ${error.message}`);
        }
      }
    }
    
    // If no config was loaded, create a default one in the first location
    if (!this.loaded) {
      this.configPath = this.configLocations[1]; // Use the cwd location
      await this.createDefaultConfig();
    }
    
    return this.config;
  }
  
  // ... other methods
}
```
```

### Provider Registry
A new ProviderRegistry class will manage all providers:

```javascript
export class ProviderRegistry {
  constructor(config) {
    this.config = config;
    this.providers = {};
    this.activeProviders = [];
  }

  async initialize() {
    // Load all enabled providers in priority order
    for (const providerName of this.config.providers.order) {
      if (this.config.providers[providerName]?.enabled) {
        this.providers[providerName] = await this.createProvider(providerName);
        this.activeProviders.push(providerName);
      }
    }
  }

  async createProvider(name) {
    // Factory method to create provider instances
    switch (name) {
      case 'google': return new GoogleImagesProvider(this.config);
      case 'pixabay': return new PixabayProvider(this.config);
      case 'unsplash': return new UnsplashProvider(this.config);
      case 'bing': return new BingImagesProvider(this.config);
      case 'pexels': return new PexelsProvider(this.config);
      default: throw new Error(`Unknown provider: ${name}`);
    }
  }
}
```

This implementation will significantly improve the quality and efficiency of the Google Images provider while making the entire system more maintainable and extensible.
