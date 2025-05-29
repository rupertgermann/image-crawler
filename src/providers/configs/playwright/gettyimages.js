export default {
  name: 'GettyImages',
  searchUrl: 'https://www.gettyimages.com/search/2/image?phrase={query}', // Example
  selectors: {
    imageLinks: 'article.gallery-asset__container a', // Placeholder
    // ... other placeholder selectors for thumbnail, title if needed for scraping ...
    consentButtons: [],
  },
  imageExtraction: { // Placeholder
    type: 'attribute_collection', // Example, might be 'link_collection' or other
    baseUrl: 'https://www.gettyimages.com', // If URLs are relative
    detailPageUrlAttribute: 'href',
    // thumbnailUrlAttribute: 'src', // From a nested img if imageLinks is the anchor
    // titleAttribute: 'alt', // Or 'innerText' from a title element
  },
  fullSizeActions: { // Placeholder for scraping detail page
    type: 'detail_page',
    selectors: ['img.asset-view__preview-image'], // Placeholder for full-size image on detail page
    attribute: 'src',
    waitStrategy: 'locator',
    timeout: 15000,
    navigationWaitUntil: 'domcontentloaded',
  },
  playwrightOptions: { 
    useLocators: true,
    waitOptions: { timeout: 60000 },
  },
  requiresApiKey: true,
  apiKeyInstructions: "Get your Getty Images API key from their developer portal."
};
