# Bugfix Plan: Provider Selection and Bing Warning

This plan addresses two issues:
1.  Web mode provider selection from the UI is ignored, defaulting to all configured providers.
2.  A warning message `[WARN]: [Bing] Unknown full-size action type: lightbox` appears during downloads from Bing.

## Issue 1: Provider Selection Ignored

**Root Cause:**

The `ConfigManager.getConfig()` method in `src/utils/config.js` does not correctly apply the provider override selected in the UI (and stored via `setCliProviderOverrides`). When `ProviderRegistry` calls `getConfig()`, it receives a configuration where provider enablement is based solely on `config.json`, not the UI's choice.

**Solution:**

Modify the `getConfig()` method in `src/utils/config.js` within the `ConfigManager` class.

**Detailed Steps:**

1.  **File to Edit:** `src/utils/config.js`
2.  **Method to Modify:** `getConfig(overrides = {})` in `ConfigManager` class.
3.  **Logic Change:**
    *   After the base configuration (`baseConfig`) is established (from `this.config` or `DEFAULT_CONFIG`) and before runtime `overrides` are merged, check `this.cliProviderOverrides`.
    *   If `this.cliProviderOverrides` is set and is not equal to `'all'`:
        *   Iterate through all provider keys in `baseConfig.providers`.
        *   For each provider, set `baseConfig.providers[providerKey].enabled = false;`.
        *   Then, if `baseConfig.providers[this.cliProviderOverrides]` exists, set `baseConfig.providers[this.cliProviderOverrides].enabled = true;`.
    *   If `this.cliProviderOverrides` is `'all'` or not set, the original provider enablement from `config.json` (already in `baseConfig`) should be respected.
    *   Finally, merge the passed `overrides` argument as it's currently done.

**Example Snippet (Conceptual - to be integrated into existing `getConfig`):**

```javascript
// Inside ConfigManager.getConfig()
// ... after baseConfig is determined ...

if (this.cliProviderOverrides && this.cliProviderOverrides !== 'all') {
  if (baseConfig.providers) {
    for (const providerKey in baseConfig.providers) {
      if (Object.prototype.hasOwnProperty.call(baseConfig.providers, providerKey)) {
        baseConfig.providers[providerKey].enabled = false;
      }
    }
    if (baseConfig.providers[this.cliProviderOverrides]) {
      baseConfig.providers[this.cliProviderOverrides].enabled = true;
    } else {
      // Optional: Log a warning if the overridden provider doesn't exist in config
      console.warn(`[ConfigManager] CLI override provider "${this.cliProviderOverrides}" not found in configuration. No provider will be enabled by this override.`);
    }
  }
}

// ... continue with merging 'overrides' argument and returning the config ...
```

## Issue 2: Bing Warning - `Unknown full-size action type: lightbox`

**Analysis:**

The code in `src/providers/generic-playwright-provider.js` for `getFullSizeImage` appears to correctly convert the `actionConfig.type` (e.g., 'lightbox' from `bing.js`) to uppercase ('LIGHTBOX') before looking it up in the `FULL_SIZE_ACTIONS` map. The `FULL_SIZE_ACTIONS` map also appears to correctly define `LIGHTBOX` as a key mapping to the `lightbox` handler function.

This warning is puzzling if the code is as reviewed and the related memory (`82ea070f-8826-4747-8075-e0cb4ef3dfe9`) about a previous fix is accurate. It's possible that the warning is a symptom of an older version of the file being run, or a very subtle runtime issue.

**Proposed Action for Bing Warning:**

1.  **Prioritize Provider Selection Fix:** Implement and test the fix for Issue 1 first.
2.  **Re-test Bing:** After the provider selection is working, re-test downloading from Bing specifically.
3.  **Further Investigation (if warning persists):**
    *   If the warning `[Bing] Unknown full-size action type: lightbox` continues, add a temporary log statement in `src/providers/generic-playwright-provider.js` inside the `getFullSizeImage` method, right before the `handler` lookup, to print the `actionType` variable and the keys of the `FULL_SIZE_ACTIONS` object (e.g., `console.log('Action Type:', actionType, 'Available Action Keys:', Object.keys(FULL_SIZE_ACTIONS));`). This will confirm their runtime values.
    *   Based on this new log, determine if the key is missing or if there's another discrepancy.

For now, the primary code change will focus on `src/utils/config.js` to resolve the provider selection.

**Affected Files:**

*   `src/utils/config.js` (for provider selection fix)

**Testing Strategy:**

1.  After applying the fix to `src/utils/config.js`:
    *   Run the Electron application.
    *   Go to Web Mode.
    *   Select a single provider (e.g., "StockSnap" as in the user's report, or any other single provider like "DuckDuckGo").
    *   Enter a search query and start the download.
    *   Observe the application logs. Verify that only the selected provider attempts to download images (e.g., `[WEB DOWNLOAD - INFO]: Active providers: StockSnap` and subsequent logs are for StockSnap only).
    *   Select "All Providers" and verify that multiple configured providers become active.
2.  Specifically test with "Bing" selected to see if the `Unknown full-size action type: lightbox` warning still appears.
