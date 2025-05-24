export default {
  name: 'DuckDuckGo',
  // kp=-1 for safesearch on, kp=1 for safesearch off.
  // The generic provider will need to replace {safeSearchParam} based on options.
  searchUrl: 'https://duckduckgo.com/?q={query}&iax=images&ia=images&kp={safeSearchParam}',
  selectors: {
    images: 'img.tile--img__img', // Selector for image thumbnails
    loadMoreButton: '.results--more a.result--more__btn', // Selector for the 'Load More' button
    consentButtons: [] // DDG typically doesn't have aggressive consent banners
  },
  scrolling: {
    strategy: 'load_more_button_or_scroll', // Clicks button if present, else scrolls
    maxAttempts: 15, // Max number of times to click 'load more' or scroll (config.maxScrollsDDG || 15)
    scrollDelay: 2000, // Fallback scroll delay (config.scrollDelayDDG || 2000)
    loadMoreTimeout: 10000, // Timeout after clicking 'load more' (config.loadMoreTimeoutDDG || 10000)
    useAutoScroll: true // Allows generic provider to scroll if button not found
  },
  imageExtraction: {
    type: 'attribute',
    attributes: ['src', 'data-src'], // DDG uses 'src' or 'data-src' for proxied image thumbnails
    filters: [] // No specific filters mentioned in old provider
  },
  fullSizeActions: {
    // DDG image URLs are proxied. The original URL is in the 'u' query parameter.
    type: 'url_param_decode', // New type: extracts and decodes a URL from a query parameter
    paramName: 'u',           // The name of the query parameter holding the original URL
    decode: true              // Specifies that the extracted parameter value should be URI decoded
  },
  playwrightOptions: {
    useLocators: true,
    waitOptions: { timeout: 30000 } // Default timeout from old provider
  },
  searchParamsConfig: {
    safeSearch: {
      paramName: 'kp', // The query parameter name for safe search
      onValue: '-1',   // Value when safe search is enabled
      offValue: '1'    // Value when safe search is disabled
    }
  }
};