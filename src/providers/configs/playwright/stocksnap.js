export default {
  name: 'StockSnap',
  searchUrl: 'https://stocksnap.io/search/{query}',
  selectors: {
    // Selects the anchor tags wrapping individual photos in the grid.
    imageLinks: 'div.photo-grid-item a',
    consentButtons: [] // Assuming no major consent buttons that block interaction.
  },
  scrolling: {
    // StockSnap loads results on a single page without infinite scroll or pagination buttons typically.
    // Setting maxScrolls to 0 effectively means no scrolling, just process initial load.
    strategy: 'infinite_scroll', // Using this strategy with maxScrolls: 0
    maxScrolls: 0,
    scrollDelay: 1000, // Not very relevant with maxScrolls: 0
    noNewImagesRetries: 0, // Not very relevant
    useAutoScroll: false
  },
  imageExtraction: {
    // Collects hrefs from 'imageLinks', which are paths to detail pages.
    type: 'link_collection',
    // The hrefs are relative paths, so they need the base URL prepended.
    baseUrl: 'https://stocksnap.io'
  },
  fullSizeActions: {
    type: 'detail_page',
    // On the detail page, this selector targets the main, expanded image.
    selectors: ['img.photo-expanded'],
    attribute: 'src', // The 'src' attribute of this image contains the full-size URL.
    waitStrategy: 'locator', // Wait for the image locator to be visible.
    timeout: 15000 // Timeout for waiting for the image on detail page (from old provider)
  },
  playwrightOptions: {
    useLocators: true,
    waitOptions: { timeout: 60000 } // General page navigation timeout
  }
};