import BaseProvider from './base-provider.js';

// Define strategies for getting full-size images
const FULL_SIZE_ACTIONS = {
  DIRECT: direct, // The extracted URL is already the full-size image
  LIGHTBOX: lightbox, // Action to handle lightbox-style image viewers
  DETAIL_PAGE: detail_page, // Need to visit a detail page to get the full-size image
  URL_CLEANING: url_cleaning, // The URL needs parameters removed/modified
  URL_PARAM_DECODE: url_param_decode // The URL is encoded in a query parameter of the thumbnail URL
};

// Handler for direct image URLs (no action needed, or simple validation)
async function direct(page, imageUrl, actionConfig, providerInstance) {
  providerInstance.emitLog('debug', `Full size action 'direct' for ${imageUrl}`);
  return imageUrl;
}

// Handler for lightbox-style image viewers
async function lightbox(page, itemUrlOrContext, actionConfig, providerInstance) {
  // itemUrlOrContext could be the thumbnail src or a more complex object if needed
  // For now, assume it's the URL that was associated with the clickable element.
  providerInstance.emitLog('debug', `Full size action 'lightbox' for item related to: ${itemUrlOrContext}`);
  const { clickTarget, imageSelectors, waitStrategy, waitDelay = 1000 } = actionConfig;

  if (!clickTarget || !imageSelectors || !imageSelectors.length) {
    providerInstance.emitLog('error', 'Lightbox action config missing clickTarget or imageSelectors.');
    return typeof itemUrlOrContext === 'string' ? itemUrlOrContext : null;
  }

  // This assumes 'clickTarget' is a selector that can be found and clicked.
  // If 'clickTarget' is 'self', it implies the thumbnail itself was clicked to open the lightbox.
  // The challenge is relating itemUrlOrContext back to a clickable locator if it's not the element itself.
  // For now, this part of the logic might need refinement based on how thumbnails are collected and passed.
  // Let's assume for now that the click that triggered the lightbox has already happened
  // or the `itemUrlOrContext` IS the selector for the thumbnail to be clicked.

  // If clickTarget is 'self', we assume the thumbnail that led to this call IS the clickTarget.
  // This part is tricky because fetchImageUrls gives us image URLs, not necessarily locators.
  // This needs to be re-evaluated: how do we get back to the clickable thumbnail from just its URL?
  // For now, we'll proceed with a simplified assumption or focus on cases where the click is straightforward.

  // Let's assume the click to open the lightbox has already been performed by the user or a prior step if not 'self'.
  // If the clickTarget is a specific selector for the thumbnail:
  // const thumbnailLocator = page.locator(clickTarget).filter({ hasText: itemUrlOrContext }); // This is a guess
  // await thumbnailLocator.click();

  providerInstance.emitLog('info', `Waiting for lightbox image using selectors: ${imageSelectors.join(', ')}`);

  let fullImageUrl = null;
  try {
    const lightboxImageLocator = page.locator(imageSelectors.join(', ')).first();
    if (waitStrategy === 'locator') {
      await lightboxImageLocator.waitFor({ state: 'visible', timeout: actionConfig.timeout || 5000 });
    } else {
      await page.waitForTimeout(waitDelay); // Fallback to simple delay
    }
    fullImageUrl = await lightboxImageLocator.getAttribute('src');
    if (!fullImageUrl) {
       fullImageUrl = await lightboxImageLocator.evaluate(node => node.currentSrc || node.src);
    }
  } catch (e) {
    providerInstance.emitLog('warn', `Lightbox image not found or timed out with selectors ${imageSelectors.join(', ')}: ${e.message}`);
    return typeof itemUrlOrContext === 'string' ? itemUrlOrContext : null; // Fallback
  }
  
  providerInstance.emitLog('debug', `Lightbox extracted full image: ${fullImageUrl}`);
  return fullImageUrl || (typeof itemUrlOrContext === 'string' ? itemUrlOrContext : null);
}

// Handler for detail page full-size image extraction
async function detail_page(page, detailPageUrl, actionConfig, providerInstance) {
  providerInstance.emitLog('debug', `Full size action 'detail_page' for ${detailPageUrl}`);
  const { selectors, attribute = 'src', waitStrategy, waitDelay = 1500 } = actionConfig; // Added attribute

  if (!selectors || !selectors.length) {
    providerInstance.emitLog('error', 'Detail page action config missing selectors.');
    return detailPageUrl;
  }

  try {
    providerInstance.emitLog('debug', `Navigating to detail page: ${detailPageUrl}`);
    await page.goto(detailPageUrl, { waitUntil: actionConfig.navigationWaitUntil || 'networkidle', timeout: actionConfig.navigationTimeout || 30000 });
    providerInstance.emitLog('info', `Navigated to detail page: ${detailPageUrl}`);
    
    const imageLocator = page.locator(selectors.join(', ')).first();
    providerInstance.emitLog('debug', `Waiting for selector '${selectors.join(', ')}' on detail page.`);
    if (waitStrategy === 'locator') {
      await imageLocator.waitFor({ state: 'visible', timeout: actionConfig.timeout || 7000 });
    } else {
      await page.waitForTimeout(waitDelay);
    }
    providerInstance.emitLog('debug', `Selector '${selectors.join(', ')}' is visible.`);
    
    let fullImageUrl = null;
    if (attribute.toLowerCase() === 'href') {
        fullImageUrl = await imageLocator.getAttribute('href');
        providerInstance.emitLog('debug', `Extracted href attribute: ${fullImageUrl}`);
    } else {
        fullImageUrl = await imageLocator.getAttribute('src');
        if (!fullImageUrl) fullImageUrl = await imageLocator.evaluate(node => node.currentSrc || node.src);
        providerInstance.emitLog('debug', `Extracted src/currentSrc attribute: ${fullImageUrl}`);
        
        // Handle srcset if present and src was not found directly
        if (!fullImageUrl) {
          const srcset = await imageLocator.getAttribute('srcset');
          if (srcset) {
            providerInstance.emitLog('debug', `Found srcset: ${srcset}`);
            // Basic parsing: take the last URL, often highest resolution
            const sources = srcset.split(',').map(s => s.trim().split(' ')[0]);
            fullImageUrl = sources.pop(); 
            providerInstance.emitLog('debug', `Extracted from srcset: ${fullImageUrl}`);
          }
        }
    }
    
    // Handle relative URLs by converting them to absolute
    if (fullImageUrl && !(fullImageUrl.startsWith('http:') || fullImageUrl.startsWith('https:'))) {
        // Use baseUrl from actionConfig if available, otherwise from providerInstance.providerConfig
        const baseUrl = (actionConfig && actionConfig.baseUrl) || 
                       (providerInstance && providerInstance.providerConfig && providerInstance.providerConfig.imageExtraction && 
                        providerInstance.providerConfig.imageExtraction.baseUrl) || 
                       detailPageUrl;
        
        try {
            fullImageUrl = new URL(fullImageUrl, baseUrl).toString();
            providerInstance.emitLog('debug', `Resolved relative URL to absolute: ${fullImageUrl}`);
        } catch (e) {
            providerInstance.emitLog('warn', `Failed to resolve relative URL: ${fullImageUrl} with base ${baseUrl}: ${e.message}`);
        }
    }

    if (fullImageUrl) {
      providerInstance.emitLog('info', `Detail page extracted full image URL: ${fullImageUrl}`);
      return fullImageUrl; // Return the extracted image URL - this is key
    } else {
      providerInstance.emitLog('warn', `No image URL found on detail page, not using fallback`);
      return null; // Return null instead of falling back to the detail page URL
    }
  } catch (e) {
    providerInstance.emitLog('warn', `Failed to get image from detail page ${detailPageUrl}: ${e.message}`);
    return null; // Return null instead of falling back to the detail page URL
  }
}


// Helper to access providerConfig within static/external functions if needed
let providerConfigGetter = () => null;
function setProviderConfigGetter(getter) {
    providerConfigGetter = getter;
}
function getProviderConfig() {
    return providerConfigGetter();
  }

// Handler for URL cleaning (remove parameters)
async function url_cleaning(page, imageUrlOrContext, actionConfig, providerInstance) {
  // Extract the URL if we received an object or context
  let imageUrl = imageUrlOrContext;
  if (typeof imageUrlOrContext !== 'string') {
    // If we received an object, try to extract the URL from common properties
    if (imageUrlOrContext && typeof imageUrlOrContext === 'object') {
      if (imageUrlOrContext.fullSizeUrl) {
        imageUrl = imageUrlOrContext.fullSizeUrl;
      } else if (imageUrlOrContext.detailPageUrl) {
        imageUrl = imageUrlOrContext.detailPageUrl;
      } else if (imageUrlOrContext.thumbnailUrl) {
        imageUrl = imageUrlOrContext.thumbnailUrl;
      } else {
        providerInstance.emitLog('warn', `Unable to extract URL from object. Object keys: ${Object.keys(imageUrlOrContext).join(', ')}`);
        return null; // Cannot process without a URL
      }
    } else {
      providerInstance.emitLog('warn', `Received non-string, non-object parameter: ${typeof imageUrlOrContext}`);
      return null; // Cannot process without a URL
    }
  }

  providerInstance.emitLog('debug', `Full size action 'url_cleaning' for ${imageUrl}`);
  const { removeParams } = actionConfig;
  if (!removeParams || !removeParams.length) return imageUrl;

  try {
    const urlObj = new URL(imageUrl);
    removeParams.forEach(param => urlObj.searchParams.delete(param));
    const cleanedUrl = urlObj.toString();
    providerInstance.emitLog('debug', `Cleaned URL: ${cleanedUrl}`);
    return cleanedUrl;
  } catch (e) {
    providerInstance.emitLog('warn', `Error cleaning URL ${imageUrl}: ${e.message}`);
    return imageUrl;
  }
}

// Handler for URL parameter decoding
async function url_param_decode(page, imageUrlOrContext, actionConfig, providerInstance) {
  // Extract the URL if we received an object or context
  let imageUrl = imageUrlOrContext;
  if (typeof imageUrlOrContext !== 'string') {
    // If we received an object, try to extract the URL from common properties
    if (imageUrlOrContext && typeof imageUrlOrContext === 'object') {
      if (imageUrlOrContext.fullSizeUrl) {
        imageUrl = imageUrlOrContext.fullSizeUrl;
      } else if (imageUrlOrContext.detailPageUrl) {
        imageUrl = imageUrlOrContext.detailPageUrl;
      } else if (imageUrlOrContext.thumbnailUrl) {
        imageUrl = imageUrlOrContext.thumbnailUrl;
      } else {
        providerInstance.emitLog('warn', `Unable to extract URL from object. Object keys: ${Object.keys(imageUrlOrContext).join(', ')}`);
        return null; // Cannot process without a URL
      }
    } else {
      providerInstance.emitLog('warn', `Received non-string, non-object parameter: ${typeof imageUrlOrContext}`);
      return null; // Cannot process without a URL
    }
  }

  providerInstance.emitLog('debug', `Full size action 'url_param_decode' for ${imageUrl}`);
  const { paramName } = actionConfig;
  if (!paramName) return imageUrl;

  try {
    const urlObj = new URL(imageUrl);
    const encoded = urlObj.searchParams.get(paramName);
    if (!encoded) {
      providerInstance.emitLog('warn', `Parameter ${paramName} not found in URL: ${imageUrl}`);
      return imageUrl;
    }

    // Try to decode it - handle both URI encoded values and base64
    let decoded;
    try {
      decoded = decodeURIComponent(encoded);
      providerInstance.emitLog('debug', `Decoded URI param ${paramName}: ${decoded}`);
    } catch (e) {
      // If URI decoding fails, try base64
      try {
        decoded = atob(encoded);
        providerInstance.emitLog('debug', `Decoded base64 param ${paramName}: ${decoded}`);
      } catch (e2) {
        providerInstance.emitLog('warn', `Failed to decode param ${paramName} as URI or base64`);
        return imageUrl;
      }
    }

    // If the decoded value is a valid URL, return it
    if (decoded.startsWith('http')) {
      return decoded;
    } else {
      providerInstance.emitLog('warn', `Decoded value is not a valid URL: ${decoded}`);
      return imageUrl;
    }
  } catch (e) {
    providerInstance.emitLog('warn', `Error decoding URL param ${imageUrl}: ${e.message}`);
    return imageUrl;
  }
}

export default class GenericPlaywrightProvider extends BaseProvider {
  constructor(config, emitter, providerConfig) {
    super(config, emitter);
    this.providerConfig = providerConfig;
    this.name = providerConfig.name;
    this.playwrightOptions = providerConfig.playwrightOptions || {};
    setProviderConfigGetter(() => this.providerConfig); // Make providerConfig accessible to helper
    this.emitLog('info', `GenericPlaywrightProvider initialized for ${this.name}`);
  }

  async _handleConsent(page) {
    this.emitLog('debug', `_handleConsent called for ${this.name}`);
    const consentSelectors = this.providerConfig.selectors?.consentButtons || [];
    if (consentSelectors.length === 0) {
      this.emitLog('debug', 'No consent selectors configured.');
      return;
    }
    this.emitLog('info', `Checking for consent buttons using selectors: ${consentSelectors.join(', ')}`);
    for (const selector of consentSelectors) {
      try {
        const buttonLocator = page.locator(selector).first(); 
        const isVisible = await buttonLocator.isVisible({ timeout: this.playwrightOptions.waitOptions?.timeout || 3000 });
        this.emitLog('debug', `Selector "${selector}" visibility: ${isVisible}`);
        if (isVisible) {
          this.emitLog('info', `Consent button found with selector: "${selector}". Attempting to click...`);
          await buttonLocator.click({ timeout: 5000 });
          this.emitLog('info', `Consent button for selector "${selector}" clicked successfully.`);
          await page.waitForTimeout(1000); 
          return; 
        }
      } catch (error) {
        this.emitLog('debug', `Consent button with selector "${selector}" not found, not visible, or error clicking: ${error.message}`);
      }
    }
    this.emitLog('info', 'No visible consent buttons found or all handled.');
  }

  async _performScrolling(page, maxResults) {
    this.emitLog('debug', `_performScrolling called for ${this.name}`);
    const scrollConfig = this.providerConfig.scrolling;
    if (!scrollConfig) {
      this.emitLog('info', 'No scrolling configuration found for this provider.');
      return;
    }

    this.emitLog('info', `Starting scroll process with strategy: ${scrollConfig.strategy || 'auto'}, maxScrolls: ${scrollConfig.maxScrolls}, scrollDelay: ${scrollConfig.scrollDelay}`);
    let collectedImageUrls = new Set(await this._extractImageUrlsFromPage(page));
    this.emitLog('debug', `Initial image count before scrolling: ${collectedImageUrls.size}`);
    let noNewImagesCount = 0;

    for (let i = 0; i < (scrollConfig.maxScrolls || 0); i++) { // Ensure maxScrolls defaults to 0 if undefined
      this.emitLog('debug', `Scroll attempt ${i + 1} of ${scrollConfig.maxScrolls || 0}`);
      if (collectedImageUrls.size >= maxResults) {
        this.emitLog('info', `Reached maxResults (${maxResults}) during scrolling. Stopping scroll.`);
        break;
      }

      const previousImageCount = collectedImageUrls.size;
      
      if (scrollConfig.strategy === 'manual' && scrollConfig.selectors?.showMoreButton) {
        this.emitLog('debug', `Manual scroll: looking for 'show more' button with selector: ${scrollConfig.selectors.showMoreButton}`);
        try {
          const showMoreButton = page.locator(scrollConfig.selectors.showMoreButton).first();
          if (await showMoreButton.isVisible({ timeout: 3000 })) {
            this.emitLog('info', `Clicking 'show more' button (scroll ${i + 1}/${scrollConfig.maxScrolls})`);
            await showMoreButton.click();
            await page.waitForTimeout(scrollConfig.scrollDelay || 2000);
          } else {
            this.emitLog('info', "'Show more' button not visible. Ending scroll.");
            break;
          }
        } catch (e) {
          this.emitLog('warn', `'Show more' button error: ${e.message}. Ending scroll.`);
          break;
        }
      } else if (scrollConfig.strategy === 'infinite_scroll' && scrollConfig.useAutoScroll !== false) { // Default useAutoScroll to true for infinite_scroll
        this.emitLog('info', `Performing infinite_scroll action (scroll ${i + 1}/${scrollConfig.maxScrolls})`);
        await page.evaluate(() => window.scrollBy(0, window.innerHeight * (scrollConfig.scrollPages || 2)));
        await page.waitForTimeout(scrollConfig.scrollDelay || 2000); 
      } else {
        this.emitLog('info', `Scrolling strategy '${scrollConfig.strategy}' not applicable or useAutoScroll is false. MaxScrolls set to ${scrollConfig.maxScrolls}. Ending scroll early if maxScrolls is 0.`);
        break; 
      }

      const currentImages = await this._extractImageUrlsFromPage(page);
      currentImages.forEach(url => collectedImageUrls.add(url));
      this.emitLog('debug', `Image count after scroll ${i + 1}: ${collectedImageUrls.size} (was ${previousImageCount})`);

      if (collectedImageUrls.size === previousImageCount) {
        noNewImagesCount++;
        this.emitLog('debug', `No new images found after scroll ${i + 1} (Retry ${noNewImagesCount}/${scrollConfig.noNewImagesRetries || 3})`);
        if (noNewImagesCount >= (scrollConfig.noNewImagesRetries || 3)) {
          this.emitLog('info', 'Max retries for no new images reached. Stopping scroll.');
          break;
        }
      } else {
        noNewImagesCount = 0; 
      }
      this.emitProgress({ current: collectedImageUrls.size, total: maxResults, status: 'scrolling' });
    }
    this.emitLog('info', `Scrolling finished. Total potential image URLs after scrolling: ${collectedImageUrls.size}.`);
  }

  async _extractImageUrlsFromPage(page) {
    this.emitLog('debug', `_extractImageUrlsFromPage called for ${this.name}`);
    const extractionConfig = this.providerConfig.imageExtraction;
    if (!extractionConfig) {
      this.emitLog('error', 'Image extraction configuration is missing for this provider.');
      return [];
    }

    let urls = new Set();
    const mainSelector = this.providerConfig.selectors?.images || this.providerConfig.selectors?.thumbnails || this.providerConfig.selectors?.imageLinks;

    if (!mainSelector) {
      this.emitLog('error', 'No primary selector (images, thumbnails, imageLinks) found in provider config.');
      return [];
    }
    this.emitLog('debug', `Using main selector for image extraction: ${mainSelector}`);

    const elements = await page.locator(mainSelector).elementHandles();
    this.emitLog('debug', `Found ${elements.length} elements matching selector: ${mainSelector}`);

    for (const element of elements) {
      let url = null;
      switch (extractionConfig.type) {
        case 'attribute':
          this.emitLog('debug', `Extraction type 'attribute', checking attributes: ${extractionConfig.attributes?.join(', ')}`);
          for (const attr of extractionConfig.attributes || ['src']) {
            const value = await element.getAttribute(attr);
            if (value && value.trim() !== '') {
              if (attr.toLowerCase() === 'srcset') {
                const sources = value.split(',').map(s => s.trim().split(' ')[0]);
                if (sources.length > 0) {
                  url = sources.pop(); 
                  this.emitLog('debug', `Extracted from srcset: ${url} (from ${value}) for element matching ${mainSelector}`);
                } else {
                  this.emitLog('debug', `Srcset found for ${mainSelector} but no sources could be parsed: ${value}`);
                }
              } else if (!value.startsWith('data:')) {
                url = value;
                this.emitLog('debug', `Extracted attribute '${attr}': ${url} for element matching ${mainSelector}`);
              }
              if (url) break; 
            }
          }
          break;
        case 'json_attribute':
          this.emitLog('debug', `Extraction type 'json_attribute', attribute: ${extractionConfig.attribute}, path: ${extractionConfig.jsonPath}`);
          const jsonAttrValue = await element.getAttribute(extractionConfig.attribute);
          if (jsonAttrValue) {
            try {
              const jsonData = JSON.parse(jsonAttrValue);
              url = extractionConfig.jsonPath.split('.').reduce((o, k) => (o || {})[k], jsonData);
              this.emitLog('debug', `Extracted from JSON attribute: ${url}`);
            } catch (e) {
              this.emitLog('debug', `Failed to parse JSON attribute or find path ${extractionConfig.jsonPath} for ${mainSelector}: ${e.message}`);
            }
          }
          if (!url && extractionConfig.fallback) {
            this.emitLog('debug', `Attempting fallback for JSON attribute for ${mainSelector}`);
            const imgElement = await element.$(extractionConfig.fallback.selector || 'img');
            if (imgElement) {
              for (const attr of extractionConfig.fallback.attributes || ['src']) {
                const fallbackValue = await imgElement.getAttribute(attr);
                if (fallbackValue && fallbackValue.trim() !== '' && !fallbackValue.startsWith('data:')) {
                  url = fallbackValue;
                  this.emitLog('debug', `Extracted from fallback attribute '${attr}': ${url}`);
                  break;
                }
              }
            }
          }
          break;
        case 'nested_attribute':
          this.emitLog('debug', `Extraction type 'nested_attribute', selector: ${extractionConfig.selector}, attributes: ${extractionConfig.attributes?.join(', ')}`);
          const nestedElement = await element.$(extractionConfig.selector || 'img');
          if (nestedElement) {
            for (const attr of extractionConfig.attributes || ['src']) {
              const value = await nestedElement.getAttribute(attr);
              if (value && value.trim() !== '' && !value.startsWith('data:')) {
                url = value;
                this.emitLog('debug', `Extracted from nested attribute '${attr}': ${url}`);
                break;
              }
            }
          }
          break;
        case 'link_collection':
          this.emitLog('debug', `Extraction type 'link_collection', checking href`);
          url = await element.getAttribute('href');
          if (url) {
            let resolvedUrl;
            if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
              resolvedUrl = new URL(url, page.url()).toString();
            } else if (extractionConfig.baseUrl) {
              resolvedUrl = new URL(url, extractionConfig.baseUrl).toString();
            } else {
              resolvedUrl = new URL(url, page.url()).toString();
            }
            this.emitLog('debug', `Collected link: ${resolvedUrl}`);
            urls.add(resolvedUrl);
          } else {
            this.emitLog('debug', `No href found for element matching ${mainSelector} in link_collection mode.`);
          }
          break;
        default:
          this.emitLog('warn', `Unknown image extraction type: ${extractionConfig.type} for ${mainSelector}`);
      }

      if (extractionConfig.type !== 'link_collection' && url) {
        try {
          let absoluteUrl = url;
          if (!(url.startsWith('http:') || url.startsWith('https:'))) {
            absoluteUrl = new URL(url, extractionConfig.baseUrl || page.url()).toString();
            this.emitLog('debug', `Resolved relative URL ${url} to ${absoluteUrl} using base: ${extractionConfig.baseUrl || page.url()}`);
          }
          
          let passesFilter = true;
          if (extractionConfig.filters && extractionConfig.filters.length > 0) {
            this.emitLog('debug', `Applying filters to ${absoluteUrl}: ${extractionConfig.filters.join(', ')}`);
            for (const filter of extractionConfig.filters) {
              if (filter.startsWith('!')) { // Not contains
                if (absoluteUrl.includes(filter.substring(1))) { passesFilter = false; break; }
              } else if (filter.startsWith('^')) { // Starts with
                if (!absoluteUrl.startsWith(filter.substring(1))) { passesFilter = false; break; }
              } else { // Contains
                if (!absoluteUrl.includes(filter)) { passesFilter = false; break; }
              }
            }
            this.emitLog('debug', `Filter result for ${absoluteUrl}: ${passesFilter}`);
          }
          if (passesFilter && absoluteUrl.trim() !== '') {
              urls.add(absoluteUrl);
              this.emitLog('debug', `Added URL after filters: ${absoluteUrl}`);
          }
        } catch (e) {
          this.emitLog('warn', `Invalid or relative URL encountered: ${url} for ${mainSelector}. Error: ${e.message}`);
        }
      } else if (extractionConfig.type !== 'link_collection' && !url) {
          this.emitLog('debug', `No URL extracted for an element matching ${mainSelector} with type ${extractionConfig.type}`);
      }
    }
    const finalUrls = Array.from(urls);
    this.emitLog('debug', `_extractImageUrlsFromPage returning ${finalUrls.length} URLs: ${finalUrls.join(', ')}`);
    return finalUrls;
  }

  async _constructSearchUrl(query, options) {
    this.emitLog('debug', `_constructSearchUrl called with query: "${query}", options: ${JSON.stringify(options)}`);
    let transformedQuery = query;
    if (this.providerConfig.queryTransformations && Array.isArray(this.providerConfig.queryTransformations)) {
      this.emitLog('debug', `Applying query transformations: ${this.providerConfig.queryTransformations.join(', ')}`);
      this.providerConfig.queryTransformations.forEach(transformation => {
        switch (transformation) {
          case 'toLowerCase':
            transformedQuery = transformedQuery.toLowerCase();
            break;
          case 'spacesToHyphens':
            transformedQuery = transformedQuery.replace(/\s+/g, '-');
            break;
          default:
            this.emitLog('warn', `Unknown query transformation: ${transformation}`);
        }
      });
      this.emitLog('debug', `Transformed query: "${transformedQuery}"`);
    }

    let url = this.providerConfig.searchUrl.replace('{query}', encodeURIComponent(transformedQuery));
    this.emitLog('debug', `Initial search URL with query: ${url}`);

    if (this.providerConfig.searchParamsConfig) {
      this.emitLog('debug', `Applying search params config: ${JSON.stringify(this.providerConfig.searchParamsConfig)}`);
      for (const optionKey in this.providerConfig.searchParamsConfig) {
        if (options.hasOwnProperty(optionKey) || this.providerConfig.searchParamsConfig[optionKey].defaultValue !== undefined) {
          const paramConfig = this.providerConfig.searchParamsConfig[optionKey];
          const placeholder = `{${optionKey}Param}`; 
          let valueToUse;
          if (options.hasOwnProperty(optionKey)) {
            valueToUse = options[optionKey] ? paramConfig.onValue : paramConfig.offValue;
          } else {
            valueToUse = paramConfig.defaultValue; // Use default if option not provided
          }
          
          if (valueToUse !== undefined) { // Only add if value is defined
            if (url.includes(placeholder)) {
              url = url.replace(placeholder, encodeURIComponent(valueToUse));
              this.emitLog('debug', `Replaced placeholder ${placeholder} with ${valueToUse}. URL is now: ${url}`);
            } else if (paramConfig.paramName) { // Only append if paramName is defined
              const separator = url.includes('?') ? '&' : '?';
              url += `${separator}${encodeURIComponent(paramConfig.paramName)}=${encodeURIComponent(valueToUse)}`;
              this.emitLog('debug', `Appended param ${paramConfig.paramName}=${valueToUse}. URL is now: ${url}`);
            }
          }
        }
      }
    }
    if (url.includes('{safeSearch}') && options.hasOwnProperty('safeSearch')){
        const safeSearchValue = options.safeSearch ? (this.providerConfig.safeSearchOnValue || 'on') : (this.providerConfig.safeSearchOffValue || 'off');
        url = url.replace('{safeSearch}', safeSearchValue);
        this.emitLog('debug', `Applied legacy safeSearch. URL is now: ${url}`);
    }

    this.emitLog('info', `Constructed final search URL: ${url}`);
    return url;
  }

  async fetchImageUrls(query, options, page) {
    this.emitLog('info', `Fetching images for query: "${query}" for provider ${this.name} with options: ${JSON.stringify(options)}`);
    if (!this.providerConfig || !this.providerConfig.searchUrl) {
      this.emitLog('error', `Provider ${this.name}: Configuration is missing or invalid (no searchUrl).`);
      return [];
    }

    const searchUrl = await this._constructSearchUrl(query, options);
    this.emitLog('info', `Provider ${this.name}: Navigating to search URL: ${searchUrl}`);
    
    try {
      await page.goto(searchUrl, { waitUntil: this.providerConfig.navigationWaitUntil || 'domcontentloaded', timeout: this.providerConfig.navigationTimeout || 30000 });
      this.emitLog('info', `Provider ${this.name}: Navigation to ${searchUrl} complete.`);
    } catch (e) {
      this.emitLog('error', `Provider ${this.name}: Failed to navigate to ${searchUrl}: ${e.message}`);
      return [];
    }

    await this._handleConsent(page);
    
    this.emitLog('debug', `Provider ${this.name}: Extracting initial images before scrolling.`);
    let allImageUrls = new Set(await this._extractImageUrlsFromPage(page));
    this.emitLog('info', `Provider ${this.name}: Found ${allImageUrls.size} images on initial load.`);

    if (this.providerConfig.scrolling && (this.providerConfig.scrolling.maxScrolls > 0 || this.providerConfig.scrolling.strategy === 'manual') && allImageUrls.size < options.maxResults) {
      this.emitLog('info', `Provider ${this.name}: Scrolling needed. Initial: ${allImageUrls.size}, MaxResults: ${options.maxResults}`);
      await this._performScrolling(page, options.maxResults);
      allImageUrls = new Set(await this._extractImageUrlsFromPage(page)); 
      this.emitLog('info', `Provider ${this.name}: Found ${allImageUrls.size} images after scrolling.`);
    } else {
      this.emitLog('info', `Provider ${this.name}: No scrolling needed or configured (maxScrolls: ${this.providerConfig.scrolling?.maxScrolls}, strategy: ${this.providerConfig.scrolling?.strategy}). Initial: ${allImageUrls.size}, MaxResults: ${options.maxResults}`);
    }
    
    let finalUrls = Array.from(allImageUrls);

    if (this.providerConfig.imageExtraction?.type === 'link_collection') {
        this.emitLog('info', `Provider ${this.name}: Collected ${finalUrls.length} detail page links.`);
    }

    if (finalUrls.length > options.maxResults) {
      this.emitLog('debug', `Provider ${this.name}: Trimming ${finalUrls.length} URLs to maxResults: ${options.maxResults}`);
      finalUrls = finalUrls.slice(0, options.maxResults);
    }
    
    this.emitLog('info', `Provider ${this.name}: Returning ${finalUrls.length} image URLs.`);
    this.emitLog('debug', `Provider ${this.name}: Final URLs: ${JSON.stringify(finalUrls)}`);
    return finalUrls;
  }

  async getFullSizeImage(page, imageUrlOrContext) {
    this.emitLog('info', `Provider ${this.name}: Getting full-size image for: ${imageUrlOrContext}`);
    if (!this.providerConfig || !this.providerConfig.fullSizeActions) {
      this.emitLog('error', `Provider ${this.name}: Full-size actions configuration is missing.`);
      return typeof imageUrlOrContext === 'string' ? imageUrlOrContext : null;
    }

    const actionConfig = this.providerConfig.fullSizeActions;
    const actionType = actionConfig.type?.toUpperCase(); 

    if (!actionType) {
        this.emitLog('error', `Provider ${this.name}: Full-size action type is missing in configuration.`);
        return typeof imageUrlOrContext === 'string' ? imageUrlOrContext : null;
    }
    
    this.emitLog('debug', `Provider ${this.name}: Full-size action type: ${actionType}, Config: ${JSON.stringify(actionConfig)}`);

    if (FULL_SIZE_ACTIONS[actionType]) {
      try {
        this.emitLog('debug', `DEBUG: Calling ${actionType} handler with parameters: page, imageUrlOrContext: ${imageUrlOrContext}`);
        const fullUrl = await FULL_SIZE_ACTIONS[actionType](page, imageUrlOrContext, actionConfig, this);
        this.emitLog('debug', `DEBUG: Return value from ${actionType} handler: type=${typeof fullUrl}, value=${JSON.stringify(fullUrl)}`);
        
        // Ensure we're always returning a string URL or null
        if (typeof fullUrl === 'string' && fullUrl.trim() !== '') {
          this.emitLog('info', `Provider ${this.name}: Full-size action '${actionType}' resulted in URL: ${fullUrl}`);
          return fullUrl;
        } else if (typeof fullUrl === 'object' && fullUrl !== null) {
          this.emitLog('warn', `Provider ${this.name}: Handler returned an object instead of string URL. Object keys: ${Object.keys(fullUrl).join(', ')}`);
          // If the object has a src property, use it
          if (fullUrl.src) {
            this.emitLog('debug', `DEBUG: Using src property from returned object: ${fullUrl.src}`);
            return fullUrl.src;
          }
          return null;
        } else {
          this.emitLog('warn', `Provider ${this.name}: Handler returned invalid value: ${fullUrl}`);
          return null;
        }
      } catch (e) {
        this.emitLog('error', `Provider ${this.name}: Error during full-size action '${actionType}' for ${imageUrlOrContext}: ${e.message} - Stack: ${e.stack}`);
        return typeof imageUrlOrContext === 'string' ? imageUrlOrContext : null; 
      }
    } else {
      this.emitLog('warn', `Provider ${this.name}: Unknown full-size action type: ${actionType}`);
      return typeof imageUrlOrContext === 'string' ? imageUrlOrContext : null; 
    }
  }
}
