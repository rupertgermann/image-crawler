export default {
  name: 'Dreamstime',
  searchUrl: 'https://www.dreamstime.com/search.php?srh_field={query}', // Example
  selectors: {
    imageLinks: 'div.item a.item-product', // Placeholder
    // ... other placeholder selectors ...
    consentButtons: [],
  },
  imageExtraction: { // Placeholder
    type: 'attribute_collection', // Example, might be 'link_collection' or other
    baseUrl: 'https://www.dreamstime.com', // If URLs are relative
    detailPageUrlAttribute: 'href',
    // thumbnailUrlAttribute: 'src', // From a nested img if imageLinks is the anchor
    // titleAttribute: 'alt', // Or 'innerText' from a title element
  },
  fullSizeActions: { // Placeholder for scraping detail page
    type: 'detail_page',
    selectors: ['img.main-preview-image'], // Placeholder for full-size image on detail page
    attribute: 'src',
    waitStrategy: 'locator',
    timeout: 15000,
    navigationWaitUntil: 'domcontentloaded',
  },
  playwrightOptions: { 
    useLocators: true,
    waitOptions: { timeout: 60000 },
  },
  requiresApiKey: true, // For API mode
  apiKeyInstructions: "Request API access and documentation from Dreamstime developers page (www.dreamstime.com/dreamstime-api)."
};
