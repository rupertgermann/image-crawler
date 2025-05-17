# Prevent Overwriting Duplicates via File-Hash Comparison

## Overview

Before saving any downloaded or copied image, compute its content hash (MD5) and skip writing if that hash already exists in the output directory.

This applies to:
- **Web mode** (`PlaywrightCrawler.processImage`)
- **Local mode** (`LocalCrawler.processFile`)

## Implementation Plan

1. **Create `hash-utils.js`**
   - Exports:
     - `computeBufferHash(buffer: Buffer): Promise<string>`
     - `computeFileHash(filePath: string): Promise<string>`
   - Uses Node's built-in `crypto` and `fs-extra`.

2. **Initialize `seenHashes` set** in both crawlers:
   - After ensuring the output directory exists, scan existing files:
     ```js
     const files = await fs.readdir(outputDir, { withFileTypes: true });
     for (const file of files) {
       if (file.isFile()) {
         const hash = await computeFileHash(path.join(outputDir, file.name));
         this.seenHashes.add(hash);
       }
     }
     ```

3. **Web mode (`playwright-crawler.js`)**
   - Import `computeBufferHash`, `computeFileHash`.
   - In `start()`, build `this.seenHashes` before crawling providers.
   - In `processImage()`, after downloading buffer:
     ```js
     const hash = await computeBufferHash(buffer);
     if (this.seenHashes.has(hash)) {
       Logger.info(`Skipping duplicate image by hash: ${finalImageName}`);
       this.skippedCount++;
       return false;
     }
     this.seenHashes.add(hash);
     ```

4. **Local mode (`local-crawler.js`)**
   - Import `computeFileHash`.
   - In `start()`, build `this.seenHashes`.
   - In `processFile()`, after validating criteria but before copying:
     ```js
     const hash = await computeFileHash(filePath);
     if (this.seenHashes.has(hash)) {
       Logger.info(`Skipping duplicate local file by hash: ${path.basename(filePath)}`);
       this.skippedFiles++;
       return;
     }
     this.seenHashes.add(hash);
     ```

## Rationale
- **Reliable**: Uses content-based comparison, not filenames.
- **Minimal**: Only one new utility module and localized edits in two crawlers.
- **Performance**: Hashing existing files and buffers is acceptable for typical use.
