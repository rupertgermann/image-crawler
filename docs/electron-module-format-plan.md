# Electron Module Format Consistency Plan (Concise)

## Problem
- Electron main process (`electron/main.js`) uses CommonJS (`require`) but is a `.js` file in an ESM project. This causes runtime errors.
- Other files/extensions are consistent except for possible preload script.

## Solution
1. **Rename `electron/main.js` → `electron/main.cjs`**
   - Ensures Electron main runs as CommonJS, fixing `require` errors.
2. **Update Electron launch script in `package.json`**
   - Point to `electron/main.cjs` instead of `.js`.
3. **Review `electron/preload.js`**
   - If it uses `require` or Node APIs, rename to `.cjs`.
   - If only browser/Electron APIs, keep as `.js`.

## Rationale
- Minimal, robust, and Electron best practice.
- No unnecessary changes to ESM codebase.

---

**Awaiting approval before making changes.**
