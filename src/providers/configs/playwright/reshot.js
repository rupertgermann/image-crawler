export default {
  name: 'Reshot',
  searchUrl: 'https://www.reshot.com/search/{query}/',
  selectors: {
    // Selects the anchor tags wrapping individual photos, leading to detail pages.
    imageLinks: 'div.photo-grid__item-container > a.photo-grid__photo-link',
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
    baseUrl: 'https://www.reshot.com' // hrefs are relative.
  },
  fullSizeActions: {
    type: 'detail_page',
    // On the detail page, this selector targets the download button/link.
    selectors: ['a.button.button--download'],
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