# Adobe Stock Provider Bug Fix

## Issue
When downloading images from Adobe Stock, the application logs show:

```
[17:59:31] [WEB DOWNLOAD - DEBUG]: Processing image URL: [object Object] from provider AdobeStock
[17:59:31] [WEB DOWNLOAD - WARN]: Skipping invalid URL from AdobeStock: [object Object]
```

The root cause is that the `getFullSizeImage` method in `AdobeStockProvider` (scraping mode) is sometimes returning an object instead of a string URL, which causes the download utility to skip the images.

## Solution
Ensure that the `getFullSizeImage` method in `AdobeStockProvider` always returns either a valid string URL or null. The fix involves:

1. Properly checking the type of value returned by `GenericPlaywrightProvider.getFullSizeImage`
2. Ensuring that only string URLs are returned to the download utility

This fix maintains compatibility with the download utility's expectations without requiring changes to other parts of the codebase.
