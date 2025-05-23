# Plan: Add "Clear Log" Button to UI

## Objective
Add a button to the UI that allows the user to clear the contents of the log display area.

## Affected Files
1.  `electron/index.html`
2.  `electron/renderer.js`

## Implementation Steps

### 1. Modify `electron/index.html`
   - In the "Logs" section, locate the `div` containing the "Save UI Logs" button.
   - Add a new button element next to or below the "Save UI Logs" button.
   - **Button HTML:**
     ```html
     <button id="clearUiLogsBtn" class="button button--secondary">Clear Logs</button>
     ```
   - Ensure it's within the same `div` with class `mt-md` for consistent spacing, or adjust styling as needed.

   **Example structure:**
   ```html
   <section class="section">
       <h2>Logs</h2>
       <div id="logArea" class="log-area"></div>
       <div class="mt-md">
           <button id="saveUiLogsBtn" class="button button--secondary">Save UI Logs</button>
           <button id="clearUiLogsBtn" class="button button--secondary">Clear Logs</button> <!-- New Button -->
       </div>
   </section>
   ```

### 2. Modify `electron/renderer.js`
   - At the beginning of the `DOMContentLoaded` event listener, ensure `logArea` is defined:
     ```javascript
     const logArea = document.getElementById('logArea');
     ```
   - Ensure the `logMessage` function is available.
   - Add the following code, typically after the event listener setup for `saveUiLogsBtn`:

     ```javascript
     // --- Event Listener for Clear UI Logs Button ---
     const clearUiLogsBtn = document.getElementById('clearUiLogsBtn');

     if (clearUiLogsBtn && logArea) { // Ensure both elements exist
         clearUiLogsBtn.addEventListener('click', () => {
             if (logArea) {
                 logArea.innerHTML = ''; // Clear all content from the log area
                 logMessage('UI logs cleared by user.'); // Log the action
             }
         });
     } else {
         if (!clearUiLogsBtn) {
             console.warn('Clear UI Logs button (clearUiLogsBtn) not found.');
         }
         if (!logArea) {
             console.warn('Log area (logArea) not found when setting up clear logs button.');
         }
     }
     ```

## Considerations
- **Simplicity**: The chosen method (`innerHTML = ''`) is the simplest way to clear the log content.
- **Reliability**: This approach is reliable for client-side log clearing.
- **No Backend Changes**: This feature is entirely front-end and does not require changes to `preload.js` or `main.cjs`.
- **Styling**: The new button will reuse the `button` and `button--secondary` classes. If different styling is desired, `electron/css/styles.css` would need to be updated. For now, existing styles are assumed to be sufficient.
- **User Experience**: Adding a log entry after clearing confirms the action to the user.

## Testing
- Verify the "Clear Logs" button appears in the UI.
- Populate the log area with some messages.
- Click the "Clear Logs" button.
- Verify all previous log messages are removed.
- Verify a new message "UI logs cleared by user." appears as the only entry.
- Verify the "Save UI Logs" button still works correctly.
