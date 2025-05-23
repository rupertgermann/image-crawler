# Electron Module Format Consistency Plan (Concise)

## Problem
- Electron main process (`electron/main.cjs`) is a CommonJS module, but it's trying to `require` ES Modules (`.js` files using `import` statements) from the `src` directory.
- This leads to `ERR_REQUIRE_ESM` errors when `main.cjs` attempts to `require` these ES Modules.

## Solution
To allow `electron/main.cjs` (a CommonJS module) to correctly interact with ES Modules (`.js` files) in the `src` directory, we will implement dynamic `import()` within `main.cjs` for those specific modules.

1.  **Revert `src/utils/config.cjs` to `src/utils/config.js`**
    -   This file should remain an ES Module as originally intended.
2.  **Revert `src/utils/logger.cjs` to `src/utils/logger.js`**
    -   This file should remain an ES Module as originally intended.
3.  **Ensure `src/modes/local-crawler.js` and `src/modes/playwright-crawler.js` remain as `.js` files (ES Modules).**
4.  **Modify `electron/main.cjs`:**
    -   **Wrap the entire main process logic in an `async` Immediately Invoked Function Expression (IIFE).** This is crucial to enable the use of `await` with dynamic `import()`.
    -   **Replace `require()` calls with dynamic `await import()` for the following modules:**
        -   `../src/utils/config.js`
        -   `../src/utils/logger.js`
        -   `../src/modes/local-crawler.js`
        -   `../src/modes/playwright-crawler.js`
    -   Implement `try-catch` blocks around these dynamic imports to handle potential loading errors gracefully, providing fallback mechanisms where appropriate.
    -   Ensure that any variables assigned from these dynamic imports (e.g., `configManager`, `Logger`) are correctly scoped and used within the `async` IIFE.

## Rationale
-   This approach respects the user's constraint of not modifying the `src` directory files (keeping them as ES Modules).
-   Dynamic `import()` is the standard and recommended way for CommonJS modules to load ES Modules at runtime in Node.js environments.
-   Wrapping the main process in an `async` IIFE provides the necessary asynchronous context for `await import()` calls without blocking the main thread.
-   Error handling for dynamic imports ensures the application remains robust even if a module fails to load.

---

**Awaiting approval before making changes.**
