# Playwright Provider Refactoring Plan

## Overview

This document outlines a comprehensive plan to refactor the image crawler's provider system by consolidating multiple Playwright-based providers into a single, generic, configurable provider. This will significantly reduce code duplication and improve maintainability while preserving all existing functionality.

## Current State Analysis

### Provider Categories

Based on analysis of the existing codebase, providers fall into two categories:

#### 1. API-Only Providers (Keep Untouched)
- **Pexels** (`pexels-provider.js`) - Uses Pexels API with API key
- **Flickr** (`flickr-provider.js`) - Uses Flickr API with API key

These providers use HTTP APIs and don't require browser automation. They should remain unchanged.

## Playwright Best Practices Analysis

After reviewing the official Playwright input documentation, I've identified several areas where our current providers can be improved and where the generic provider should follow best practices:

### Current Issues in Existing Providers

1. **Deprecated Methods**: Using `page.isVisible()` and `page.click()` instead of modern locator-based methods
2. **Non-Robust Element Selection**: Using `page.evaluate()` for element interaction instead of locators
3. **Manual Scrolling**: Using `page.evaluate('window.scrollTo...')` instead of Playwright's built-in scrolling
4. **Timeout Handling**: Inconsistent timeout patterns
5. **Element Waiting**: Not using proper element waiting strategies

### Best Practices to Implement

1. **Use Locators**: Replace direct page methods with `page.locator()` and `page.getByRole()`
2. **Automatic Scrolling**: Let Playwright handle scrolling automatically when possible
3. **Proper Element Waiting**: Use `locator.waitFor()` and web-first assertions
4. **Robust Clicking**: Use locator-based clicking with proper actionability checks
5. **Better Error Handling**: Use Playwright's built-in retry mechanisms

#### 2. Playwright-Based Providers (Target for Refactoring)
- **Google** (`google-provider.js`) - Web scraping with complex scrolling
- **Bing** (`bing-provider.js`) - Web scraping with lightbox interaction
- **Pixabay** (`pixabay-provider.js`) - Web scraping with detail page navigation
- **Unsplash** (`unsplash-provider.js`) - Web scraping with srcset parsing
- **DuckDuckGo** (`duckduckgo-provider.js`) - Web scraping
- **FreeImages** (`freeimages-provider.js`) - Web scraping
- **Wikimedia** (`wikimedia-provider.js`) - Web scraping
- **StockSnap** (`stocksnap-provider.js`) - Web scraping
- **FreeRangeStock** (`freerangestock-provider.js`) - Web scraping
- **PublicDomainPictures** (`publicdomainpictures-provider.js`) - Web scraping
- **Reshot** (`reshot-provider.js`) - Web scraping
- **Shutterstock** (`shutterstock-provider.js`) - Web scraping (preview mode)

## Refactoring Strategy

### Core Concept: Configuration-Driven Generic Provider

Create a single `GenericPlaywrightProvider` class that uses configuration objects to define provider-specific behavior. Each provider will be defined by a configuration "recipe" that specifies:

1. **Search URL patterns**
2. **Element selectors**
3. **Scrolling behavior**
4. **Image extraction logic**
5. **Full-size image retrieval actions**

### Benefits

1. **Massive Code Reduction**: ~12 provider files → 1 generic provider + config files
2. **Easier Maintenance**: Bug fixes and improvements apply to all providers
3. **Consistent Behavior**: All providers use the same core logic
4. **Easy Provider Addition**: New providers require only configuration, no code
5. **Better Testing**: Single provider class to test thoroughly
6. **Improved Reliability**: Shared best practices and error handling

## Implementation Plan

### Phase 1: Create Generic Provider Infrastructure

#### 1.1 Create Generic Playwright Provider

**File**: `src/providers/generic-playwright-provider.js`

```javascript
import BaseProvider from './base-provider.js';

export default class GenericPlaywrightProvider extends BaseProvider {
  constructor(config, emitter, providerConfig) {
    super(config, emitter);
    this.providerConfig = providerConfig;
    this.name = providerConfig.name;
  }

  async fetchImageUrls(query, options, page) {
    // Generic implementation using this.providerConfig
  }

  async getFullSizeImage(page, imageUrl) {
    // Generic implementation using this.providerConfig.fullSizeActions
  }
}
```

#### 1.2 Create Provider Configuration System

**File**: `src/providers/configs/provider-configs.js`

```javascript
export const PROVIDER_CONFIGS = {
  google: {
    name: 'Google',
    searchUrl: 'https://www.google.com/imghp?q={query}&safe=active&hl=en',
    selectors: {
      images: 'img[data-src], img[src^="http"]',
      consentButtons: ['button[aria-label="Accept all"]', /* ... */],
      showMoreButton: 'input[type="button"][value="Show more results"]'
    },
    scrolling: {
      maxScrolls: 20,
      scrollDelay: 2000,
      noNewImagesRetries: 3
    },
    imageExtraction: {
      type: 'attribute',
      attributes: ['data-src', 'src'],
      filters: ['!gstatic.com/images', '!googlelogo']
    },
    fullSizeActions: {
      type: 'direct' // URL is already full-size
    }
  },
  
  bing: {
    name: 'Bing',
    searchUrl: 'https://www.bing.com/images/search?q={query}&form=HDRSC2&first=1&tsc=ImageBasicHover&safesearch=strict',
    selectors: {
      thumbnails: 'a.iusc',
      consentButtons: ['#bnp_btn_accept', 'button[aria-label="Accept"]'],
      lightboxImages: ['#iv_stage img#mainImage', '.ivg_img.loaded', 'img.nofocus']
    },
    scrolling: {
      maxScrolls: 15,
      scrollDelay: 2000,
      noNewImagesRetries: 3
    },
    imageExtraction: {
      type: 'json_attribute',
      attribute: 'm',
      jsonPath: 'murl',
      fallback: {
        type: 'nested_attribute',
        selector: 'img',
        attributes: ['src', 'data-src']
      }
    },
    fullSizeActions: {
      type: 'lightbox',
      clickTarget: 'thumbnail',
      waitDelay: 1500,
      imageSelectors: ['#iv_stage img#mainImage', '.ivg_img.loaded', 'img.nofocus']
    }
  },
  
  pixabay: {
    name: 'Pixabay',
    searchUrl: 'https://pixabay.com/images/search/{query}/?safesearch=true',
    selectors: {
      imageLinks: 'div.item > a',
      consentButtons: []
    },
    scrolling: {
      maxScrolls: 10,
      scrollDelay: 2000,
      noNewImagesRetries: 3
    },
    imageExtraction: {
      type: 'link_collection' // Collect detail page URLs
    },
    fullSizeActions: {
      type: 'detail_page',
      selectors: [
        'img[srcset*="__large"]',
        'div.media_wrapper img',
        'a[href*="/download/"]',
        'picture > source[srcset]',
        'img[src*="pixabay.com/get/"]'
      ]
    }
  }
  
  // ... configurations for other providers
};
```

### Phase 2: Update Provider Registry

#### 2.1 Modify Provider Registry

**File**: `src/providers/provider-registry.js`

```javascript
import { PROVIDER_CONFIGS } from './configs/provider-configs.js';
import GenericPlaywrightProvider from './generic-playwright-provider.js';

class ProviderRegistry {
  async loadProviderClass(name) {
    // Check if it's an API-only provider
    if (['pexels', 'flickr'].includes(name)) {
      // Load existing API providers
      switch (name) {
        case 'pexels': return (await import('./pexels-provider.js')).default;
        case 'flickr': return (await import('./flickr-provider.js')).default;
      }
    }
    
    // Check if it's a Playwright provider with config
    if (PROVIDER_CONFIGS[name]) {
      return class ConfiguredProvider extends GenericPlaywrightProvider {
        constructor(config, emitter) {
          super(config, emitter, PROVIDER_CONFIGS[name]);
        }
      };
    }
    
    throw new Error(`Unknown provider: ${name}`);
  }
}
```

### Phase 3: Implement Generic Provider Logic

#### 3.1 Core Generic Provider Implementation

The generic provider will implement these key patterns:

1. **URL Template Processing**: Replace `{query}` placeholders in search URLs
2. **Selector-Based Element Finding**: Use configured selectors to find elements
3. **Configurable Scrolling**: Implement scrolling with provider-specific parameters
4. **Multiple Image Extraction Strategies**:
   - Direct attribute extraction
   - JSON attribute parsing
   - Nested element searching
   - Link collection for detail pages
5. **Configurable Full-Size Image Actions**:
   - Direct URL usage
   - Lightbox interaction
   - Detail page navigation
   - URL cleaning/parameter removal

#### 3.2 Action System for Full-Size Images (Following Playwright Best Practices)

```javascript
const FULL_SIZE_ACTIONS = {
  direct: (page, url) => url,
  
  lightbox: async (page, url, config) => {
    // Use locator-based clicking with proper waiting
    const thumbnailLocator = page.locator(config.clickTarget).filter({ hasText: url });
    await thumbnailLocator.click(); // Playwright handles actionability automatically
    
    // Wait for lightbox to appear using locators
    const lightboxImage = page.locator(config.imageSelectors.join(', ')).first();
    await lightboxImage.waitFor({ state: 'visible' });
    
    return await lightboxImage.getAttribute('src');
  },
  
  detail_page: async (page, url, config) => {
    // Navigate to detail page and use locators to find image
    await page.goto(url, { waitUntil: 'networkidle' });
    
    const imageLocator = page.locator(config.selectors.join(', ')).first();
    await imageLocator.waitFor({ state: 'visible' });
    
    return await imageLocator.getAttribute('src');
  },
  
  url_cleaning: (page, url, config) => {
    // Remove size parameters from URL
    const urlObj = new URL(url);
    config.removeParams?.forEach(param => urlObj.searchParams.delete(param));
    return urlObj.toString();
  }
};
```

### Phase 4: Configuration Migration

#### 4.1 Extract Configurations from Existing Providers

For each existing Playwright provider:

1. **Analyze current selectors and logic**
2. **Extract scrolling parameters**
3. **Identify image extraction patterns**
4. **Document full-size image retrieval logic**
5. **Create configuration object**

#### 4.2 Validate Configurations

1. **Test each provider configuration**
2. **Ensure feature parity with original providers**
3. **Verify error handling works correctly**

### Phase 5: Testing and Validation

#### 5.1 Comprehensive Testing

1. **Unit tests for generic provider**
2. **Integration tests for each provider configuration**
3. **End-to-end tests with real websites**
4. **Performance comparison with original providers**

#### 5.2 Gradual Migration

1. **Implement one provider configuration at a time**
2. **Test thoroughly before moving to next**
3. **Keep original providers as backup during transition**

### Phase 6: Cleanup and Documentation

#### 6.1 Remove Old Provider Files

Once all configurations are working:

1. **Delete old Playwright provider files**
2. **Update imports and references**
3. **Clean up unused dependencies**

#### 6.2 Update Documentation

1. **Document new configuration system**
2. **Provide examples for adding new providers**
3. **Update README with new architecture**

## Configuration Schema

### Provider Configuration Structure (Updated with Playwright Best Practices)

```javascript
{
  name: string,                    // Display name
  searchUrl: string,              // URL template with {query} placeholder
  selectors: {
    images?: string,              // Image element selector
    thumbnails?: string,          // Thumbnail link selector
    imageLinks?: string,          // Detail page link selector
    consentButtons?: string[],    // Cookie consent selectors (use getByRole when possible)
    showMoreButton?: string,      // Load more results selector
    lightboxImages?: string[]     // Lightbox image selectors
  },
  scrolling: {
    strategy: 'auto' | 'manual' | 'infinite_scroll',  // Scrolling strategy
    maxScrolls: number,           // Maximum scroll attempts
    scrollDelay: number,          // Delay between scrolls (ms)
    noNewImagesRetries: number,   // Stop after N scrolls with no new images
    useAutoScroll?: boolean       // Let Playwright handle scrolling automatically
  },
  imageExtraction: {
    type: 'attribute' | 'json_attribute' | 'nested_attribute' | 'link_collection',
    attribute?: string,           // Attribute name to extract
    attributes?: string[],        // Multiple attributes to try
    jsonPath?: string,           // Path in JSON attribute
    selector?: string,           // Nested element selector
    filters?: string[],          // URL filters (! prefix for exclusion)
    fallback?: object,           // Fallback extraction method
    waitStrategy?: 'networkidle' | 'domcontentloaded' | 'load'  // Wait strategy for images
  },
  fullSizeActions: {
    type: 'direct' | 'lightbox' | 'detail_page' | 'url_cleaning',
    clickTarget?: string,        // What to click for lightbox
    waitStrategy?: 'locator' | 'timeout' | 'networkidle',  // How to wait for elements
    waitDelay?: number,          // Wait time after action (fallback)
    imageSelectors?: string[],   // Selectors for full-size image
    selectors?: string[],        // Alternative name for imageSelectors
    urlTransforms?: object[],    // URL transformation rules
    removeParams?: string[]      // URL parameters to remove for url_cleaning
  },
  playwrightOptions?: {          // Playwright-specific options
    useLocators: boolean,        // Use modern locator-based methods (default: true)
    retryOptions?: {             // Retry configuration
      retries: number,
      timeout: number
    },
    waitOptions?: {              // Default wait options
      timeout: number,
      state: 'visible' | 'attached' | 'detached' | 'hidden'
    }
  }
}
```

### Example Configuration with Best Practices

```javascript
google: {
  name: 'Google',
  searchUrl: 'https://www.google.com/imghp?q={query}&safe=active&hl=en',
  selectors: {
    images: 'img[data-src], img[src^="http"]',
    consentButtons: [
      'button[aria-label="Accept all"]',
      'button[aria-label="Alles akzeptieren"]',
      'div[role="dialog"] button:first-child'
    ],
    showMoreButton: 'input[type="button"][value*="more results" i]'
  },
  scrolling: {
    strategy: 'infinite_scroll',
    maxScrolls: 20,
    scrollDelay: 2000,
    noNewImagesRetries: 3,
    useAutoScroll: true  // Let Playwright handle scrolling when possible
  },
  imageExtraction: {
    type: 'attribute',
    attributes: ['data-src', 'src'],
    filters: ['!gstatic.com/images', '!googlelogo'],
    waitStrategy: 'networkidle'
  },
  fullSizeActions: {
    type: 'direct'
  },
  playwrightOptions: {
    useLocators: true,
    retryOptions: {
      retries: 3,
      timeout: 30000
    },
    waitOptions: {
      timeout: 10000,
      state: 'visible'
    }
  }
}
```

## Risk Mitigation

### Backup Strategy

1. **Keep original provider files during development**
2. **Implement feature flags to switch between old/new providers**
3. **Comprehensive testing before removing old code**

### Rollback Plan

1. **Git branches for each phase**
2. **Ability to quickly revert to original providers**
3. **Configuration validation to prevent runtime errors**

### Testing Strategy

1. **Automated tests for all provider configurations**
2. **Manual testing with real websites**
3. **Performance monitoring during transition**

## Timeline Estimate

- **Phase 1-2**: 2-3 days (Infrastructure setup)
- **Phase 3**: 3-4 days (Generic provider implementation)
- **Phase 4**: 4-5 days (Configuration migration)
- **Phase 5**: 2-3 days (Testing and validation)
- **Phase 6**: 1-2 days (Cleanup and documentation)

**Total**: 12-17 days

## Success Criteria

1. **All existing providers work with new system**
2. **No loss of functionality or performance**
3. **Significant reduction in code complexity**
4. **Easy addition of new providers via configuration**
5. **Improved maintainability and testability**

## Future Benefits

1. **Rapid provider addition**: New providers require only configuration
2. **Consistent improvements**: Bug fixes benefit all providers
3. **Better error handling**: Centralized error handling logic
4. **Enhanced monitoring**: Unified logging and metrics
5. **Easier testing**: Single provider class to test thoroughly

This refactoring will transform the provider system from a collection of similar but separate implementations into a clean, maintainable, configuration-driven architecture that's much easier to extend and maintain.
