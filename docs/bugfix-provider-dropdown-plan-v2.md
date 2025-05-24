# Plan to Fix Provider Dropdown Bug (v2.1)

## Issue
Only a limited number of providers are appearing in the provider selection dropdown in the UI, despite more providers being configured and refactored into individual files.

## Core Idea
The `ProviderRegistry` will discover all available provider configurations (Playwright and API-based). It will then consult `configManager` to get the `enabled` status and specific parameters for each discovered provider. The UI dropdown will be populated with all *discovered* providers, regardless of their `enabled` status (as `enabled` controls crawling, not UI visibility for selection).

## Revised Plan

### 1. Update `DEFAULT_CONFIG` in `src/utils/config.js`

*   **Action:**
    *   **Remove** the `providers.order` array entirely from `DEFAULT_CONFIG`.
    *   Ensure the `providers` object within `DEFAULT_CONFIG` has a default configuration entry for *every* known provider. This includes:
        *   **Playwright (11):** `google`, `bing`, `duckduckgo`, `pixabay`, `unsplash`, `freeimages`, `stocksnap`, `shutterstock_preview` (key corrected from `shutterstock`), `freerangestock`, `publicdomainpictures`, `reshot`.
        *   **API-based (3):** `pexels`, `flickr`, `wikimedia`.
    *   Each entry should have an `enabled` flag (e.g., `enabled: true` or `enabled: false` by default) and any other critical default parameters (e.g., `maxResults`).
*   **Rationale:** `DEFAULT_CONFIG` becomes the comprehensive source of default settings for all potentially discoverable providers. The user's `config.json` will overlay their specific settings via `deepMerge`.

### 2. Modify `ProviderRegistry.js` for Dynamic Discovery and Initialization

*   **Action A: `_loadPlaywrightConfigs()`**
    *   No changes anticipated; it correctly loads all `.js` files from `src/providers/configs/playwright/` and stores them in `this.playwrightProviderConfigs` (mapping provider name to its config object).
*   **Action B: Modify `initialize(crawlerInstance)`**
    *   Remove any reliance on an `order` array from `configManager`.
    *   Construct a comprehensive list of *all known provider names*. This list will be derived from:
        1.  `Object.keys(this.playwrightProviderConfigs)` (for Playwright providers).
        2.  A hardcoded array of API-based provider names: `['pexels', 'flickr', 'wikimedia']`.
        3.  Combine these and ensure uniqueness.
    *   Iterate over this *combined list of all known provider names*.
    *   Inside the loop, for each `providerName`:
        *   Fetch its specific configuration from `configManager.getConfig().providers[providerName]`.
        *   Check if `configManager.getConfig().providers[providerName]?.enabled` is true. If so, proceed to load and instantiate the provider class as currently done.
*   **Action C: Add `getAllKnownProviderNames()` method**
    *   This new method will return an array of strings. This array will contain the names of all providers the registry is aware of (all keys from `this.playwrightProviderConfigs` plus the hardcoded API provider names).
    *   Example:
        ```javascript
        getAllKnownProviderNames() {
          const playwrightProviderNames = Object.keys(this.playwrightProviderConfigs);
          const apiProviderNames = ['pexels', 'flickr', 'wikimedia']; // Define these consistently
          // Ensure this method is called after _loadPlaywrightConfigs has populated playwrightProviderConfigs
          return [...new Set([...playwrightProviderNames, ...apiProviderNames])].sort(); // Sort for consistent UI
        }
        ```
*   **Rationale:** `initialize` will now process providers based on actual discovery, not a predefined order. `getAllKnownProviderNames` will provide the UI with the complete list for the dropdown.

### 3. Update `configManager.js` (`src/utils/config.js`)

*   **Action A: Modify `loadConfig()`**
    *   Change `this.config = { ...DEFAULT_CONFIG, ...configData };`
    *   To `this.config = this.deepMerge(JSON.parse(JSON.stringify(DEFAULT_CONFIG)), configData);`
*   **Action B: Modify `getConfig()`**
    *   Adjust to ensure it returns a correctly merged config:
        ```javascript
        getConfig(overrides = {}) {
          // this.config is already a deep merge of DEFAULT_CONFIG and user's config.json from loadConfig/createDefaultConfig
          const baseConfig = this.config ? JSON.parse(JSON.stringify(this.config)) : JSON.parse(JSON.stringify(DEFAULT_CONFIG));
          return this.deepMerge(baseConfig, overrides);
        }
        ```
*   **Action C: Remove `getEffectiveProvidersConfig()` and `getProviderOrder()`**
    *   These methods, which revolved around the `order` array, are no longer needed and should be removed to avoid confusion. `ProviderRegistry` will directly use `configManager.getConfig().providers`.
*   **Rationale:** Simplifies `configManager` by removing deprecated `order` logic and ensures robust configuration merging.

### 4. Update UI Population Logic (`electron/main.cjs` and `electron/renderer.js`)

*   **Action A (Main Process - `electron/main.cjs`):**
    *   The IPC handler responsible for providing the list of providers to the renderer should now call `providerRegistry.getAllKnownProviderNames()` (after `providerRegistry` has been initialized and `_loadPlaywrightConfigs` has run).
*   **Action B (Renderer Process - `electron/renderer.js`):**
    *   The code that populates the provider dropdown should use the list of names received from the main process via IPC.
*   **Rationale:** Ensures the UI dropdown displays all discovered providers, sorted alphabetically for consistency.

### 5. User Actions After Implementation

1.  **Modify `config.json` (if necessary):**
    *   Ensure the provider key for Shutterstock is `shutterstock_preview` if it was previously `shutterstock`, to match the configuration filename and the updated default key in `DEFAULT_CONFIG`.
    *   Users can continue to enable/disable providers and set their specific parameters in `config.json`. The dropdown will show all providers; the `enabled` status will control whether they are used for crawling.

This revised plan focuses on dynamic discovery and robust default handling, removing the dependency on an explicit `providers.order` array for listing providers in the UI.
