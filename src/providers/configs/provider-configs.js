export const PROVIDER_CONFIGS = {
  google: {
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
  },
  
  bing: {
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
  },
  
  pixabay: {
    name: 'Pixabay',
    searchUrl: 'https://pixabay.com/images/search/{query}/?safesearch=true',
    selectors: {
      imageLinks: 'div.item > a', // Links to detail pages
      consentButtons: [] // Pixabay might not have a prominent cookie banner on search results
    },
    scrolling: {
      strategy: 'infinite_scroll', // Or could be paginated, check website
      maxScrolls: 10,
      scrollDelay: 2000,
      noNewImagesRetries: 3,
      useAutoScroll: true
    },
    imageExtraction: {
      type: 'link_collection' // Collects hrefs from 'imageLinks' to visit detail pages
    },
    fullSizeActions: {
      type: 'detail_page',
      // Selectors for the full-size image on the detail page
      selectors: [
        'img[srcset*="__large"]', // Often a good indicator
        'div.media_wrapper img', 
        'a[href*="/download/"]', // Download link might lead to image or another page
        'picture > source[srcset]',
        'img[src*="pixabay.com/get/"]'
      ],
      waitStrategy: 'locator'
    },
    playwrightOptions: {
      useLocators: true
    }
  },

  unsplash: {
    name: 'Unsplash',
    searchUrl: 'https://unsplash.com/s/photos/{query}',
    selectors: {
      // Main selector for images. Unsplash uses srcset extensively.
      images: 'figure a[href*="/photos/"] img[srcset]',
      consentButtons: [] // Typically no major consent banners on results page
    },
    scrolling: {
      strategy: 'infinite_scroll',
      maxScrolls: 15, // Default from old provider: config.maxScrollsUnsplash || 15
      scrollDelay: 2500, // Default from old provider: config.scrollDelayUnsplash || 2500
      noNewImagesRetries: 3, // Default from old provider: config.noNewImagesRetriesUnsplash || 3
      useAutoScroll: true // Generic provider will handle window.scrollTo if true
    },
    imageExtraction: {
      // The old provider specifically parsed srcset and took the last URL.
      // The generic 'attribute' type currently takes the first non-empty attribute value.
      // This might need a new 'srcset_parser' type or enhancement to 'attribute' type later.
      // For now, we'll target 'srcset'. The actual parsing logic is in `getFullSizeImage`'s `detail_page` action.
      // We might need to move that srcset parsing to a utility or into the extraction itself.
      type: 'attribute',
      attributes: ['srcset'], // Primary target is srcset
      // The old provider extracted the last URL from srcset. We'll rely on getFullSizeImage for robust URL cleaning/selection from srcset if needed.
      // Filters are not explicitly mentioned in old provider, but good to have placeholders.
      filters: ['!images.unsplash.com/profile-', '!images.unsplash.com/placeholder-'] // Avoid profile pics, placeholders
    },
    fullSizeActions: {
      // Unsplash URLs from srcset are often high-res but can have sizing params.
      type: 'url_cleaning',
      removeParams: ['w', 'h', 'fit', 'crop', 'q', 'fm', 'auto', 'ixlib', 'cs'] // Common Unsplash params to get base URL
    },
    playwrightOptions: {
      useLocators: true,
      waitOptions: { timeout: 5000, state: 'visible' }
    }
  },

  duckduckgo: {
    name: 'DuckDuckGo',
    // kp=-1 for safesearch on, kp=1 for safesearch off.
    // The generic provider will need to replace {safeSearchParam} based on options.
    searchUrl: 'https://duckduckgo.com/?q={query}&iax=images&ia=images&kp={safeSearchParam}',
    selectors: {
      images: 'img.tile--img__img', // Selector for image thumbnails
      loadMoreButton: '.results--more a.result--more__btn', // Selector for the 'Load More' button
      consentButtons: [] // DDG typically doesn't have aggressive consent banners
    },
    scrolling: {
      strategy: 'load_more_button_or_scroll', // Clicks button if present, else scrolls
      maxAttempts: 15, // Max number of times to click 'load more' or scroll (config.maxScrollsDDG || 15)
      scrollDelay: 2000, // Fallback scroll delay (config.scrollDelayDDG || 2000)
      loadMoreTimeout: 10000, // Timeout after clicking 'load more' (config.loadMoreTimeoutDDG || 10000)
      useAutoScroll: true // Allows generic provider to scroll if button not found
    },
    imageExtraction: {
      type: 'attribute',
      attributes: ['src', 'data-src'], // DDG uses 'src' or 'data-src' for proxied image thumbnails
      filters: [] // No specific filters mentioned in old provider
    },
    fullSizeActions: {
      // DDG image URLs are proxied. The original URL is in the 'u' query parameter.
      type: 'url_param_decode', // New type: extracts and decodes a URL from a query parameter
      paramName: 'u',           // The name of the query parameter holding the original URL
      decode: true              // Specifies that the extracted parameter value should be URI decoded
    },
    playwrightOptions: {
      useLocators: true,
      waitOptions: { timeout: 30000 } // Default timeout from old provider
    },
    searchParamsConfig: {
      safeSearch: {
        paramName: 'kp', // The query parameter name for safe search
        onValue: '-1',   // Value when safe search is enabled
        offValue: '1'    // Value when safe search is disabled
      }
    }
  },

  freeimages: {
    name: 'FreeImages',
    searchUrl: 'https://www.freeimages.com/search/{query}',
    selectors: {
      // Selects the anchor tags that wrap the mosaic/thumbnail images, leading to detail pages.
      imageLinks: 'div.MosaicAsset-module__container___L9x3s > a',
      consentButtons: ['button#onetrust-accept-btn-handler']
    },
    scrolling: {
      strategy: 'infinite_scroll',
      maxScrolls: 10, // Default from old provider: config.maxScrollsFreeImages || 10
      scrollDelay: 2500, // Default from old provider: config.scrollDelayFreeImages || 2500
      noNewImagesRetries: 3, // If no new images after 3 scrolls, stop.
      useAutoScroll: true
    },
    imageExtraction: {
      // Collects hrefs from 'imageLinks' which are detail page URLs.
      type: 'link_collection',
      // Ensures collected links are for the FreeImages domain.
      filters: [`^${'https://www.freeimages.com'}`] // Filter to ensure links start with the base URL
    },
    fullSizeActions: {
      type: 'detail_page',
      // On the detail page, this selector targets the main image.
      selectors: ['img[data-testid="photo-details-image"]'],
      attribute: 'src', // The 'src' attribute of this image contains the full-size URL.
      waitStrategy: 'locator', // Wait for the image locator to be visible.
      timeout: 10000 // Timeout for waiting for the image on detail page
    },
    playwrightOptions: {
      useLocators: true,
      waitOptions: { timeout: 60000 } // General page navigation timeout
    }
  },

  stocksnap: {
    name: 'StockSnap',
    searchUrl: 'https://stocksnap.io/search/{query}',
    selectors: {
      // Selects the anchor tags wrapping individual photos in the grid.
      imageLinks: 'div.photo-grid-item a',
      consentButtons: [] // Assuming no major consent buttons that block interaction.
    },
    scrolling: {
      // StockSnap loads results on a single page without infinite scroll or pagination buttons typically.
      // Setting maxScrolls to 0 effectively means no scrolling, just process initial load.
      strategy: 'infinite_scroll', // Using this strategy with maxScrolls: 0
      maxScrolls: 0, 
      scrollDelay: 1000, // Not very relevant with maxScrolls: 0
      noNewImagesRetries: 0, // Not very relevant
      useAutoScroll: false
    },
    imageExtraction: {
      // Collects hrefs from 'imageLinks', which are paths to detail pages.
      type: 'link_collection',
      // The hrefs are relative paths, so they need the base URL prepended.
      baseUrl: 'https://stocksnap.io' 
    },
    fullSizeActions: {
      type: 'detail_page',
      // On the detail page, this selector targets the main, expanded image.
      selectors: ['img.photo-expanded'],
      attribute: 'src', // The 'src' attribute of this image contains the full-size URL.
      waitStrategy: 'locator', // Wait for the image locator to be visible.
      timeout: 15000 // Timeout for waiting for the image on detail page (from old provider)
    },
    playwrightOptions: {
      useLocators: true,
      waitOptions: { timeout: 60000 } // General page navigation timeout
    }
  },
  
  freerangestock: {
    name: 'FreeRangeStock',
    // Query needs to be lowercased and spaces replaced with hyphens.
    searchUrl: 'https://freerangestock.com/search/{query}/', 
    queryTransformations: ['toLowerCase', 'spacesToHyphens'], // New field for generic provider to handle
    selectors: {
      // Selects the anchor tags wrapping individual photos, leading to detail pages.
      imageLinks: 'div.photo-list a.photo-list__item',
      consentButtons: [] // Assuming no major consent buttons.
    },
    scrolling: {
      // Processes only initially loaded images.
      strategy: 'infinite_scroll',
      maxScrolls: 0, 
      scrollDelay: 1000,
      noNewImagesRetries: 0,
      useAutoScroll: false
    },
    imageExtraction: {
      type: 'link_collection',
      baseUrl: 'https://freerangestock.com' // hrefs can be relative.
    },
    fullSizeActions: {
      type: 'detail_page',
      // On the detail page, this selector targets the download button/link.
      selectors: ['a.download-button'],
      // The 'href' of this download button is the direct full-size image URL.
      attribute: 'href', 
      waitStrategy: 'locator', 
      timeout: 15000 // Timeout for waiting for the download button.
    },
    playwrightOptions: {
      useLocators: true,
      waitOptions: { timeout: 60000 } // General page navigation timeout.
    }
  },

  publicdomainpictures: {
    name: 'PublicDomainPictures',
    searchUrl: 'https://www.publicdomainpictures.net/en/hledej.php?hleda={query}',
    selectors: {
      // Selects the anchor tags wrapping individual photo thumbnails.
      imageLinks: 'div.thumbnail_container a.thumbnail',
      consentButtons: [] // Assuming no major consent buttons.
    },
    scrolling: {
      // Processes only initially loaded images.
      strategy: 'infinite_scroll',
      maxScrolls: 0,
      scrollDelay: 1000,
      noNewImagesRetries: 0,
      useAutoScroll: false
    },
    imageExtraction: {
      type: 'link_collection',
      // Both detail page URLs and thumbnail URLs can be relative.
      baseUrl: 'https://www.publicdomainpictures.net'
    },
    fullSizeActions: {
      type: 'detail_page',
      // On the detail page, this selector targets the download link.
      selectors: ['a.download'],
      // The 'href' of this download link is the direct full-size image URL.
      attribute: 'href',
      waitStrategy: 'locator',
      timeout: 15000 // Timeout for waiting for the download link.
    },
    playwrightOptions: {
      useLocators: true,
      waitOptions: { timeout: 60000 } // General page navigation timeout.
    }
  },
  
  reshot: {
    name: 'Reshot',
    searchUrl: 'https://www.reshot.com/search/{query}',
    selectors: {
      // Selects anchor tags whose href starts with "/photo/", leading to detail pages.
      imageLinks: 'a[href^="/photo/"]',
      consentButtons: [] // Assuming no major consent buttons.
    },
    scrolling: {
      // Processes only initially loaded images.
      strategy: 'infinite_scroll',
      maxScrolls: 0,
      scrollDelay: 1000,
      noNewImagesRetries: 0,
      useAutoScroll: false
    },
    imageExtraction: {
      type: 'link_collection',
      // Detail page URLs are relative paths.
      baseUrl: 'https://www.reshot.com'
    },
    fullSizeActions: {
      type: 'detail_page',
      // On the detail page, this selector targets the download link (an anchor with a 'download' attribute).
      selectors: ['a[download]'],
      // The 'href' of this download link is the direct full-size image URL.
      attribute: 'href',
      waitStrategy: 'locator',
      timeout: 15000 // Timeout for waiting for the download link.
    },
    playwrightOptions: {
      useLocators: true,
      waitOptions: { timeout: 60000 } // General page navigation timeout.
    }
  },
  
  shutterstock_preview: { // Explicitly naming it for preview mode
    name: 'Shutterstock (Preview)',
    searchUrl: 'https://www.shutterstock.com/search?searchterm={query}',
    selectors: {
      // Selects anchor tags leading to image or vector detail pages.
      imageLinks: 'a[href*="/image-photo/"], a[href*="/image-vector/"]',
      // Common consent button text/ID for Shutterstock, may need adjustment.
      consentButtons: ['button#onetrust-accept-btn-handler', 'button[data-track-label="acceptAll"]'] 
    },
    scrolling: {
      // Processes only initially loaded images for previews.
      strategy: 'infinite_scroll',
      maxScrolls: 0, 
      scrollDelay: 1000,
      noNewImagesRetries: 0,
      useAutoScroll: false
    },
    imageExtraction: {
      type: 'link_collection',
      baseUrl: 'https://www.shutterstock.com' // Detail page URLs can be relative.
    },
    fullSizeActions: {
      type: 'detail_page',
      // On the detail page, try these selectors in order to find the main preview image.
      // Case-insensitive attribute matching (like alt*="..." i) is not standard CSS.
      // These will be treated as substring matches by Playwright's CSS engine.
      selectors: [
        'img[data-automation="asset-preview-image"]',
        'img[alt*="stock photo"]', // Playwright CSS treats this as substring 'stock photo'
        'img[alt*="royalty-free"]', // Playwright CSS treats this as substring 'royalty-free'
        'img[src*="image-assets.shutterstock.com/image-photo"]',
        'img[src*="image-assets.shutterstock.com/image-vector"]'
      ],
      attribute: 'src', // The 'src' attribute of the found image contains the preview URL.
      waitStrategy: 'locator_any', // Wait for any of the selectors to yield a visible element.
      timeout: 3000 // Timeout for each selector attempt on the detail page.
    },
    playwrightOptions: {
      useLocators: true,
      waitOptions: { timeout: 60000 } // General page navigation timeout.
    }
  }
  // ... configurations for other providers will be added here
};
