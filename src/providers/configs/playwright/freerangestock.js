export default {
  name: 'FreeRangeStock',
  // Query needs to be lowercased and spaces replaced with hyphens.
  searchUrl: 'https://freerangestock.com/search/{query}/',
  queryTransformations: ['toLowerCase', 'spacesToHyphens'], // New field for generic provider to handle
  selectors: {
    // Selects the anchor tags wrapping individual photos, leading to detail pages.
    imageLinks: 'div.photo-list a.photo-list__item',
    consentButtons: [] // Assuming no major consent buttons.
  },
  scrolling: {
    // Processes only initially loaded images.
    strategy: 'infinite_scroll',
    maxScrolls: 0,
    scrollDelay: 1000,
    noNewImagesRetries: 0,
    useAutoScroll: false
  },
  imageExtraction: {
    type: 'link_collection',
    baseUrl: 'https://freerangestock.com' // hrefs can be relative.
  },
  fullSizeActions: {
    type: 'detail_page',
    // On the detail page, this selector targets the download button/link.
    selectors: ['a.download-button'],
    // The 'href' of this download button is the direct full-size image URL.
    attribute: 'href',
    waitStrategy: 'locator',
    timeout: 15000 // Timeout for waiting for the download button.
  },
  playwrightOptions: {
    useLocators: true,
    waitOptions: { timeout: 60000 } // General page navigation timeout.
  }
};