export default {
  name: 'AdobeStock', // Matches provider name
  searchUrl: 'https://stock.adobe.com/search?k={query}', // Search URL for scraping
  selectors: {
    imageLinks: 'div.thumb-frame a', // Links to detail pages from thumb-frame
    thumbnail: 'img', // Thumbnail images within the links
    title: 'img', // Use image alt text as title
    // Consent buttons if any
    consentButtons: ['.evidon-banner-acceptbutton', '.accept-cookies-button'],
  },
  imageExtraction: {
    type: 'link_collection', // We're collecting links to detail pages
    baseUrl: 'https://stock.adobe.com', // For resolving relative URLs
  },
  scrolling: {
    strategy: 'infinite_scroll', // Adobe Stock uses infinite scrolling
    maxScrolls: 5, // Adjust as needed
    scrollDelay: 2000, // Wait 2 seconds between scrolls
    noNewImagesRetries: 2, // Stop after 2 attempts with no new images
  },
  fullSizeActions: {
    type: 'detail_page',
    // Important: We want to extract the src attribute from the image with data-t="details-thumbnail-image"
    selectors: ['img[data-t="details-thumbnail-image"]'], // Target the high-resolution preview image
    attribute: 'src', // Extract the src attribute which contains the actual image URL
    waitStrategy: 'locator', // Wait for the selector to be visible
    waitDelay: 2000, // Wait 2 seconds after navigation before extracting
    timeout: 15000, // Timeout for waiting on the image
    // Ensure we fully load the page before extracting the image URL
    navigationWaitUntil: 'networkidle', // Wait until network is idle to ensure image is loaded
  },
  playwrightOptions: {
    useLocators: true,
    waitOptions: { timeout: 60000 },
  },
  // Field to indicate API key requirement for this provider's primary mode
  requiresApiKey: true, 
  apiKeyInstructions: "Get your Adobe Stock API key from the Adobe Developer Console."
};
