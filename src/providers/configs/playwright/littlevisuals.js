export default {
  name: 'LittleVisuals',
  // The searchUrl will be the main page. The {query} will be ignored by this provider's nature.
  searchUrl: 'http://littlevisuals.co/', 
  selectors: {
    // Selector for the <a> tags that directly link to the JPG images on CloudFront.
    // The actual image URLs are in the href attribute of these <a> tags.
    // The images themselves are displayed via <img> tags inside these <a> tags, but we need the <a> href.
    imageLinks: 'a[href*="cloudfront.net/"][href$=".jpg"]', 
    consentButtons: [] // No consent buttons observed
  },
  scrolling: {
    strategy: 'none', // Or 'manual' with maxScrolls: 0
    maxScrolls: 0,    // All content is on one page
    useAutoScroll: false
  },
  imageExtraction: {
    // We are extracting the href from the <a> tags, which is the direct image URL.
    type: 'attribute', 
    attribute: 'href', // Extract the href directly
    // No baseUrl needed as hrefs are absolute.
    // No specific thumbnail extraction needed if imageLinks directly gives full images.
    // However, GenericPlaywrightProvider might expect imageInfo objects with thumbnailUrl and fullSizeUrl.
    // For this provider, thumbnailUrl and fullSizeUrl will be the same.
    // We also need a title, which is missing. We can use the filename as a title.
  },
  itemProcessing: { // Custom function to generate titles
    title: {
      source: 'url', // Use the URL to generate a title
      // Regex to extract a filename-like part for the title
      // e.g., from https://d33wubrfki0l68.cloudfront.net/c5c10ea4aed4a37e0e9873468d5586611fcfba92/25351/images/747.jpg -> 747
      regex: "/([^/]+)\.jpg$",
      replace: '$1'
    }
  },
  fullSizeActions: {
    // The URL extracted by imageExtraction is already the full-size image.
    type: 'direct' 
  },
  playwrightOptions: {
    useLocators: true,
    waitOptions: { timeout: 60000 }
  },
  notes: "Scrapes all available images from the Little Visuals archive page. The search query is ignored."
};
