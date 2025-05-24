export default {
  name: 'Pixabay',
  searchUrl: 'https://pixabay.com/images/search/{query}/?safesearch=true',
  selectors: {
    imageLinks: 'div.item > a', // Links to detail pages
    consentButtons: [] // Pixabay might not have a prominent cookie banner on search results
  },
  scrolling: {
    strategy: 'infinite_scroll', // Or could be paginated, check website
    maxScrolls: 10,
    scrollDelay: 2000,
    noNewImagesRetries: 3,
    useAutoScroll: true
  },
  imageExtraction: {
    type: 'link_collection' // Collects hrefs from 'imageLinks' to visit detail pages
  },
  fullSizeActions: {
    type: 'detail_page',
    // Selectors for the full-size image on the detail page
    selectors: [
      'img[srcset*="__large"]', // Often a good indicator
      'div.media_wrapper img',
      'a[href*="/download/"]', // Download link might lead to image or another page
      'picture > source[srcset]',
      'img[src*="pixabay.com/get/"]'
    ],
    waitStrategy: 'locator'
  },
  playwrightOptions: {
    useLocators: true
  }
};