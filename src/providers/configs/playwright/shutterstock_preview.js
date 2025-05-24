export default {
  name: 'Shutterstock (Preview)',
  searchUrl: 'https://www.shutterstock.com/search/{query}',
  selectors: {
    // Selects the anchor tags wrapping individual photos, leading to detail pages.
    imageLinks: 'div[data-automation="mosaic-grid-cell-link"] > a',
    consentButtons: ['button#onetrust-accept-btn-handler']
  },
  scrolling: {
    strategy: 'infinite_scroll',
    maxScrolls: 10, // Default from old provider: config.maxScrollsShutterstock || 10
    scrollDelay: 2500, // Default from old provider: config.scrollDelayShutterstock || 2500
    noNewImagesRetries: 3,
    useAutoScroll: true
  },
  imageExtraction: {
    type: 'link_collection',
    baseUrl: 'https://www.shutterstock.com' // hrefs are relative.
  },
  fullSizeActions: {
    type: 'detail_page',
    // On the detail page, this selector targets the main preview image.
    selectors: ['img[data-automation="preview-image-element"]'],
    // The 'src' attribute of this image contains the watermarked preview URL.
    attribute: 'src',
    waitStrategy: 'locator',
    timeout: 15000 // Timeout for waiting for the preview image.
  },
  playwrightOptions: {
    useLocators: true,
    waitOptions: { timeout: 60000 } // General page navigation timeout.
  }
};