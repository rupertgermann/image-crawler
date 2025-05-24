export default {
  name: 'Google',
  searchUrl: 'https://www.google.com/imghp?q={query}&safe=active&hl=en',
  selectors: {
    images: 'img[data-src], img[src^="http"]',
    consentButtons: [
      'button[aria-label="Accept all"]',
      'button[aria-label="Alles akzeptieren"]', // German
      'button[aria-label="Tout accepter"]', // French
      'button[aria-label="Accetta tutto"]', // Italian
      'button[aria-label="Aceptar todo"]' // Spanish
    ],
    showMoreButton: 'input[type="button"][value="Show more results"]' // This might need to be language-agnostic or have alternatives
  },
  scrolling: {
    strategy: 'infinite_scroll', // Or 'manual' if 'showMoreButton' is reliable
    maxScrolls: 20,
    scrollDelay: 2000,
    noNewImagesRetries: 3,
    useAutoScroll: true
  },
  imageExtraction: {
    type: 'attribute',
    attributes: ['data-src', 'src'],
    filters: ['!gstatic.com/images', '!googlelogo_color', '!google.com/logos'] // Filters to avoid logos/icons
  },
  fullSizeActions: {
    type: 'direct' // Google search results often link directly to a version of the image, or a page close to it.
                   // True full-size might require clicking the thumbnail and extracting from the side panel, which is more complex.
  },
  playwrightOptions: {
    useLocators: true,
    waitOptions: { timeout: 5000, state: 'visible' }
  }
};