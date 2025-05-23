# Electron UI Refactoring Plan

**Date:** 2025-05-23

**1. Objective:**
   Refactor the Electron application's UI to:
    *   Improve space efficiency and reduce scrolling.
    *   Increase the initial application window size.
    *   Implement a user-toggleable dark mode.
    *   Modernize the look and feel using Tailwind CSS.

**2. Affected Files (Primary):**
    *   `electron/main.cjs`: For initial window size.
    *   `electron/index.html`: For HTML structure and Tailwind CSS class application.
    *   `electron/renderer.js`: For dark mode toggle logic and any necessary DOM manipulation updates.
    *   `package.json`: For adding Tailwind CSS dependencies and build scripts.
    *   **New File:** `tailwind.config.js`: Tailwind CSS configuration.
    *   **New File:** `postcss.config.js`: PostCSS configuration (Tailwind dependency).
    *   **New File:** `electron/css/tailwind-input.css`: Input file for Tailwind directives.
    *   **New File:** `electron/css/tailwind-output.css`: Generated CSS file to be linked in `index.html`.

**3. Detailed Plan:**

**Phase 0: Preparation & Tailwind CSS Integration**

1.  **Increase Default Window Size:**
    *   **File:** `electron/main.cjs`
    *   **Action:** Modify the `createWindow` function to set larger default dimensions for `BrowserWindow`. For example, `width: 1200`, `height: 900`.
2.  **Install Dependencies:**
    *   **File:** `package.json`
    *   **Action:** Add Tailwind CSS, PostCSS, and Autoprefixer as development dependencies.
        ```bash
        npm install -D tailwindcss postcss autoprefixer
        ```
3.  **Initialize Tailwind CSS:**
    *   **Action:** Run `npx tailwindcss init -p` to create `tailwind.config.js` and `postcss.config.js`.
4.  **Configure Tailwind CSS:**
    *   **File:** `tailwind.config.js`
    *   **Action:**
        *   Configure the `content` array to include paths to your HTML and JavaScript files where Tailwind classes will be used: `['./electron/**/*.html', './electron/**/*.js']`.
        *   Enable class-based dark mode: `darkMode: 'class'`.
5.  **Create Tailwind Input CSS:**
    *   **File:** `electron/css/tailwind-input.css` (create this file and directory if they don't exist)
    *   **Action:** Add Tailwind's base, components, and utilities directives:
        ```css
        @tailwind base;
        @tailwind components;
        @tailwind utilities;
        ```
6.  **Add Build Scripts to `package.json`:**
    *   **File:** `package.json`
    *   **Action:** Add scripts to compile `tailwind-input.css` into `tailwind-output.css`.
        ```json
        "scripts": {
          // ... other scripts
          "build:css": "tailwindcss -i ./electron/css/tailwind-input.css -o ./electron/css/tailwind-output.css",
          "watch:css": "tailwindcss -i ./electron/css/tailwind-input.css -o ./electron/css/tailwind-output.css --watch"
        }
        ```
7.  **Link CSS & Remove Old Styles:**
    *   **File:** `electron/index.html`
    *   **Action:**
        *   Remove the existing `<style>` block from the `<head>`.
        *   Link the generated `tailwind-output.css`: `<link rel="stylesheet" href="./css/tailwind-output.css">`.
        *   Run `npm run build:css` once to generate the initial `tailwind-output.css`.

**Phase 1: UI Restructuring with Tailwind CSS**

1.  **Refactor `electron/index.html`:**
    *   **General:**
        *   Apply base styling to `<body>` (e.g., `bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100`).
        *   Style the main `.container` for consistent padding and max-width (e.g., `p-4` or `p-6`).
    *   **Sections (`.section`):**
        *   Replace existing section styling with Tailwind classes (e.g., `mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow`).
        *   Style `<h2>` headings (e.g., `text-xl font-semibold mb-4`).
    *   **Form Groups (`.form-group`) and Inputs:**
        *   Use Tailwind's flexbox or grid utilities to arrange labels and inputs for better space utilization. For example, labels above inputs or side-by-side where appropriate.
        *   Style `label`, `input[type="text"]`, `input[type="number"]`, `select`, `button` elements using Tailwind utility classes. Apply consistent padding, borders, rounded corners, and focus states. Include `dark:` variants for all form elements.
        *   Example for an input: `mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500`
    *   **Mode Options (`#localOptions`, `#webOptions`):**
        *   These sections contain many form groups. Apply Tailwind grid (e.g., `grid grid-cols-1 md:grid-cols-2 gap-4`) to arrange form elements more compactly, especially for wider views, to reduce vertical scrolling.
    *   **Log Area (`#logArea`):**
        *   Style with Tailwind (e.g., `h-64 p-2 border rounded-md bg-gray-50 dark:bg-gray-700 overflow-y-auto whitespace-pre-wrap text-sm`).
    *   **Buttons:**
        *   Style all buttons consistently (e.g., `px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 dark:bg-blue-500 dark:hover:bg-blue-600`).

**Phase 2: Dark Mode Implementation**

1.  **Add Dark Mode Toggle UI:**
    *   **File:** `electron/index.html`
    *   **Action:** Add a button/switch, possibly in a header area or near the top of the page.
        ```html
        <!-- Example Toggle Button -->
        <button id="darkModeToggle" class="fixed top-4 right-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <!-- SVG icon for sun/moon, to be toggled via JS -->
            <svg id="theme-toggle-dark-icon" class="hidden w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
            <svg id="theme-toggle-light-icon" class="hidden w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm.001 6.071a1 1 0 10-1.414-1.414l-.706.707a1 1 0 101.414 1.414l.707-.707zM2 11a1 1 0 100-2H1a1 1 0 100 2h1zM11 17a1 1 0 100 2v1a1 1 0 100-2v-1z" fill-rule="evenodd" clip-rule="evenodd"></path></svg>
        </button>
        ```
2.  **Implement Toggle Logic:**
    *   **File:** `electron/renderer.js` (and inline script in `index.html` for FOUC prevention)
    *   **Action:**
        *   Add JavaScript to handle theme initialization on load and toggling.
        *   Initial load (inline in `<head>` of `index.html` to prevent FOUC):
            ```html
            <!-- In <head> of index.html -->
            <script>
              if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            </script>
            ```
        *   In `renderer.js` (or the inlined script):
            *   Get references to the toggle button and icons.
            *   Function to update icon visibility based on current theme.
            *   Event listener for the toggle button:
                *   Read current theme from `localStorage` or `document.documentElement.classList.contains('dark')`.
                *   If dark, set `localStorage.theme = 'light'` and remove `dark` class from `document.documentElement`.
                *   If light, set `localStorage.theme = 'dark'` and add `dark` class to `document.documentElement`.
                *   Update toggle icon.

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
        *   Test on different (simulated if necessary) window sizes to ensure responsiveness of Tailwind's grid/flex.
4.  **Code Review:**
    *   **Action:** Review HTML for semantic correctness and proper Tailwind usage. Review JavaScript for clarity and correctness.

**4. Workflow Suggestion:**
    *   Start `npm run watch:css` in a terminal to automatically recompile your CSS as you make changes to HTML/JS files using Tailwind classes.
    *   Commit changes frequently with clear messages (e.g., "feat: integrate tailwind css setup", "refactor(ui): restyle local options form with tailwind", "feat: implement dark mode toggle").
