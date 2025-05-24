export default {
  name: 'FreeImages',
  searchUrl: 'https://www.freeimages.com/search/{query}',
  selectors: {
    // Selects the anchor tags that wrap the mosaic/thumbnail images, leading to detail pages.
    imageLinks: 'div.MosaicAsset-module__container___L9x3s > a',
    consentButtons: ['button#onetrust-accept-btn-handler']
  },
  scrolling: {
    strategy: 'infinite_scroll',
    maxScrolls: 10, // Default from old provider: config.maxScrollsFreeImages || 10
    scrollDelay: 2500, // Default from old provider: config.scrollDelayFreeImages || 2500
    noNewImagesRetries: 3, // If no new images after 3 scrolls, stop.
    useAutoScroll: true
  },
  imageExtraction: {
    // Collects hrefs from 'imageLinks' which are detail page URLs.
    type: 'link_collection',
    // Ensures collected links are for the FreeImages domain.
    filters: [`^${'https://www.freeimages.com'}`] // Filter to ensure links start with the base URL
  },
  fullSizeActions: {
    type: 'detail_page',
    // On the detail page, this selector targets the main image.
    selectors: ['img[data-testid="photo-details-image"]'],
    attribute: 'src', // The 'src' attribute of this image contains the full-size URL.
    waitStrategy: 'locator', // Wait for the image locator to be visible.
    timeout: 10000 // Timeout for waiting for the image on detail page
  },
  playwrightOptions: {
    useLocators: true,
    waitOptions: { timeout: 60000 } // General page navigation timeout
  }
};