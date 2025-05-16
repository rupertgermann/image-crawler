# Bug Fix Plan: Output Directory Undefined Error

## Issue Analysis

The error occurs when trying to create the output directory in the local crawler mode. The specific error is:

```
TypeError [ERR_INVALID_ARG_TYPE]: The "path" argument must be of type string or an instance of Buffer or URL. Received undefined
```

### Root Cause

1. The `getDefaultDownloadDir()` function in `paths.js` is returning `undefined` instead of a valid path
2. This happens because:
   - The `configManager.getConfig()` is returning `null` or an incomplete config object
   - The config initialization may not be complete when `getDefaultDownloadDir()` is called
   - The platform-specific paths in the config may not be properly set up

### Affected Files

1. `/src/utils/paths.js` - The `getDefaultDownloadDir()` function is not providing a fallback when config values are missing
2. `/src/utils/config.js` - The config initialization might not be complete before it's accessed
3. `/src/index.js` - The local mode action is not properly handling undefined output directories

## Solution Plan

### 1. Fix the `getDefaultDownloadDir()` function in `paths.js`

- Add better error handling and fallback values
- Ensure the function never returns undefined
- Add more detailed logging to track the issue

### 2. Improve config initialization in `index.js`

- Ensure config is fully initialized before using it
- Add validation for the output directory
- Provide a default value if the config-based path is undefined

### 3. Add safeguards in `local-crawler.js`

- Add validation for the output directory before attempting to create it
- Provide a fallback to a default directory if none is specified

## Implementation Steps

1. Update `paths.js` to ensure `getDefaultDownloadDir()` always returns a valid path
2. Add validation in `index.js` to check if the output directory is defined
3. Add a fallback mechanism to use a default directory if the config-based path is undefined
4. Add more detailed logging to help diagnose any future issues

## Testing Plan

1. Test the local crawler with various output directory configurations
2. Test with both CLI and native dialog folder selection
3. Verify that the application gracefully handles undefined paths

# Bug Fix Plan: Max Downloads Limit Implementation

## Issue Analysis

The max downloads limit was not being correctly enforced. When a user configures a max downloads limit, the script should download exactly that number of images (if available), but it was inconsistent in its behavior.

### Root Cause

1. The max downloads limit was being checked within each image source crawler, but not properly coordinated across multiple sources
2. The default value was set to 100 in some places but not consistently applied
3. The interactive mode had a hardcoded value of 20 downloads, ignoring the config setting
4. There was no proper reporting of whether the download limit was successfully reached
5. In local mode, the scan would process thousands of files regardless of the max files limit
6. In web mode, the limit was affecting only one image provider, not the overall count

### Affected Files

1. `/src/modes/playwright-crawler.js` - The crawler methods needed to respect the remaining downloads count
2. `/src/modes/local-crawler.js` - The local crawler needed to properly respect the max files limit
3. `/src/utils/config.js` - The default max downloads value needed to be updated
4. `/src/index.js` - The interactive mode needed to use the config value instead of a hardcoded value, and local mode needed to support both --max-files and --max-downloads options

## Solution Plan

### 1. Update the default configuration

- Change the default max downloads from 100 to 50 in `config.js`

### 2. Improve the PlaywrightCrawler implementation

- Create a totalDownloadLimit property to enforce a strict limit across all sources
- Pass the remaining downloads count to each crawler method
- Limit the number of images processed in each source based on the remaining downloads
- Add better progress reporting during downloads
- Provide clear feedback when the download limit is reached
- Create a centralized trackProgress utility method for consistent progress reporting

### 3. Fix the LocalCrawler implementation

- Update the constructor to use the config default max downloads value
- Add proper tracking of processed vs. copied files
- Check the max files limit before copying each file
- Stop scanning directories once the limit is reached
- Add better progress reporting during file processing

### 4. Update the CLI interface

- Add --max-downloads as an alias for --max-files in local mode for consistency
- Ensure both options work interchangeably
- Update the README to document the new options

### 5. Fix the interactive mode

- Use the config value for max downloads instead of a hardcoded value
- Apply consistent defaults across the application

## Implementation Steps

### Web Mode Fixes

1. Update the default max downloads value in `config.js` from 100 to 50
2. Modify the PlaywrightCrawler constructor to use the config default and initialize a totalDownloadLimit property
3. Add a trackProgress utility method to centralize progress reporting
4. Update the start method to enforce the totalDownloadLimit across all sources
5. Update each crawler method (Pixabay, Unsplash, Google Images) to:
   - Accept and respect a remainingDownloads parameter
   - Use the totalDownloadLimit instead of options.maxDownloads
   - Limit the URLs processed based on the remaining downloads
6. Update the downloadImage method to use the trackProgress utility
7. Improve final reporting to show downloads per source and overall status

### Local Mode Fixes

1. Update the LocalCrawler constructor to use the config default max downloads value
2. Add tracking of processed files vs. copied files
3. Update the scanDirectory method to:
   - Stop scanning once the limit is reached
   - Track processed files and report progress
4. Update the processFile method to check the max files limit before copying
5. Improve final reporting to show processed vs. copied files

### CLI Interface Updates

1. Add --max-downloads as an alias for --max-files in local mode
2. Update the crawler options to use either max-files or max-downloads
3. Add better logging of the max files limit
4. Update the interactive mode to use the config value instead of hardcoded value
5. Update the README to document the new options and behavior

## Testing Plan

### Web Mode Testing

1. Test with different max downloads values to ensure exactly that many images are downloaded
2. Test the fallback behavior when not enough images are available
3. Verify that the progress reporting correctly shows the download status
4. Confirm that the interactive mode uses the correct default value
5. Test that the limit is enforced across all sources (Pixabay, Unsplash, Google Images)
6. Verify that the final report shows downloads per source

### Local Mode Testing

1. Test with different max files values to ensure exactly that many files are copied
2. Test with both --max-files and --max-downloads options to ensure they work interchangeably
3. Verify that the scanner stops once the limit is reached
4. Test with large directories to ensure the scanner doesn't process thousands of files unnecessarily
5. Verify that the progress reporting correctly shows processed vs. copied files

### General Testing

1. Test that the default value of 50 is used when no limit is specified
2. Test that the config default is properly applied across all modes
3. Test the error handling when limits are reached or invalid values are provided

1. Run the application in local mode with the fix applied
2. Verify that the output directory is correctly created
3. Test with different configurations to ensure robustness

This approach focuses on adding proper validation and fallbacks rather than changing the core functionality, ensuring a reliable solution without breaking existing code.
