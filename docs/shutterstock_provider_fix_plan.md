# Shutterstock Provider Fix Plan

## Issue Analysis

After examining the codebase, I've identified the root cause of the error:

```
[WEB DOWNLOAD - ERROR]: Failed to load provider shutterstock: this.logInfo is not a function
```

### Root Cause

1. The `ShutterstockProvider` class is using non-existent logging methods:
   - `this.logInfo()`
   - `this.logWarn()`
   - `this.logError()`

2. The correct logging methods in `BaseProvider` are:
   - `this.emitLog('info', message)`
   - `this.emitLog('warn', message)`
   - `this.emitLog('error', message, error)`

3. These logging methods correctly use the event emitter pattern established in the BaseProvider class, which handles both direct logging and event emission to the main process.

### Affected Files

1. Primary issue:
   - `/src/providers/shutterstock-provider.js`

2. Potentially affected files with similar patterns:
   - `/src/providers/stocksnap-provider.js` (likely has the same issue)
   - Any other newly added providers

## Fix Plan

### Step 1: Fix ShutterstockProvider

Replace all instances of:
- `this.logInfo()` with `this.emitLog('info', ...)`
- `this.logWarn()` with `this.emitLog('warn', ...)`
- `this.logError()` with `this.emitLog('error', ..., error)`

### Step 2: Fix StockSnapProvider

Apply the same pattern of replacements to ensure consistency.

### Step 3: Verify Other Providers

Scan other provider implementations to ensure they follow the correct logging pattern.

### Step 4: Testing

1. Test the Shutterstock provider by:
   - Running the application
   - Selecting "Shutterstock" from the provider dropdown
   - Entering a search query and starting the download
   - Verifying logs are properly displayed and no errors occur

2. Test the StockSnap provider similarly to ensure it works correctly.

## Implementation Notes

- The fix will be minimal and focused only on the logging methods
- No changes to functionality or behavior will be made
- Existing logging messages will be preserved exactly as they are
- This maintains consistency with the established event emission pattern in the codebase

## Future Prevention

Consider adding JSDoc documentation to the BaseProvider class to clearly document the available logging methods and provide type hints for developers implementing new providers.
