export default {
  name: 'Bing',
  searchUrl: 'https://www.bing.com/images/search?q={query}&form=HDRSC2&first=1&tsc=ImageBasicHover&safesearch=strict',
  selectors: {
    thumbnails: 'a.iusc', // Selector for the thumbnail links/containers
    consentButtons: ['#bnp_btn_accept', 'button[aria-label="Accept"]'],
    lightboxImages: ['#iv_stage img#mainImage', '.ivg_img.loaded', 'img.nofocus'] // Selectors for the image inside the lightbox
  },
  scrolling: {
    strategy: 'infinite_scroll',
    maxScrolls: 15,
    scrollDelay: 2000,
    noNewImagesRetries: 3,
    useAutoScroll: true
  },
  imageExtraction: {
    // Bing thumbnails often have a 'm' attribute with JSON data containing 'murl' (media URL)
    type: 'json_attribute',
    attribute: 'm',
    jsonPath: 'murl',
    fallback: {
      // If 'murl' is not found, try to get 'src' from a nested img
      type: 'nested_attribute',
      selector: 'img',
      attributes: ['src', 'data-src']
    }
  },
  fullSizeActions: {
    type: 'lightbox',
    clickTarget: 'self', // 'self' means click the thumbnail element itself (a.iusc)
    waitStrategy: 'locator', // Wait for lightbox image selector
    imageSelectors: ['#iv_stage img#mainImage', '.ivg_img.loaded', 'img.nofocus'],
    waitDelay: 1500 // Fallback delay if locator strategy needs more time
  },
  playwrightOptions: {
    useLocators: true
  }
};