# macOS and Windows Compatibility Analysis Plan

This document outlines the plan to analyze the current application for compatibility with macOS and Windows operating systems, focusing on simple and reliable solutions.

**Phase 1: Initial Analysis & Understanding**

1.  **Project Structure Review:**
    *   List the contents of the project root directory to get an overview of the project structure, main files, and identify the primary technologies used.
    *   Look for key files like `package.json` (for Node.js projects), `requirements.txt` (for Python), build scripts, etc.

2.  **Read Key Files:**
    *   Examine `README.md` for a general project description and any existing notes on compatibility.
    *   Check any configuration files (e.g., `config.js`, `settings.json`) for platform-specific settings.
    *   Review `tests/unit/platform.test.js` as it might already contain logic or tests related to platform differences.
    *   Review `tests/unit/paths.test.js` as path handling is a common source of cross-platform issues.

**Phase 2: Identifying Potential Compatibility Issues**

Based on the initial analysis, the following common cross-platform pitfalls will be investigated:

1.  **File System Path Manipulation:**
    *   **Concern:** Hardcoded path separators (e.g., using `/` or `\` directly instead of `path.join()` or `path.sep` in Node.js).
    *   **Action:** Scan the codebase for manual string concatenation for paths. Recommend using platform-agnostic path modules (e.g., `path` in Node.js).

2.  **External Dependencies and Native Modules:**
    *   **Concern:** Reliance on platform-specific binaries or native modules that may not have equivalents or work correctly on both Windows and macOS.
    *   **Action:** Check `package.json` (if Node.js) or equivalent for dependencies. Investigate any native modules for their cross-platform support.

3.  **Platform-Specific APIs or Commands:**
    *   **Concern:** Use of OS-specific commands (e.g., `ls`, `dir`, `copy`, `xcopy`) or APIs (e.g., Windows Registry access, macOS-specific frameworks).
    *   **Action:** Search for common platform-specific commands or API calls. Suggest using cross-platform alternatives or Node.js `os` module for conditional logic if necessary.

4.  **Case Sensitivity:**
    *   **Concern:** Inconsistent casing in file requires/imports (e.g., `require('./MyModule')` vs. `require('./mymodule')`).
    *   **Action:** Review import statements for consistent casing, matching the actual file names.

5.  **Line Endings (CRLF vs. LF):**
    *   **Concern:** Inconsistent line endings in text files or scripts could cause issues.
    *   **Action:** Note if any script seems sensitive to line endings. Recommend Git configuration or `.gitattributes`.

6.  **Environment Variables:**
    *   **Concern:** Differences in how environment variables are set or accessed.
    *   **Action:** Review usage of environment variables, especially in any build or utility scripts.

7.  **Shell Scripting:**
    *   **Concern:** Presence of `.sh`, `.bat`, or `.ps1` scripts.
    *   **Action:** Assess if they need platform-specific versions or can be rewritten using a cross-platform tool/language.

**Phase 3: Documentation and Recommendations**

1.  **Consult `context7`:**
    *   Use `context7` to fetch the latest documentation and best practices for key Node.js modules (`fs`, `path`, `os`) regarding cross-platform development.

2.  **Propose Changes (if any):**
    *   If compatibility issues are found, suggest specific, minimal changes to address them, prioritizing Node.js built-in solutions.

3.  **Wait for Approval:**
    *   After this plan is documented, await user approval before proceeding with the detailed analysis and any potential modifications.
