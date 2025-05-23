# Web Mode Start Button Fix Plan

## Issue Description
When clicking the start button in web mode, nothing happens and the browser console shows the following error:
```
Uncaught (in promise) TypeError: Cannot read properties of null (reading 'checked')
    at HTMLButtonElement.<anonymous> (renderer.js:328:55)
```

## Root Cause Analysis
The error occurs because:

1. In `renderer.js`, the code initializes two checkbox elements that don't exist in the HTML:
   ```javascript
   const webSafeSearchCheckbox = document.getElementById('webSafeSearch'); // Line 115
   const webHeadlessCheckbox = document.getElementById('webHeadless');     // Line 116
   ```

2. When the start button is clicked in web mode, it tries to access:
   ```javascript
   headless: webHeadlessCheckbox.checked,  // Line 328
   ```

3. Since `webHeadlessCheckbox` is `null` (the element doesn't exist), trying to access its `checked` property throws an error.

## Proposed Solution
Since the button in local mode works correctly, the issue is only with the web mode. The simplest solution is to make the code resilient to missing elements by adding null checks.

### Changes required in `electron/renderer.js`:

1. **Option Values Update**: Modify the options object in the web mode click handler to safely handle missing elements:
   ```javascript
   const options = {
       query: webQuery.value,
       outputDir,
       maxDownloads: parseInt(webMaxDownloadsInput.value) || 0,
       minWidth: parseInt(webMinWidthInput.value) || 0,
       minHeight: parseInt(webMinHeightInput.value) || 0,
       minFileSize: webMinSizeInput.value || '0KB',
       fileTypes: webFileTypesInput.value ? webFileTypesInput.value.split(',').map(ft => ft.trim()) : ['jpg', 'png'],
       provider: webProviderSelect.value || 'all',
       safeSearch: webSafeSearchCheckbox ? webSafeSearchCheckbox.checked : true,  // Safe default if element missing
       headless: webHeadlessCheckbox ? webHeadlessCheckbox.checked : true,        // Safe default if element missing
       timeout: parseInt(webTimeoutInput.value) || 30000
   };
   ```

This approach:
- Preserves existing functionality if elements are present
- Uses sensible defaults (true for both safeSearch and headless) if elements are missing
- Doesn't require adding new HTML elements
- Is resilient to future UI changes

## Implementation Risks
- **Low Risk**: This change only adds null checks to existing code without modifying core functionality
- Testing needed to ensure web downloads work with the defaulted values

## Alternative Solutions Considered

1. **Add the missing checkboxes to the HTML**:
   - This would require updating the UI, which seems unnecessary if these options aren't intended to be user-configurable
   - Would need to ensure proper styling and positioning

2. **Remove the references completely**:
   - Could remove these options from the options object
   - May break functionality if the backend requires these parameters

The proposed solution maintains the current behavior while making the code more robust.
