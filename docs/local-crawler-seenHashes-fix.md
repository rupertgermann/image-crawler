# Fix `this.seenHashes` undefined in LocalCrawler.start()

## Issue

In `LocalCrawler.start()`, we define a nested `async function scanHashes(dir)` and then call it via `scanHashes.call(this, …)`. However, `scanHashes` is a normal function, so its `this` context is not bound to the `LocalCrawler` instance, causing `this.seenHashes` to be `undefined` inside it.

## Proposed Solution

Convert `scanHashes` to an arrow function, which inherits the lexical `this` from the surrounding method. This ensures `this.seenHashes` refers to the instance's property.

### Changes Needed

- Change the declaration:
  ```js
- async function scanHashes(dir) { ... }
+ const scanHashes = async (dir) => { ... } 
  ```
- Update the invocation:
  ```js
- await scanHashes.call(this, this.options.outputDir);
+ await scanHashes(this.options.outputDir);
  ```

No other code needs to change, and this resolves the undefined `this.seenHashes` error.
