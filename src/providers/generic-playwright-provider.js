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
  const { selectors, waitStrategy, waitDelay = 1500 } = actionConfig;

  if (!selectors || !selectors.length) {
    providerInstance.emitLog('error', 'Detail page action config missing selectors.');
    return detailPageUrl;
  }

  try {
    await page.goto(detailPageUrl, { waitUntil: actionConfig.navigationWaitUntil || 'networkidle', timeout: actionConfig.navigationTimeout || 30000 });
    providerInstance.emitLog('info', `Navigated to detail page: ${detailPageUrl}`);
    
    const imageLocator = page.locator(selectors.join(', ')).first();
    if (waitStrategy === 'locator') {
      await imageLocator.waitFor({ state: 'visible', timeout: actionConfig.timeout || 7000 });
    } else {
      await page.waitForTimeout(waitDelay);
    }
    
    let fullImageUrl = await imageLocator.getAttribute('src');
    if (!fullImageUrl) fullImageUrl = await imageLocator.evaluate(node => node.currentSrc || node.src);
    
    // Handle srcset if present
    if (!fullImageUrl) {
      const srcset = await imageLocator.getAttribute('srcset');
      if (srcset) {
        providerInstance.emitLog('debug', `Found srcset: ${srcset}`);
        // Basic parsing: take the last URL, often highest resolution
        const sources = srcset.split(',').map(s => s.trim().split(' ')[0]);
        fullImageUrl = sources.pop(); 
      }
    }

    providerInstance.emitLog('debug', `Detail page extracted full image: ${fullImageUrl}`);
    return fullImageUrl || detailPageUrl;
  } catch (e) {
    providerInstance.emitLog('warn', `Failed to get image from detail page ${detailPageUrl}: ${e.message}`);
    return detailPageUrl; // Fallback
  }
}

// Handler for URL cleaning (remove parameters)
async function url_cleaning(page, imageUrl, actionConfig, providerInstance) {
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
async function url_param_decode(page, imageUrl, actionConfig, providerInstance) {
  providerInstance.emitLog('debug', `Full size action 'url_param_decode' for ${imageUrl}`);
  const { paramName, decode } = actionConfig;
  if (!paramName) return imageUrl;

  try {
    const urlObj = new URL(imageUrl);
    const encodedParamValue = urlObj.searchParams.get(paramName);
    if (encodedParamValue) {
      const decodedUrl = decode ? decodeURIComponent(encodedParamValue) : encodedParamValue;
      providerInstance.emitLog('info', `Extracted and decoded URL from param '${paramName}': ${decodedUrl}`);
      return decodedUrl;
    }
    providerInstance.emitLog('warn', `Parameter '${paramName}' not found in ${imageUrl}`);
    return imageUrl; // Fallback if param not found
  } catch (e) {
    providerInstance.emitLog('error', `Error processing URL_PARAM_DECODE for ${imageUrl}: ${e.message}`);
    return imageUrl; // Fallback on error
  }
}

export default class GenericPlaywrightProvider extends BaseProvider {
  constructor(config, emitter, providerConfig) {
    super(config, emitter);
    this.providerConfig = providerConfig;
    this.name = providerConfig.name;
    this.playwrightOptions = providerConfig.playwrightOptions || {};
    this.emitLog('info', `GenericPlaywrightProvider initialized for ${this.name}`);
  }

  async _handleConsent(page) {
    const consentSelectors = this.providerConfig.selectors?.consentButtons || [];
    if (consentSelectors.length === 0) {
      this.emitLog('debug', 'No consent selectors configured.');
      return;
    }
    this.emitLog('info', 'Checking for consent buttons...');
    for (const selector of consentSelectors) {
      try {
        const buttonLocator = page.locator(selector).first(); // Use first() to avoid ambiguity if multiple match
        if (await buttonLocator.isVisible({ timeout: this.playwrightOptions.waitOptions?.timeout || 3000 })) {
          this.emitLog('info', `Consent button found with selector: "${selector}". Clicking...`);
          await buttonLocator.click({ timeout: 5000 });
          this.emitLog('info', 'Consent button clicked.');
          await page.waitForTimeout(1000); // Wait a bit for action to complete
          return; // Assume one consent dialog is enough
        }
      } catch (error) {
        this.emitLog('debug', `Consent button with selector "${selector}" not found or not visible: ${error.message}`);
      }
    }
    this.emitLog('info', 'No visible consent buttons found or all handled.');
  }

  async _performScrolling(page, maxResults) {
    const scrollConfig = this.providerConfig.scrolling;
    if (!scrollConfig) {
      this.emitLog('info', 'No scrolling configuration found.');
      return;
    }

    this.emitLog('info', `Starting scroll process with strategy: ${scrollConfig.strategy || 'auto'}`);
    let collectedImageUrls = new Set();
    let noNewImagesCount = 0;
    const initialImageCount = (await this._extractImageUrlsFromPage(page)).length;
    collectedImageUrls = new Set(await this._extractImageUrlsFromPage(page));

    for (let i = 0; i < (scrollConfig.maxScrolls || 10); i++) {
      if (collectedImageUrls.size >= maxResults) {
        this.emitLog('info', `Reached maxResults (${maxResults}) during scrolling.`);
        break;
      }

      const previousImageCount = collectedImageUrls.size;
      
      if (scrollConfig.strategy === 'manual' && scrollConfig.selectors?.showMoreButton) {
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
      } else if (scrollConfig.strategy === 'infinite_scroll' || scrollConfig.useAutoScroll) {
        this.emitLog('info', `Performing scroll action (scroll ${i + 1}/${scrollConfig.maxScrolls})`);
        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2)); // Scroll two viewports
        await page.waitForTimeout(scrollConfig.scrollDelay || 2000); // Wait for content to load
      } else {
        this.emitLog('info', 'Scrolling strategy not applicable or auto-scroll handled by Playwright actions.');
        break; // No specific scroll action, or rely on Playwright's default for other actions
      }

      const currentImages = await this._extractImageUrlsFromPage(page);
      currentImages.forEach(url => collectedImageUrls.add(url));

      if (collectedImageUrls.size === previousImageCount) {
        noNewImagesCount++;
        this.emitLog('debug', `No new images found after scroll ${i + 1} (Retry ${noNewImagesCount}/${scrollConfig.noNewImagesRetries || 3})`);
        if (noNewImagesCount >= (scrollConfig.noNewImagesRetries || 3)) {
          this.emitLog('info', 'Max retries for no new images reached. Stopping scroll.');
          break;
        }
      } else {
        noNewImagesCount = 0; // Reset counter if new images are found
      }
      this.emitProgress({ current: collectedImageUrls.size, total: maxResults, status: 'scrolling' });
    }
    this.emitLog('info', `Scrolling finished. Found ${collectedImageUrls.size} potential image URLs.`);
  }

  async _extractImageUrlsFromPage(page) {
    const extractionConfig = this.providerConfig.imageExtraction;
    if (!extractionConfig) {
      this.emitLog('error', 'Image extraction configuration is missing.');
      return [];
    }

    let urls = new Set();
    const mainSelector = this.providerConfig.selectors?.images || this.providerConfig.selectors?.thumbnails || this.providerConfig.selectors?.imageLinks;

    if (!mainSelector) {
      this.emitLog('error', 'No primary selector (images, thumbnails, imageLinks) found in provider config.');
      return [];
    }

    const elements = await page.locator(mainSelector).elementHandles();
    this.emitLog('debug', `Found ${elements.length} elements matching selector: ${mainSelector}`);

    for (const element of elements) {
      let url = null;
      switch (extractionConfig.type) {
        case 'attribute':
          for (const attr of extractionConfig.attributes || ['src']) {
            const value = await element.getAttribute(attr);
            if (value && value.trim() !== '') {
              if (attr.toLowerCase() === 'srcset') {
                // Parse srcset: take the last URL, often highest resolution
                // Format: "url1 w1, url2 w2, ..." or just "url1, url2"
                const sources = value.split(',').map(s => s.trim().split(' ')[0]);
                if (sources.length > 0) {
                  url = sources.pop(); // Get the last URL
                  this.emitLog('debug', `Extracted from srcset: ${url} (from ${value})`);
                } else {
                  this.emitLog('debug', `Srcset found but no sources could be parsed: ${value}`);
                }
              } else if (!value.startsWith('data:')) {
                url = value;
              }
              if (url) break; // Found a URL from one of the attributes
            }
          }
          break;
        case 'json_attribute':
          const jsonAttrValue = await element.getAttribute(extractionConfig.attribute);
          if (jsonAttrValue) {
            try {
              const jsonData = JSON.parse(jsonAttrValue);
              // Basic path navigation, e.g., 'murl' or 'obj.key.murl'
              url = extractionConfig.jsonPath.split('.').reduce((o, k) => (o || {})[k], jsonData);
            } catch (e) {
              this.emitLog('debug', `Failed to parse JSON attribute or find path ${extractionConfig.jsonPath}: ${e.message}`);
            }
          }
          if (!url && extractionConfig.fallback) {
            // Simplified fallback: assumes nested_attribute
            const imgElement = await element.$(extractionConfig.fallback.selector || 'img');
            if (imgElement) {
              for (const attr of extractionConfig.fallback.attributes || ['src']) {
                const fallbackValue = await imgElement.getAttribute(attr);
                if (fallbackValue && fallbackValue.trim() !== '' && !fallbackValue.startsWith('data:')) {
                  url = fallbackValue;
                  break;
                }
              }
            }
          }
          break;
        case 'nested_attribute':
          const nestedElement = await element.$(extractionConfig.selector || 'img');
          if (nestedElement) {
            for (const attr of extractionConfig.attributes || ['src']) {
              const value = await nestedElement.getAttribute(attr);
              if (value && value.trim() !== '' && !value.startsWith('data:')) {
                url = value;
                break;
              }
            }
          }
          break;
        case 'link_collection':
          url = await element.getAttribute('href');
          if (url) {
            let resolvedUrl;
            if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
              resolvedUrl = new URL(url, page.url()).toString(); // Handles protocol-relative URLs too
            } else if (extractionConfig.baseUrl) {
              resolvedUrl = new URL(url, extractionConfig.baseUrl).toString();
            } else {
              resolvedUrl = new URL(url, page.url()).toString(); // Fallback to page's base URL
            }
            urls.add(resolvedUrl);
          }
          break;
        default:
          this.emitLog('warn', `Unknown image extraction type: ${extractionConfig.type}`);
      }

      if (extractionConfig.type !== 'link_collection') {
        if (url) {
          try {
            const absoluteUrl = new URL(url, page.url()).toString();
            // Apply filters
            let passesFilter = true;
            if (extractionConfig.filters && extractionConfig.filters.length > 0) {
              for (const filter of extractionConfig.filters) {
                if (filter.startsWith('!')) {
                  if (absoluteUrl.includes(filter.substring(1))) {
                    passesFilter = false; break;
                  }
                } else if (filter.startsWith('^')) {
                  if (!absoluteUrl.startsWith(filter.substring(1))) {
                    passesFilter = false; break;
                  }
                } else {
                  if (!absoluteUrl.includes(filter)) {
                    passesFilter = false; break;
                  }
                }
              }
            }
            if (passesFilter) {
              if (absoluteUrl && absoluteUrl.trim() !== '') {
                  urls.add(absoluteUrl);
              }
            }
          } catch (e) {
            this.emitLog('debug', `Invalid or relative URL encountered: ${url}. Error: ${e.message}`);
          }
        }
      }
    }
    return Array.from(urls);
  }

  async _constructSearchUrl(query, options) {
    let transformedQuery = query;
    if (this.providerConfig.queryTransformations && Array.isArray(this.providerConfig.queryTransformations)) {
      this.providerConfig.queryTransformations.forEach(transformation => {
        switch (transformation) {
          case 'toLowerCase':
            transformedQuery = transformedQuery.toLowerCase();
            break;
          case 'spacesToHyphens':
            transformedQuery = transformedQuery.replace(/\s+/g, '-');
            break;
          // Add other transformations as needed
          default:
            this.emitLog('warn', `Unknown query transformation: ${transformation}`);
        }
      });
    }

    let url = this.providerConfig.searchUrl.replace('{query}', encodeURIComponent(transformedQuery));

    // Handle dynamic search parameters from config (e.g., safeSearch for DuckDuckGo)
    if (this.providerConfig.searchParamsConfig) {
      for (const optionKey in this.providerConfig.searchParamsConfig) {
        if (options.hasOwnProperty(optionKey)) {
          const paramConfig = this.providerConfig.searchParamsConfig[optionKey];
          const placeholder = `{${optionKey}Param}`; // e.g., {safeSearchParam}
          const valueToUse = options[optionKey] ? paramConfig.onValue : paramConfig.offValue;
          if (url.includes(placeholder)) {
            url = url.replace(placeholder, encodeURIComponent(valueToUse));
          } else {
            // If placeholder not in URL, try to append as query param (less ideal, assumes structure)
            // This part might need more robust handling if URLs don't have placeholders
            this.emitLog('debug', `Placeholder ${placeholder} not in searchUrl, attempting to append ${paramConfig.paramName}=${valueToUse}`);
            const separator = url.includes('?') ? '&' : '?';
            url += `${separator}${encodeURIComponent(paramConfig.paramName)}=${encodeURIComponent(valueToUse)}`;
          }
        }
      }
    }
    // Fallback for older safeSearch handling if new config not present
    if (url.includes('{safeSearch}') && options.hasOwnProperty('safeSearch')){
        url = url.replace('{safeSearch}', options.safeSearch ? (this.providerConfig.safeSearchOnValue || 'on') : (this.providerConfig.safeSearchOffValue || 'off'));
    }

    this.emitLog('debug', `Constructed search URL: ${url}`);
    return url;
  }

  async fetchImageUrls(query, options, page) {
    this.emitLog('info', `Fetching images for query: "${query}" with options: ${JSON.stringify(options)}`);
    if (!this.providerConfig || !this.providerConfig.searchUrl) {
      this.emitLog('error', 'Provider configuration is missing or invalid (no searchUrl).');
      return [];
    }

    const searchUrl = await this._constructSearchUrl(query, options);
    this.emitLog('info', `Navigating to search URL: ${searchUrl}`);
    
    try {
      await page.goto(searchUrl, { waitUntil: this.providerConfig.navigationWaitUntil || 'domcontentloaded', timeout: this.providerConfig.navigationTimeout || 30000 });
      this.emitLog('info', 'Navigation complete.');
    } catch (e) {
      this.emitLog('error', `Failed to navigate to ${searchUrl}: ${e.message}`);
      return [];
    }

    await this._handleConsent(page);
    
    // Initial image extraction before scrolling
    let allImageUrls = new Set(await this._extractImageUrlsFromPage(page));
    this.emitLog('info', `Found ${allImageUrls.size} images on initial load.`);

    if (this.providerConfig.scrolling && allImageUrls.size < options.maxResults) {
      await this._performScrolling(page, options.maxResults);
      // Re-extract images after scrolling to get all loaded items
      allImageUrls = new Set(await this._extractImageUrlsFromPage(page)); 
    }
    
    let finalUrls = Array.from(allImageUrls);

    // If extraction type is 'link_collection', these are detail page URLs.
    // We don't fetch full images here, that's for getFullSizeImage.
    // But we might want to limit the number of links collected based on maxResults.
    if (this.providerConfig.imageExtraction?.type === 'link_collection') {
        this.emitLog('info', `Collected ${finalUrls.length} detail page links.`);
    }

    if (finalUrls.length > options.maxResults) {
      finalUrls = finalUrls.slice(0, options.maxResults);
    }
    
    this.emitLog('info', `Returning ${finalUrls.length} image URLs.`);
    return finalUrls;
  }

  async getFullSizeImage(page, imageUrlOrContext) {
    this.emitLog('info', `Getting full-size image for: ${imageUrlOrContext}`);
    if (!this.providerConfig || !this.providerConfig.fullSizeActions) {
      this.emitLog('error', 'Full-size actions configuration is missing.');
      return imageUrlOrContext; // Fallback to original URL
    }

    const actionConfig = this.providerConfig.fullSizeActions;
    const actionType = actionConfig.type;

    if (FULL_SIZE_ACTIONS[actionType]) {
      try {
        return await FULL_SIZE_ACTIONS[actionType](page, imageUrlOrContext, actionConfig, this);
      } catch (e) {
        this.emitLog('error', `Error during full-size action '${actionType}' for ${imageUrlOrContext}: ${e.message}`);
        return imageUrlOrContext; // Fallback
      }
    } else {
      this.emitLog('warn', `Unknown full-size action type: ${actionType}`);
      return imageUrlOrContext; // Fallback
    }
  }
}
