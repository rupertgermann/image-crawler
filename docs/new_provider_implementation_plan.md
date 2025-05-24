# Implementation Plan: Adding New Image Providers

This document outlines the strategy and steps for integrating new image providers into the Image Crawler application. It covers both free stock photo sources and commercial providers, with a focus on API integration where possible and web scraping for previews or as a fallback.

## 1. General Principles for Adding New Providers

All new providers should adhere to the existing architecture:

1.  **File Location**: Provider-specific code will reside in `src/providers/` (e.g., `newprovider-provider.js`).
2.  **Base Class**: Each new provider class must extend `BaseProvider` from `src/providers/base-provider.js`.
3.  **Naming Convention**: The filename prefix should match the provider's key in the configuration (e.g., `adobestock-provider.js` for a provider configured as `"adobestock"`).
4.  **Dynamic Loading**: The system dynamically loads provider files ending with `-provider.js`.
5.  **Core Methods to Implement/Override**:
    *   `constructor(config, emitter)`: Initialize the provider, call `super()`, set `this.providerName`, and handle API key loading from `config.apiKey` or environment variables.
    *   `async fetchImageUrls(query, page, options = {})`: The primary method to retrieve a list of image metadata (URLs, titles, IDs) based on a search query. `page` is the Playwright page object, available for scraping.
    *   `async getFullSizeImage(imageInfo, page, options = {})` (Optional Override): If `fetchImageUrls` returns URLs that are not direct links to full-size images (e.g., links to detail pages), this method must be overridden to navigate/fetch the actual full-size image URL. The base implementation attempts a direct download of `imageInfo.url`.
6.  **Configuration**:
    *   Add entries to `config.json` and `config.json.example` under the `providers` object.
    *   Include the new provider's key in the `providers.order` array.
    *   Provider-specific settings (e.g., `enabled`, `maxResults`, `apiKey`) should be defined.
7.  **Logging**: Utilize `this.logInfo()`, `this.logWarn()`, `this.logError()`, `this.logDebug()` (inherited from `BaseProvider`) for consistent logging.
8.  **Error Handling**: Implement robust error handling within provider methods, returning empty arrays or null where appropriate to prevent crashes.
9.  **Playwright Usage**: If web scraping is necessary, the Playwright `page` object is passed to `fetchImageUrls` and `getFullSizeImage`. Use standard Playwright methods for navigation, element selection, and interaction.

## 2. Strategy by Provider Type

### 2.1. Free Stock Photo Sources

For these providers, web scraping is the most common approach as dedicated APIs are rare for smaller free sites.

**General Scraping Strategy for Free Providers:**
1.  **Search URL**: Determine the site's search URL format (e.g., `https://example.com/search/{query}`).
2.  **Navigate**: Use `page.goto(searchUrl)`.
3.  **Identify Image Links/Thumbnails**: Inspect the search results page to find CSS selectors for:
    *   Links to image detail pages.
    *   Thumbnail image elements (`<img>` tags) to extract `src` (for thumbnail URL) and `alt` (for title).
4.  **Extract Metadata**: Loop through found elements, extract `detailPageUrl`, `thumbnailUrl`, `title`. Generate a unique `id` if not available.
5.  **`fetchImageUrls`**: Return an array of `{ id, url: detailPageUrl, thumbnailUrl, title, provider, detailPageUrl }`.
6.  **`getFullSizeImage`**: 
    *   Navigate to `imageInfo.detailPageUrl`.
    *   Inspect the detail page to find the CSS selector for the main, full-size image.
    *   Extract the `src` of the full-size image.
    *   Return `await super.getFullSizeImage({ ...imageInfo, url: fullImageUrl }, page, options)` to use the base download logic.

### 2.2. Commercial Stock Photo Providers

For commercial providers, the preferred method is to use their official APIs. If an API key is not provided in the configuration, a fallback to scraping watermarked preview images will be implemented.

**General API Strategy for Commercial Providers:**
1.  **API Key**: Load API key from `config.apiKey` or environment variable in the constructor.
2.  **API Documentation**: Thoroughly review the provider's API documentation for:
    *   Authentication methods (API key in header, OAuth, etc.).
    *   Search endpoints and parameters.
    *   Response structure (JSON/XML).
    *   Rate limits.
    *   Image metadata fields (preview URLs, full-size image URLs, titles, IDs).
3.  **`fetchImageUrls` (API Mode)**:
    *   Construct the API request URL with the search query and API key.
    *   Use `fetch` or a library like `axios` to make the API call.
    *   Parse the response.
    *   Transform API response items into the standard `imageInfo` format: `{ id, url: (direct_full_url_if_available_else_preview_url_or_page_url), thumbnailUrl, title, provider, ...any_other_useful_data }`.
4.  **`getFullSizeImage` (API Mode)**:
    *   If `fetchImageUrls` provided a direct full-size image URL, the base method might suffice.
    *   If `fetchImageUrls` provided an ID or a specific API endpoint to get the full download link (common for licensed assets), implement this call here.

**Preview Scraping Fallback (No API Key):**
*   If `this.apiKey` is not set, `fetchImageUrls` and `getFullSizeImage` will use web scraping techniques similar to free providers, but specifically targeting preview/watermarked images.
*   Clearly log that the provider is operating in preview mode.
*   The selectors will target the watermarked preview images on search result and detail pages.

## 3. Detailed Implementation Plan for Selected Providers

### 3.1. FreeRangeStock.com (Free Provider - Scraping)

*   **Provider Key**: `freerangestock`
*   **File**: `src/providers/freerangestock-provider.js`
*   **Strategy**: Web Scraping.
*   **`fetchImageUrls`**:
    1.  Search URL: `https://freerangestock.com/search/all/{page_number}/search_term/{query}` (or similar, needs verification).
    2.  Selector for image links/containers on search results: Likely `div.img-cont a` or similar.
    3.  Selector for thumbnail `img` tag: Inside the link container.
    4.  Extract `href` for detail page URL, `src` for thumbnail, `alt` for title.
*   **`getFullSizeImage`**:
    1.  Navigate to detail page URL.
    2.  Selector for full-size image: Likely a prominent `img` tag, possibly with an ID like `main_image` or a specific class.
    3.  Extract `src` for the full image URL.
*   **Configuration**: Add `freerangestock` to `order` and provider config block (enabled, maxResults).

### 3.2. PublicDomainPictures.net (Free Provider - Scraping)

*   **Provider Key**: `publicdomainpictures`
*   **File**: `src/providers/publicdomainpictures-provider.js`
*   **Strategy**: Web Scraping.
*   **`fetchImageUrls`**:
    1.  Search URL: `https://www.publicdomainpictures.net/en/search.php?search={query}&page={page_number}` (needs verification).
    2.  Selector for image items: Likely `div.thumbnail_p` or similar.
    3.  Selector for link to detail page: `a` tag within the item.
    4.  Selector for thumbnail `img`: `img` tag within the link.
*   **`getFullSizeImage`**:
    1.  Navigate to detail page.
    2.  Selector for download link/button or full image: May involve clicking a download button or finding a direct image link. Often, free sites have a clear "Download" button leading to the actual image or a higher-resolution version page.
*   **Configuration**: Add `publicdomainpictures` to `order` and provider config block.

### 3.3. Reshot.com (Free Provider - Scraping)

*   **Provider Key**: `reshot`
*   **File**: `src/providers/reshot-provider.js`
*   **Strategy**: Web Scraping. Reshot emphasizes "unique" free photos.
*   **`fetchImageUrls`**:
    1.  Search URL: `https://www.reshot.com/search/{query}`.
    2.  Selector for image items: Modern sites often use `figure`, `div` with specific classes, or `article` tags. Inspect for repeating patterns like `div[class*="item"] a` or `a[href*="/photos/"]`.
    3.  Thumbnail `img` tag: Within the item link.
*   **`getFullSizeImage`**:
    1.  Navigate to detail page.
    2.  Selector for download button/link: Reshot likely has a clear download button. The actual image URL might be obtained after clicking it or from an attribute on the button/link itself.
*   **Configuration**: Add `reshot` to `order` and provider config block.

### 3.4. Adobe Stock (Commercial - API Preferred, Scraping Fallback)

*   **Provider Key**: `adobestock`
*   **File**: `src/providers/adobestock-provider.js`
*   **Strategy**: API first, then scraping for previews.
*   **API Details**:
    *   Requires API Key (`x-api-key` header) and Product ID (`x-product` header).
    *   Endpoint: `https://stock.adobe.io/Rest/Media/1/Search/Files`
    *   Parameters: `search_parameters[words]`, `search_parameters[limit]`.
    *   Response: JSON with `files` array. Each file has `id`, `title`, `thumbnail_url`, `content_url` (for comp/preview), and potentially URLs for licensed downloads if authenticated for such.
*   **`constructor`**: Load `apiKey` from `config.adobestock.apiKey`.
*   **`fetchImageUrls` (API Mode)**:
    1.  If `this.apiKey` exists, make API call.
    2.  Map API response `files` to `imageInfo` objects. Use `thumbnail_url` for `thumbnailUrl` and `content_url` (comp) or `thumbnail_url` as the primary `url` for `getFullSizeImage` to download the preview if a direct full URL isn't immediately available without licensing steps.
*   **`fetchImageUrls` (Scraping Fallback)**:
    1.  If no API key, navigate to `https://stock.adobe.com/search?k={query}`.
    2.  Selector for image items: e.g., `div[class*="thumbnail-container"] a`.
    3.  Extract detail page URL, thumbnail `src`, and `alt` text.
*   **`getFullSizeImage` (API Mode)**:
    1.  If API was used, the `imageInfo.url` (from `content_url` or similar) should be a direct link to a good quality preview/comp. Base method should work.
    2.  (Future Enhancement: If licensed, API might provide a way to get the actual high-res asset.)
*   **`getFullSizeImage` (Scraping Fallback)**:
    1.  Navigate to detail page.
    2.  Selector for main preview image: e.g., `img[id*="asset-view-image"]` or `img[class*="main-image"]`.
    3.  Extract `src` for the watermarked preview.
*   **Configuration**: Add `adobestock` to `order` and provider config block (enabled, maxResults, apiKey).

### 3.5. Getty Images (Commercial - API Preferred, Scraping Fallback)

*   **Provider Key**: `gettyimages`
*   **File**: `src/providers/gettyimages-provider.js`
*   **Strategy**: API first (complex, might require OAuth or specific SDKs), then scraping for previews.
*   **API Details**: Getty has a robust API, often requiring more than a simple key (e.g., Key + Secret, OAuth2). Initial focus might be on scraping due to API complexity for a quick start.
    *   API Key: `Api-Key` header.
    *   Endpoint: `https://api.gettyimages.com/v3/search/images`
    *   Parameters: `phrase`, `page_size`.
    *   Response: JSON with `images` array. Each image has `id`, `title`, `display_sizes` (array with different previews, look for one with `uri`).
*   **`constructor`**: Load `apiKey` from `config.gettyimages.apiKey`.
*   **`fetchImageUrls` (API Mode)**:
    1.  If `this.apiKey`, make API call.
    2.  Map `images` to `imageInfo`. Use a suitable preview `uri` from `display_sizes` as `url` and `thumbnailUrl`.
*   **`fetchImageUrls` (Scraping Fallback)**:
    1.  Navigate to `https://www.gettyimages.com/search/2/image?phrase={query}`.
    2.  Selector for image items: e.g., `article[class*="gallery-asset"] a` or `figure a`.
    3.  Extract detail page URL, thumbnail `src`, and `alt` text.
*   **`getFullSizeImage` (API/Scraping)**: Similar to Adobe Stock, focus on getting the best available preview via API response or scraping the detail page for the main watermarked image.
*   **Configuration**: Add `gettyimages` to `order` and provider config block (enabled, maxResults, apiKey).

### 3.6. Dreamstime.com (Commercial - API Preferred, Scraping Fallback)

*   **Provider Key**: `dreamstime`
*   **File**: `src/providers/dreamstime-provider.js`
*   **Strategy**: API first, then scraping for previews.
*   **API Details**:
    *   Dreamstime has a REST API. Requires API Key.
    *   Endpoint: Likely `https://api.dreamstime.com/search` (needs verification).
    *   Parameters: `query`, `API_KEY`, `per_page`.
    *   Response: JSON or XML. Look for image ID, title, thumbnail URL, preview URL.
*   **`constructor`**: Load `apiKey` from `config.dreamstime.apiKey`.
*   **`fetchImageUrls` (API Mode)**:
    1.  If `this.apiKey`, make API call.
    2.  Map API response items to `imageInfo`.
*   **`fetchImageUrls` (Scraping Fallback)**:
    1.  Navigate to `https://www.dreamstime.com/search.php?srh_field={query}`.
    2.  Selector for image items: e.g., `div.thumbnail-container a`.
    3.  Extract detail page URL, thumbnail `src`, and `alt` text.
*   **`getFullSizeImage` (API/Scraping)**: Focus on getting the best available preview.
*   **Configuration**: Add `dreamstime` to `order` and provider config block (enabled, maxResults, apiKey).

## 4. Full List of Potential New Providers

This section lists all potential new providers, categorized by API availability. Notes indicate if a provider is already implemented or has a detailed plan in Section 3.

### 4.1. Providers with Public APIs

1.  **Pexels** (Already Implemented)
    *   Website: [https://www.pexels.com](https://www.pexels.com)
    *   API: [https://www.pexels.com/api/](https://www.pexels.com/api/)
2.  **Pixabay** (Already Implemented)
    *   Website: [https://pixabay.com](https://pixabay.com)
    *   API: [https://pixabay.com/api/docs/](https://pixabay.com/api/docs/)
3.  **Unsplash** (Already Implemented)
    *   Website: [https://unsplash.com](https://unsplash.com)
    *   API: [https://unsplash.com/developers](https://unsplash.com/developers)
4.  **Flickr** (Already Implemented)
    *   Website: [https://www.flickr.com](https://www.flickr.com)
    *   API: [https://www.flickr.com/services/api/](https://www.flickr.com/services/api/)
5.  **Shutterstock** (Implemented - Preview Scraping; API plan in Section 3)
    *   Website: [https://www.shutterstock.com](https://www.shutterstock.com)
    *   API: [https://api-reference.shutterstock.com/](https://api-reference.shutterstock.com/)
6.  **Adobe Stock** (Detailed plan in Section 3)
    *   Website: [https://stock.adobe.com](https://stock.adobe.com)
    *   API: [https://developer.adobe.com/stock/docs/api/](https://developer.adobe.com/stock/docs/api/)
7.  **Getty Images** (Detailed plan in Section 3)
    *   Website: [https://www.gettyimages.com](https://www.gettyimages.com)
    *   API: [https://developers.gettyimages.com/](https://developers.gettyimages.com/)
8.  **iStock** (Note: by Getty Images, likely similar API or covered by Getty)
    *   Website: [https://www.istockphoto.com](https://www.istockphoto.com)
    *   API: [https://www.istockphoto.com/affiliates/content-api](https://www.istockphoto.com/affiliates/content-api)
    *   Strategy: Investigate API similarity to Getty Images.
9.  **Dreamstime** (Detailed plan in Section 3)
    *   Website: [https://www.dreamstime.com](https://www.dreamstime.com)
    *   API: [https://www.dreamstime.com/dreamstime-api](https://www.dreamstime.com/dreamstime-api)
10. **500px**
    *   Website: [https://500px.com](https://500px.com)
    *   API: [https://support.500px.com/hc/en-us/articles/360002435653-API](https://support.500px.com/hc/en-us/articles/360002435653-API)
    *   Strategy: API preferred.
11. **Stocksy**
    *   Website: [https://www.stocksy.com](https://www.stocksy.com)
    *   API: [https://www.stocksy.com/docs/api/index.html](https://www.stocksy.com/docs/api/index.html)
    *   Strategy: API preferred (premium site).
12. **Alamy**
    *   Website: [https://www.alamy.com](https://www.alamy.com)
    *   API: [https://api-reference.alamy.com/docs/alamy-api/cbc5397aa70ae-alamy-api](https://api-reference.alamy.com/docs/alamy-api/cbc5397aa70ae-alamy-api)
    *   Strategy: API preferred.
13. **Bigstock** (Note: by Shutterstock, likely similar API or covered by Shutterstock)
    *   Website: [https://www.bigstockphoto.com](https://www.bigstockphoto.com)
    *   API: [https://www.bigstockphoto.com/help/en/](https://www.bigstockphoto.com/help/en/) (Help page, actual API docs might be elsewhere or via Shutterstock)
    *   Strategy: API preferred.
14. **Pond5**
    *   Website: [https://www.pond5.com](https://www.pond5.com)
    *   API: [https://www.pond5.com/api](https://www.pond5.com/api)
    *   Strategy: API preferred (check if photo-specific).
15. **Depositphotos**
    *   Website: [https://depositphotos.com](https://depositphotos.com)
    *   API: [https://enterprise-api-doc.readthedocs.io/](https://enterprise-api-doc.readthedocs.io/)
    *   Strategy: API preferred.
16. **Google Images** (Already Implemented - via Custom Search JSON API)
    *   Website: [https://images.google.com](https://images.google.com)
    *   API: [Custom Search JSON API](https://developers.google.com/custom-search/v1/overview)
17. **Bing** (Already Implemented - via Bing Image Search API)
    *   Website: [https://www.bing.com/images](https://www.bing.com/images)
    *   API: [Bing Image Search API](https://learn.microsoft.com/en-us/bing/search-apis/bing-image-search/overview)
18. **DuckDuckGo** (Already Implemented - via Instant Answer API)
    *   Website: [https://duckduckgo.com](https://duckduckgo.com)
    *   API: [DuckDuckGo Instant Answer API](https://duckduckgo.com/api)
19. **Wikimedia Commons**
    *   Website: [https://commons.wikimedia.org](https://commons.wikimedia.org)
    *   API: [MediaWiki API](https://www.mediawiki.org/wiki/API:Main_page)
    *   Strategy: API preferred.

### 4.2. Providers Without Public APIs or Limited Access (Primarily Web Scraping)

20. **Freeimages** (Formerly sxc.hu)
    *   Website: [https://www.freeimages.com](https://www.freeimages.com)
    *   API: Not publicly available
    *   Strategy: Web scraping.
21. **Stocksnap** (Already Implemented - Web Scraping)
    *   Website: [https://stocksnap.io](https://stocksnap.io)
    *   API: Not publicly available
22. **Freerange Stock** (Detailed plan in Section 3 - Web Scraping)
    *   Website: [https://freerangestock.com](https://freerangestock.com)
    *   API: Not publicly available
23. **Little Visuals**
    *   Website: [http://littlevisuals.co](http://littlevisuals.co) (Note: Site appears to be an archive, images delivered via email subscription historically. May not be suitable for active scraping of new content.)
    *   API: Not publicly available
    *   Strategy: Web scraping if feasible, or consider if it's a static archive.
24. **New Old Stock**
    *   Website: [https://nos.twnsnd.co](https://nos.twnsnd.co)
    *   API: Not publicly available
    *   Strategy: Web scraping (vintage photos from public archives).
25. **Visual Hunt**
    *   Website: [https://visualhunt.com](https://visualhunt.com) (Aggregates free images, some from sources like Flickr)
    *   API: Not publicly available
    *   Strategy: Web scraping. Check if it primarily points to other sources that might be better to integrate directly.
26. **Reshot** (Detailed plan in Section 3 - Web Scraping)
    *   Website: [https://www.reshot.com](https://www.reshot.com)
    *   API: Not publicly available
27. **ISO Republic**
    *   Website: [https://isorepublic.com](https://isorepublic.com)
    *   API: Not publicly available
    *   Strategy: Web scraping.
28. **Magdeleine**
    *   Website: [https://magdeleine.co](https://magdeleine.co) (Curated free photos)
    *   API: Not publicly available
    *   Strategy: Web scraping.
29. **Startup Stock Photos**
    *   Website: [https://startupstockphotos.com](https://startupstockphotos.com)
    *   API: Not publicly available
    *   Strategy: Web scraping.
30. **PNGTree**
    *   Website: [https://pngtree.com](https://pngtree.com) (Focus on PNGs, vectors, templates. May have freemium model with login/download limits.)
    *   API: Not publicly available
    *   Strategy: Web scraping. Investigate terms and download mechanisms carefully.
31. **Public Domain Pictures** (Detailed plan in Section 3 - Web Scraping)
    *   Website: [https://www.publicdomainpictures.net](https://www.publicdomainpictures.net)
    *   API: Not publicly available

## 5. Configuration and Documentation Updates

For each new provider implemented:

1.  **`config.json` / `config.json.example`**:
    *   Add the new provider key (e.g., `adobestock`) to the `providers.order` array.
    *   Add a configuration block for the new provider:
        ```json
        "newprovider": {
          "enabled": true,
          "maxResults": 30,
          "apiKey": "YOUR_NEWPROVIDER_API_KEY_OR_LEAVE_EMPTY_FOR_PREVIEWS" // If applicable
        }
        ```
2.  **`README.md`**:
    *   Add the new provider to the list of supported providers in the "Features" section and the dedicated "Supported Image Providers" section.
    *   If it's a commercial provider with preview mode, mention this (e.g., "Adobe Stock (fetches previews, API key for potential full access)").
    *   Update the example `config.json` in the README if it's being used to showcase specific provider configurations.

## 6. Testing

*   Manually test each new provider with various search queries.
*   Verify that `maxResults` is respected.
*   Test API key functionality (if applicable).
*   Test preview scraping fallback (if applicable and no API key is provided).
*   Check logs for errors or warnings.

This plan provides a comprehensive roadmap. Each provider will require careful inspection of its website or API documentation to finalize selectors and API call details.
