export default {
  name: 'AdobeStock', // Matches provider name
  searchUrl: 'https://stock.adobe.com/search?k={query}', // Example search URL for scraping
  selectors: {
    imageLinks: 'div.search-results a.item-link', // Placeholder
    thumbnail: 'img.thumbnail-img', // Placeholder
    title: 'span.title-span', // Placeholder
    // Consent buttons if any
    consentButtons: [],
  },
  imageExtraction: {
    type: 'attribute_collection', // Or 'link_collection' depending on structure
    baseUrl: 'https://stock.adobe.com', // If URLs are relative
    detailPageUrlAttribute: 'href',
    thumbnailUrlAttribute: 'src',
    titleAttribute: 'alt', // Or 'innerText' from a title element
  },
  fullSizeActions: {
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
  // Field to indicate API key requirement for this provider's primary mode
  requiresApiKey: true, 
  apiKeyInstructions: "Get your Adobe Stock API key from the Adobe Developer Console."
};
