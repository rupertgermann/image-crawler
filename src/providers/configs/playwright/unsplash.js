export default {
  name: 'Unsplash',
  searchUrl: 'https://unsplash.com/s/photos/{query}',
  selectors: {
    // Main selector for images. Unsplash uses srcset extensively.
    images: 'figure a[href*="/photos/"] img[srcset]',
    consentButtons: [] // Typically no major consent banners on results page
  },
  scrolling: {
    strategy: 'infinite_scroll',
    maxScrolls: 15, // Default from old provider: config.maxScrollsUnsplash || 15
    scrollDelay: 2500, // Default from old provider: config.scrollDelayUnsplash || 2500
    noNewImagesRetries: 3, // Default from old provider: config.noNewImagesRetriesUnsplash || 3
    useAutoScroll: true // Generic provider will handle window.scrollTo if true
  },
  imageExtraction: {
    // The old provider specifically parsed srcset and took the last URL.
    // The generic 'attribute' type currently takes the first non-empty attribute value.
    // This might need a new 'srcset_parser' type or enhancement to 'attribute' type later.
    // For now, we'll target 'srcset'. The actual parsing logic is in `getFullSizeImage`'s `detail_page` action.
    // We might need to move that srcset parsing to a utility or into the extraction itself.
    type: 'attribute',
    attributes: ['srcset'], // Primary target is srcset
    // The old provider extracted the last URL from srcset. We'll rely on getFullSizeImage for robust URL cleaning/selection from srcset if needed.
    // Filters are not explicitly mentioned in old provider, but good to have placeholders.
    filters: ['!images.unsplash.com/profile-', '!images.unsplash.com/placeholder-'] // Avoid profile pics, placeholders
  },
  fullSizeActions: {
    // Unsplash URLs from srcset are often high-res but can have sizing params.
    type: 'url_cleaning',
    removeParams: ['w', 'h', 'fit', 'crop', 'q', 'fm', 'auto', 'ixlib', 'cs'] // Common Unsplash params to get base URL
  },
  playwrightOptions: {
    useLocators: true,
    waitOptions: { timeout: 5000, state: 'visible' }
  }
};