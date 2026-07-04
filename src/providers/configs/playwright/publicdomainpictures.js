export default {
  name: 'PublicDomainPictures',
  searchUrl: 'https://www.publicdomainpictures.net/en/hledej.php?hleda={query}',
  selectors: {
    // Selects the anchor tags wrapping individual photo thumbnails.
    imageLinks: 'a[href*="view-image.php?image="]',
    consentButtons: [] // Assuming no major consent buttons.
  },
  scrolling: {
    // Processes only initially loaded images.
    strategy: 'manual',
    maxScrolls: 0,
    scrollDelay: 1000,
    noNewImagesRetries: 0,
    useAutoScroll: false,
    showMoreButton: 'div.strankovani a:has-text("[ Next ]")'
  },
  imageExtraction: {
    type: 'link_collection',
    // Both detail page URLs and thumbnail URLs can be relative.
    baseUrl: 'https://www.publicdomainpictures.net'
  },
  fullSizeActions: {
    type: 'detail_page',
    // On the detail page, this selector targets the download link.
    selectors: ['a[href*="/velka/"]'], // Changed property
    // The 'href' of this download link is the direct full-size image URL.
    attribute: 'href',
    waitStrategy: 'locator',
    timeout: 15000,
    navigationWaitUntil: 'domcontentloaded'
  },
  playwrightOptions: {
    useLocators: true,
    waitOptions: { timeout: 60000 } // General page navigation timeout.
  }
};