# Duplicate Log Entries Fix Plan

## Problem Description

The application is showing duplicate log entries in the UI. Each line appears as many times as web downloads or local scans have been initiated during the current session. For example, after starting three web downloads, each log message appears three times.

## Root Cause Analysis

After investigating the codebase, I've identified the root cause:

1. When a web download or local scan is initiated, the renderer process sets up event listeners using `setupWebCrawlerEventListeners()` or `setupLocalCrawlerEventListeners()`.

2. Each time a new operation is started, these functions are called again, registering additional event listeners.

3. The old event listeners are never removed, causing each event to trigger multiple callbacks - one for each time an operation was started.

4. The preload.js file correctly exposes methods to remove these listeners (`removeAllWebCrawlerListeners` and `removeAllLocalCrawlerListeners`), but these methods are never actually called in the renderer process.

## Proposed Solution

The simplest and most reliable solution is to ensure that event listeners are properly removed before setting up new ones. Here's how we'll implement the fix:

1. **Modify the `setupWebCrawlerEventListeners` and `setupLocalCrawlerEventListeners` functions** to first remove any existing listeners before setting up new ones.

2. This will ensure that at any given time, there's only one active listener for each event type, preventing duplicate log entries.

## Implementation Details

1. In `renderer.js`, modify the `setupWebCrawlerEventListeners` function:
   - Add a call to `window.electronAPI.removeAllWebCrawlerListeners()` at the beginning of the function.

2. Similarly, modify the `setupLocalCrawlerEventListeners` function:
   - Add a call to `window.electronAPI.removeAllLocalCrawlerListeners()` at the beginning of the function.

3. No changes are needed in preload.js as it already correctly defines these functions.

4. No changes are needed in main.cjs as it's correctly emitting events without duplication.

## Benefits of this Approach

1. **Simplicity**: The fix is minimal and targeted precisely at the root cause.
2. **Reliability**: By removing all listeners before adding new ones, we ensure clean state for each operation.
3. **No Side Effects**: This change won't affect any other part of the application's functionality.
4. **Easy Maintenance**: The solution follows the existing patterns in the codebase.

## Testing Plan

After implementing the changes, we'll need to:

1. Start a web download and verify that log entries appear only once.
2. Start a second web download and confirm that log entries still appear only once.
3. Repeat the test with local scans.
4. Test a mix of local scans and web downloads to ensure both operations work correctly.

## Conclusion

This fix addresses the immediate issue of duplicate log entries while maintaining the overall architecture of the application. It's a targeted solution that doesn't introduce unnecessary complexity or risk.
