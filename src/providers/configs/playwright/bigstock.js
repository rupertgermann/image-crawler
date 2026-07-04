export default {
  name: 'Bigstock', // Matches provider name
  searchUrl: 'https://www.bigstockphoto.com/search/{query}/', // Example scraping search URL
  selectors: { // Placeholders for scraping
    imageLinks: 'a.search-result-thumbnail', 
    // ... other placeholder selectors ...
    consentButtons: [],
  },
  // requiresApiKey: false, // Set to true if an API is found and used
  apiKeyInstructions: "If a Bigstock API exists and you have a key, enter it. Otherwise, this might be scraping-only. API documentation was not found during initial search."
};
