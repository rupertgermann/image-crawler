# Header Action Buttons Implementation Plan

**Date:** 2025-05-23

## Overview

This document outlines the plan to implement the following feature:
- Move the "Start Local Scan" and "Start Web Download" buttons to the UI header, next to the Mode Selection
- Add a "Stop" button to cancel ongoing operations
- Ensure all buttons are accessible from the header regardless of which mode is selected

## Current Analysis

### Current Implementation

The application has two separate buttons for starting operations:
1. `startLocalScanBtn` - Starts the local file scan in Local mode
2. `startWebDownloadBtn` - Starts the web crawling in Web mode

These buttons are located in their respective mode sections and are only visible when that particular mode is active.

The current implementation does not have a stop mechanism. When a process is started:
1. The respective button is disabled and its text is changed (e.g., from "Start Local Scan" to "Scanning...")
2. The crawler class runs its operations asynchronously
3. When completed, the button is re-enabled and its text is restored

### Required Changes

1. **Main UI Changes**:
   - Remove existing start buttons from their respective sections
   - Add a unified "Start" button to the header (which will perform the correct action based on selected mode)
   - Add a "Stop" button next to the Start button in the header

2. **Backend Changes**:
   - Implement stop functionality in both crawler classes
   - Add IPC handlers for the stop operations
   - Update preload.js to expose stop functionality to the renderer

## Implementation Plan

### Header Layout & Button Order

**All labels and buttons in the header must be in one row and in this order:**

- **Left section:**
  - App title ("Image Crawler")
  - Mode selector label ("Mode:")
  - Local radio button ("Local")
  - Web radio button ("Web")
- **Right section:**
  - Start button (green): label is "Start Local Scan" in local mode, "Start Web Download" in web mode
  - Stop all commands button (red)
  - Dark mode toggle button

**Example header HTML structure:**

```html
<header class="header">
  <div class="header__left">
    <h1>Image Crawler</h1>
    <span class="header__mode-label">Mode:</span>
    <div class="mode-selection" role="radiogroup" aria-label="Application mode">
      <label class="mode-option">
        <input type="radio" name="mode" value="local" checked>
        <span>Local</span>
      </label>
      <label class="mode-option">
        <input type="radio" name="mode" value="web">
        <span>Web</span>
      </label>
    </div>
  </div>
  <div class="header__actions">
    <button id="actionButton" class="button button--success">Start Local Scan</button>
    <button id="stopButton" class="button button--danger" disabled>Stop</button>
    <button id="themeToggle" class="button button--icon" aria-label="Toggle dark mode">
      <!-- Theme icons here -->
    </button>
  </div>
</header>
```

- The left section should be a flex row with the app title, "Mode:" label, and the two radio buttons for mode selection.
- The right section should be a flex row with the green start button, the red stop button, and the dark mode toggle.
- All header controls must be vertically centered and visually compact.

### 1. Modify Crawler Classes to Support Stopping

Both crawler classes need a way to gracefully terminate their operations.

#### LocalCrawler Class

Add a `stopRequested` flag and check it during scanning:

```javascript
// Add to LocalCrawler class
this.stopRequested = false;

// Add a stop method
stop() {
  this.stopRequested = true;
  this.emit('log', 'info', 'Stop requested, finishing current operation...');
}

// Modify scanDirectory method to check for stop
async scanDirectory(dir) {
  try {
    if (this.stopRequested || this.fileCount >= this.options.maxDownloads) {
      return;
    }
    
    // Existing code...
    for (const entry of entries) {
      if (this.stopRequested) {
        this.emit('log', 'info', 'Stop requested, scanning interrupted.');
        return;
      }
      
      // Existing code...
    }
  } catch (error) {
    // Existing error handling...
  }
}
```

#### PlaywrightCrawler Class

Similar changes for the PlaywrightCrawler class:

```javascript
// Add to PlaywrightCrawler class
this.stopRequested = false;

// Add a stop method
stop() {
  this.stopRequested = true;
  this.emit('log', 'info', 'Stop requested, finishing current operation...');
}

// Check the flag in the download process
```

### 2. Update Main Process (main.cjs)

Add handlers for the stop operations and maintain references to active crawlers:

```javascript
// Add to main.cjs
let activeLocalCrawler = null;
let activeWebCrawler = null;

// Modify existing START_LOCAL_SCAN handler
ipcMain.handle('START_LOCAL_SCAN', async (event, options) => {
  // ...existing code...
  try {
    const crawler = new LocalCrawler(options);
    activeLocalCrawler = crawler; // Store reference
    // ...existing event setup...
    await crawler.start();
    activeLocalCrawler = null; // Clear reference when done
    return { success: true };
  } catch (error) {
    activeLocalCrawler = null; // Clear reference on error
    // ...existing error handling...
  }
});

// Add similar modification to START_WEB_DOWNLOAD handler

// Add new handlers for stopping
ipcMain.handle('STOP_LOCAL_SCAN', async () => {
  if (activeLocalCrawler) {
    activeLocalCrawler.stop();
    return { success: true, message: 'Stop signal sent to local crawler' };
  }
  return { success: false, message: 'No active local crawler to stop' };
});

ipcMain.handle('STOP_WEB_DOWNLOAD', async () => {
  if (activeWebCrawler) {
    activeWebCrawler.stop();
    return { success: true, message: 'Stop signal sent to web crawler' };
  }
  return { success: false, message: 'No active web crawler to stop' };
});
```

### 3. Update Preload.js

Expose the new stop methods to the renderer process:

```javascript
// Add to existing electronAPI object
stopLocalScan: () => ipcRenderer.invoke('STOP_LOCAL_SCAN'),
stopWebDownload: () => ipcRenderer.invoke('STOP_WEB_DOWNLOAD'),
```

### 4. Update HTML Structure (index.html)

Move the start/stop buttons to the header:

```html
<header class="header">
  <div class="header__left">
    <h1>Image Crawler</h1>
    <div class="mode-selection" role="radiogroup" aria-label="Application mode">
      <!-- Existing mode selection radios -->
    </div>
  </div>
  <div class="header__actions">
    <button id="actionButton" class="button button--success">Start</button>
    <button id="stopButton" class="button button--danger" disabled>Stop</button>
    <button id="themeToggle" class="button button--icon" aria-label="Toggle dark mode">
      <!-- Existing theme toggle content -->
    </button>
  </div>
</header>
```

Remove the old buttons from their respective sections:

```html
<!-- In localOptions section -->
<!-- Remove:
<div class="mt-md">
  <button id="startLocalScanBtn" class="button button--success">Start Local Scan</button>
</div>
-->

<!-- In webOptions section -->
<!-- Remove:
<div class="mt-md">
  <button id="startWebDownloadBtn" class="button button--success">Start Web Download</button>
</div>
-->
```

### 5. Update CSS (styles.css)

Add styles for the stop button and update header styles:

```css
/* Add this to your existing styles */
.button--danger {
  background-color: var(--error-color);
}

.button--danger:hover:not(:disabled) {
  background-color: #c82333; /* Darker red on hover */
}

/* Update header__actions to accommodate more buttons */
.header__actions {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}
```

### 6. Update JavaScript Logic (renderer.js)

Modify the renderer.js file to handle the unified action button:

```javascript
// Add after DOMContentLoaded event
const actionButton = document.getElementById('actionButton');
const stopButton = document.getElementById('stopButton');
let isProcessActive = false;

// Set up the action button behavior based on mode
function updateActionButtonLabel() {
  const selectedMode = document.querySelector('input[name="mode"]:checked').value;
  if (selectedMode === 'local') {
    actionButton.textContent = 'Start Scan';
  } else {
    actionButton.textContent = 'Start Download';
  }
}

// Call initially and add to mode radio change listeners
updateActionButtonLabel();
modeRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    updateVisibleOptions();
    updateActionButtonLabel();
  });
});

// Handle action button click
if (actionButton && window.electronAPI) {
  actionButton.addEventListener('click', async () => {
    const selectedMode = document.querySelector('input[name="mode"]:checked').value;
    
    if (selectedMode === 'local') {
      // Existing local scan logic
      const sourceDir = document.getElementById('localSourceDir').value;
      const outputDir = localOutputDirInput.value;
      if (!sourceDir || !outputDir) {
        alert('Source and Output directories are required for local scan.');
        return;
      }
      
      // Build options and start the scan
      const options = {
        // All local scan options as before
      };
      
      isProcessActive = true;
      actionButton.disabled = true;
      stopButton.disabled = false;
      actionButton.textContent = 'Scanning...';
      
      setupLocalCrawlerEventListeners(actionButton, 'Start Scan');
      
      try {
        const result = await window.electronAPI.startLocalScan(options);
        // Handle result as before
      } catch (error) {
        // Handle error as before
        isProcessActive = false;
        actionButton.disabled = false;
        stopButton.disabled = true;
      }
    } else {
      // Existing web download logic
      const query = document.getElementById('webQuery').value;
      const outputDir = webOutputDirInput.value;
      if (!query.trim() || !outputDir) {
        alert('Search query and Output directory are required.');
        return;
      }
      
      // Build options and start the download
      const options = {
        // All web download options as before
      };
      
      isProcessActive = true;
      actionButton.disabled = true;
      stopButton.disabled = false;
      actionButton.textContent = 'Downloading...';
      
      setupWebCrawlerEventListeners(actionButton, 'Start Download');
      
      try {
        const result = await window.electronAPI.startWebDownload(options);
        // Handle result as before
      } catch (error) {
        // Handle error as before
        isProcessActive = false;
        actionButton.disabled = false;
        stopButton.disabled = true;
      }
    }
  });
}

// Handle stop button click
if (stopButton && window.electronAPI) {
  stopButton.addEventListener('click', async () => {
    if (!isProcessActive) return;
    
    const selectedMode = document.querySelector('input[name="mode"]:checked').value;
    try {
      let result;
      if (selectedMode === 'local') {
        result = await window.electronAPI.stopLocalScan();
        logMessage(`Stopping local scan: ${result.message}`);
      } else {
        result = await window.electronAPI.stopWebDownload();
        logMessage(`Stopping web download: ${result.message}`);
      }
      
      // Don't disable/enable buttons here - wait for the complete/error events
      stopButton.textContent = 'Stopping...';
      stopButton.disabled = true;
    } catch (error) {
      logMessage(`Error stopping process: ${error.message}`);
    }
  });
}

// Modify the existing event listener functions
function setupLocalCrawlerEventListeners(buttonElement, originalButtonText) {
  // Existing code...
  
  if (window.electronAPI.onLocalCrawlerComplete) {
    window.electronAPI.onLocalCrawlerComplete((data) => {
      // Existing code...
      buttonElement.disabled = false;
      buttonElement.textContent = originalButtonText;
      stopButton.disabled = true;
      stopButton.textContent = 'Stop';
      isProcessActive = false;
    });
  }
  
  if (window.electronAPI.onLocalCrawlerError) {
    window.electronAPI.onLocalCrawlerError((error) => {
      // Existing code...
      buttonElement.disabled = false;
      buttonElement.textContent = originalButtonText;
      stopButton.disabled = true;
      stopButton.textContent = 'Stop';
      isProcessActive = false;
    });
  }
}

// Similar modifications for setupWebCrawlerEventListeners
```

## Testing Plan

1. Test basic UI:
   - Verify the Start button appears in the header and changes label based on mode
   - Verify the Stop button is initially disabled
   - Verify theme toggle still works correctly

2. Test Local mode functionality:
   - Start a local scan and verify button states change correctly
   - Verify the Stop button becomes enabled
   - Test stopping a scan mid-process
   - Verify UI returns to ready state after completion or error

3. Test Web mode functionality:
   - Similar tests for web download functionality
   - Verify stopping works properly

4. Test edge cases:
   - Rapid switching between modes
   - Starting a process and immediately stopping it
   - Multiple stop requests

## Conclusion

This implementation plan provides a comprehensive approach to adding header action buttons for starting and stopping operations. The changes maintain the existing functionality while adding the ability to cancel ongoing operations, which enhances user experience and control over the application.
