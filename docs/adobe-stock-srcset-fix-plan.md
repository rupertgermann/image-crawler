# Plan to Fix Adobe Stock Image Downloading Issue

## 1. Problem Description

The Adobe Stock provider (`adobestock-provider.js`) in scraping mode successfully identifies links to image detail pages. However, it fails to download the actual images. The logs show numerous entries like:
`[WEB DOWNLOAD - WARN]: Skipping invalid URL from AdobeStock: [object Object]`

This indicates that the URL being passed to the download function is not a valid string, but an object. The expected behavior is to navigate to a detail page (e.g., `https://stock.adobe.com/de/images/red-fox-vulpes-vulpes-close-up-portrait-with-bokeh-of-pine-trees-in-the-background-making-eye-contact/125645648`) and download the main preview image.

The user has identified that the target image URL is likely within an HTML snippet like:
```html
<source type="image/jpeg" data-t="details-thumbnail-jpeg" srcset="https://as1.ftcdn.net/jpg/01/25/64/56/1000_F_125645648_i39NJPS1lN5NIdxQRlnKK3DYy9RM6ebe.jpg">
```

## 2. Root Cause Analysis

The current Playwright configuration for Adobe Stock (`src/providers/configs/playwright/adobestock.js`) uses:
- `fullSizeImageSelector: '#details-enlarged-image'`

This selector targets an element with the ID `details-enlarged-image`, which is likely an `<img>` tag. However, the actual high-resolution preview URL seems to be in the `srcset` attribute of a `<source>` tag, specifically one with `data-t="details-thumbnail-jpeg"`.

If the `GenericPlaywrightProvider` attempts to get an attribute (like `src`) from `#details-enlarged-image` and it doesn't contain the direct image link, or if the selector `#details-enlarged-image` itself is not specific enough or the element is not what's expected, `element.getAttribute()` might return `null`.

The `"[object Object]"` in the log is perplexing if `getFullSizeImage` is expected to return a string or `null`. However, the primary issue is the failure to extract the correct URL. Fixing the selector and attribute should yield a string URL.

## 3. Proposed Solution

The fix involves updating the Playwright configuration for the Adobe Stock provider to correctly target the `<source>` element and extract its `srcset` attribute.

**File to Modify:** `src/providers/configs/playwright/adobestock.js`

**Changes:**

1.  **Update `fullSizeImageSelector`**:
    *   Change from: `'#details-enlarged-image'`
    *   Change to: `'source[data-t="details-thumbnail-jpeg"]'`
    *   This selector specifically targets the `<source>` element that has the `data-t="details-thumbnail-jpeg"` attribute, as indicated by the user.

2.  **Specify `fullSizeImageAttribute`**:
    *   Add/Update to: `fullSizeImageAttribute: 'srcset'`
    *   This tells the `GenericPlaywrightProvider` to retrieve the value of the `srcset` attribute from the selected element.

**Rationale:**

*   The `GenericPlaywrightProvider` (`src/providers/generic-playwright-provider.js`) already supports extracting a specified attribute using `fullSizeImageAttribute`.
*   The `srcset` attribute on the identified `<source>` tag appears to contain the direct URL to the desired image.
*   No changes are anticipated for `adobestock-provider.js` or `generic-playwright-provider.js` as their existing logic should accommodate this configuration change.

## 4. Potential `srcset` Complexity (and `postProcessFullSizeImageUrl`)

The `srcset` attribute *can* contain multiple URLs with density or width descriptors (e.g., `image-low.jpg 1x, image-high.jpg 2x`). The user's example shows a single URL: `srcset="https://as1.ftcdn.net/jpg/01/25/64/56/1000_F_125645648_i39NJPS1lN5NIdxQRlnKK3DYy9RM6ebe.jpg"`.

*   **Initial Approach:** Assume the `srcset` contains a single, direct URL. The proposed changes should work directly.
*   **Contingency:** If `srcset` contains multiple URLs or requires parsing, a `postProcessFullSizeImageUrl` function will be added to the `adobestock.js` Playwright configuration. This function would take the raw `srcset` string, parse it, and return the desired single image URL. For example:
    ```javascript
    // In src/providers/configs/playwright/adobestock.js
    // ...
    // postProcessFullSizeImageUrl: (srcsetValue) => {
    //   if (!srcsetValue) return null;
    //   // Example: take the first URL if multiple are present, or the largest one
    //   const urls = srcsetValue.split(',').map(entry => entry.trim().split(' ')[0]);
    //   return urls[0] || null; // Simplistic example
    // },
    ```
    This will only be implemented if the simpler attribute extraction is insufficient.

## 5. Testing

After applying the changes:
1.  Run the image crawler application.
2.  Select "adobestock" as the provider.
3.  Use a query like "fox".
4.  Verify that images are downloaded successfully.
5.  Check logs for any remaining "Skipping invalid URL" messages or other errors.

This plan focuses on the most direct solution based on the information provided.
