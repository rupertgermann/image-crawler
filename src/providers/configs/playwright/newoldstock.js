export default {
  name: 'NewOldStock',
  // The official URL is https://nos.twnsnd.co/ - this might be a Tumblr or similar blog format.
  // Search functionality is often limited on such sites.
  // If there's no search, the {query} might be ignored or the URL might point to a main page / archive page.
  searchUrl: 'https://nos.twnsnd.co/', // Placeholder: Actual search/archive URL needed.
  selectors: {
    // These are common selectors for blog/portfolio type sites. USER MUST VERIFY AND UPDATE.
    imageLinks: 'article a[href*="photoid"], div.photo-entry a, figure a', // GUESS - link to a detail page or larger image
    images: 'article img, div.photo-entry img, figure img', // GUESS - direct image if no detail page
    // consentButtons: [], // Add if consent is observed manually
  },
  scrolling: {
    strategy: 'infinite_scroll', // GUESS - common for blog-style archives
    maxScrolls: 10,
    scrollDelay: 2000,
    noNewImagesRetries: 3,
    useAutoScroll: true
  },
  imageExtraction: {
    // This is a GUESS. If imageLinks point to detail pages:
    type: 'link_collection', 
    // If 'selectors.images' is used for direct image URLs:
    // type: 'attribute',
    // attribute: 'src', 
    // titleAttribute: 'alt', // if available
  },
  // itemProcessing: { // If titles need to be derived, similar to LittleVisuals
  //   title: {
  //     source: 'url_or_alt', 
  //     regex: "/([^/]+)(?:\.jpg|\.png)?$", // Example
  //     replace: '$1'
  //   }
  // },
  fullSizeActions: {
    // If 'link_collection' was used for imageExtraction:
    type: 'detail_page', 
    selectors: ['img.full-photo, div.main-image img'], // GUESS - selector for full image on detail page
    attribute: 'src',
    // If 'attribute' extraction gave direct full images:
    // type: 'direct',
    waitStrategy: 'locator',
    timeout: 10000
  },
  playwrightOptions: {
    useLocators: true,
    waitOptions: { timeout: 60000 }
  },
  notes: "Scrapes vintage photos from New Old Stock. The site was blocked by robots.txt for automated inspection, so all selectors and behaviors are INITIAL GUESSES and MUST BE VERIFIED AND UPDATED by the user after manual site inspection. Search query might be ignored if it's a browse-only archive."
};
