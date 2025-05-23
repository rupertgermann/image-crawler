# Electron UI Refactoring Plan

**Date:** 2025-05-23

**1. Objective:**
   Refactor the Electron application's UI to:
    *   Improve space efficiency and reduce scrolling.
    *   Increase the initial application window size.
    *   Implement a user-toggleable dark mode.
    *   Modernize the look and feel using modern CSS and native Electron features for desktop optimization.

**Note:** PhotonKit/Photon is not actively maintained and not recommended in current Electron best practices. This plan has been updated to use modern CSS Grid/Flexbox and native Electron features instead.

**2. Affected Files (Primary):**
    *   `electron/main.cjs`: For initial window size and native window features.
    *   `electron/index.html`: For HTML structure and modern CSS integration.
    *   `electron/renderer.js`: For dark mode toggle logic and UI interactions.
    *   `package.json`: No additional dependencies required (using native CSS).
    *   **New File:** `electron/css/styles.css`: Main stylesheet with modern CSS Grid/Flexbox and dark mode support.

**3. Detailed Plan:**

**Phase 0: Preparation & Modern CSS Setup**

1.  **Increase Default Window Size:**
    *   **File:** `electron/main.cjs`
    *   **Action:** Modify the `createWindow` function to set larger default dimensions for `BrowserWindow`. For example, `width: 1200`, `height: 900`.
    *   **Additional:** Consider adding `backgroundColor: '#ffffff'` for better font rendering (as per Electron best practices).
2.  **Create Modern CSS Stylesheet:**
    *   **File:** `electron/css/styles.css` (create this file and directory if they don't exist)
    *   **Action:** Create a comprehensive stylesheet with CSS custom properties, Grid/Flexbox layouts, and dark mode support:
        ```css
        /* CSS Custom Properties for theming */
        :root {
          --bg-primary: #ffffff;
          --bg-secondary: #f5f5f5;
          --text-primary: #333333;
          --text-secondary: #666666;
          --border-color: #e0e0e0;
          --accent-color: #007acc;
          --accent-hover: #005a9e;
          --spacing-xs: 4px;
          --spacing-sm: 8px;
          --spacing-md: 16px;
          --spacing-lg: 24px;
          --border-radius: 4px;
          --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        /* Dark mode variables */
        [data-theme="dark"] {
          --bg-primary: #1e1e1e;
          --bg-secondary: #2d2d2d;
          --text-primary: #ffffff;
          --text-secondary: #cccccc;
          --border-color: #404040;
          --accent-color: #4fc3f7;
          --accent-hover: #29b6f6;
        }
        
        /* Base styles */
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: var(--font-family);
          background-color: var(--bg-primary);
          color: var(--text-primary);
          margin: 0;
          padding: var(--spacing-md);
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        ```
3.  **Link CSS & Remove Old Styles:**
    *   **File:** `electron/index.html`
    *   **Action:**
        *   Remove the existing `<style>` block from the `<head>`.
        *   Link the new stylesheet: `<link rel="stylesheet" href="./css/styles.css">`.
        *   Add proper Content Security Policy as recommended by Electron docs.

**Phase 1: UI Restructuring with Modern CSS**

1.  **Refactor `electron/index.html`:**
    *   **General:**
        *   Use semantic HTML5 elements (`<main>`, `<section>`, `<header>`, etc.).
        *   Apply CSS Grid for main layout structure and Flexbox for component layouts.
        *   Add CSS classes following BEM methodology for maintainability.
    *   **Sections (`.section`):**
        *   Replace existing section styling with CSS Grid containers.
        *   Use `.section` class with proper spacing and background styling.
        *   Style `<h2>` headings with consistent typography using CSS custom properties.
        *   Example: `<section class="section section--form">...</section>`
    *   **Form Groups (`.form-group`) and Inputs:**
        *   Use CSS Grid for form layouts: `display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--spacing-md);`
        *   Style form controls with consistent appearance using CSS custom properties.
        *   Example for an input: `<input type="text" class="input" placeholder="Enter value">`
        *   Example for a select: `<select class="select">...</select>`
        *   Add focus states and transitions for better UX.
    *   **Mode Options (`#localOptions`, `#webOptions`):**
        *   Use CSS Grid with responsive columns to arrange form elements compactly.
        *   Apply consistent spacing using CSS custom properties.
        *   Example: `grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));`
    *   **Log Area (`#logArea`):**
        *   Style as a dedicated component with proper typography and scrolling.
        *   Use `font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;` for better readability.
        *   Add proper height constraints and overflow handling.
    *   **Buttons:**
        *   Create consistent button styles with hover and focus states.
        *   Use CSS custom properties for theming: `background-color: var(--accent-color);`
        *   Example: `<button class="button button--primary">Start Crawl</button>`

**Phase 2: Dark Mode Implementation**

1.  **Add Dark Mode Toggle UI:**
    *   **File:** `electron/index.html`
    *   **Action:** Add a modern toggle button in the header area.
        ```html
        <!-- Example Toggle Button -->
        <header class="header">
          <div class="header__actions">
            <button id="themeToggle" class="button button--icon" aria-label="Toggle dark mode">
              <span class="theme-icon theme-icon--light" id="lightIcon">☀️</span>
              <span class="theme-icon theme-icon--dark" id="darkIcon" style="display: none;">🌙</span>
            </button>
          </div>
        </header>
        ```
2.  **Implement Toggle Logic:**
    *   **File:** `electron/renderer.js` (and inline script in `index.html` for FOUC prevention)
    *   **Action:**
        *   Add JavaScript to handle theme initialization on load and toggling using data attributes.
        *   Initial load (inline in `<head>` of `index.html` to prevent FOUC):
            ```html
            <!-- In <head> of index.html -->
            <script>
              // Check for saved theme preference or default to system preference
              const savedTheme = localStorage.getItem('theme');
              const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
              
              document.documentElement.setAttribute('data-theme', theme);
            </script>
            ```
        *   In `renderer.js`:
            *   Get references to the toggle button and icons.
            *   Function to update theme and icon visibility.
            *   Event listener for the toggle button:
                *   Read current theme from `data-theme` attribute.
                *   Toggle between 'light' and 'dark' themes.
                *   Update `data-theme` attribute and localStorage.
                *   Update icon visibility based on current theme.
            *   Listen for system theme changes to update automatically.

**Phase 3: JavaScript Adjustments & Finalization**

1.  **Update `electron/renderer.js`:**
    *   **Action:** Carefully review `renderer.js`. If IDs or class names of interactive elements (buttons, inputs, etc.) were changed during the HTML refactor, update the JavaScript selectors (`document.getElementById`, `document.querySelector`, etc.) to match the new HTML.
2.  **Functionality Testing:**
    *   **Action:** Thoroughly test all application features:
        *   Mode selection (Local/Web).
        *   Directory selection for source and output.
        *   Starting local scans and web downloads.
        *   All input fields and their effects.
        *   Log display and saving logs.
3.  **Visual Testing:**
    *   **Action:**
        *   Verify the UI in both light and dark modes.
        *   Check for consistent styling, padding, margins.
        *   Ensure layouts are efficient and reduce unnecessary scrolling.
        *   Test on different window sizes to ensure CSS Grid/Flexbox responsive layouts work properly.
        *   Verify accessibility features (focus states, keyboard navigation, ARIA labels).
4.  **Code Review:**
    *   **Action:** Review HTML for semantic correctness and proper CSS class usage. Review JavaScript for clarity and correctness.
    *   **Additional:** Validate CSS for performance and maintainability using CSS custom properties.

**4. Workflow Suggestion:**
    *   No build process required - CSS changes are immediately reflected.
    *   Use browser developer tools to test responsive layouts and dark mode.
    *   Test the application frequently during development to ensure modern CSS features render correctly across platforms.
    *   Commit changes frequently with clear messages (e.g., "feat: implement modern css grid layout", "refactor(ui): update forms with css custom properties", "feat: implement dark mode with data attributes").
