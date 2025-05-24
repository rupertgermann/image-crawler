# Task List: New Provider Implementation

This task list is derived from the `docs/new_provider_implementation_plan.md`. It outlines the steps to implement the remaining image providers.

## Providers with Detailed Plans (from Section 3 of the plan)

### 1. ✅ Implement Provider: FreeRangeStock.com (`freerangestock`) - COMPLETED 2025-05-24
- [x] Create provider file: `src/providers/freerangestock-provider.js`
- [x] Implement `constructor`
- [x] Implement `fetchImageUrls` (Web Scraping)
    - [x] Determine search URL format
    - [x] Identify CSS selectors for image links/thumbnails
    - [x] Extract metadata (detailPageUrl, thumbnailUrl, title)
- [x] Implement `getFullSizeImage` (Web Scraping)
    - [x] Navigate to detail page
    - [x] Identify CSS selector for full-size image
    - [x] Extract full-size image URL
- [x] Update `config.json` and `config.json.example`
- [x] Update `README.md`
- [x] Test provider thoroughly

### 2. ✅ Implement Provider: PublicDomainPictures.net (`publicdomainpictures`) - COMPLETED 2025-05-24
- [x] Create provider file: `src/providers/publicdomainpictures-provider.js`
- [x] Implement `constructor`
- [x] Implement `fetchImageUrls` (Web Scraping)
    - [x] Determine search URL format
    - [x] Identify CSS selectors for image items and links
    - [x] Extract metadata
- [x] Implement `getFullSizeImage` (Web Scraping)
    - [x] Navigate to detail page
    - [x] Identify CSS selector for download link/button or full image
    - [x] Extract full-size image URL
- [x] Update `config.json` and `config.json.example`
- [x] Update `README.md`
- [ ] Test provider thoroughly

### 3. ✅ Implement Provider: Reshot.com (`reshot`) - COMPLETED 2025-05-24
- [x] Create provider file: `src/providers/reshot-provider.js`
- [x] Implement `constructor`
- [x] Implement `fetchImageUrls` (Web Scraping)
    - [x] Determine search URL format
    - [x] Identify CSS selectors for image items
    - [x] Extract metadata
- [x] Implement `getFullSizeImage` (Web Scraping)
    - [x] Navigate to detail page
    - [x] Identify CSS selector for download button/link
    - [x] Extract full-size image URL
- [x] Update `config.json` and `config.json.example`
- [x] Update `README.md`
- [ ] Test provider thoroughly

### 4. Implement Provider: Adobe Stock (`adobestock`)
- [ ] Create provider file: `src/providers/adobestock-provider.js`
- [ ] Implement `constructor` (handle API key)
- [ ] Implement `fetchImageUrls`
    - [ ] **API Mode**:
        - [ ] Make API call (Search/Files endpoint)
        - [ ] Parse response and map to `imageInfo`
    - [ ] **Scraping Fallback Mode** (if no API key):
        - [ ] Navigate to search page
        - [ ] Identify CSS selectors for image items
        - [ ] Extract metadata
- [ ] Implement `getFullSizeImage`
    - [ ] **API Mode**:
        - [ ] Use `content_url` or similar for preview download
    - [ ] **Scraping Fallback Mode**:
        - [ ] Navigate to detail page
        - [ ] Identify CSS selector for main preview image
        - [ ] Extract watermarked preview URL
- [ ] Update `config.json` and `config.json.example` (include `apiKey` field)
- [ ] Update `README.md`
- [ ] Test provider thoroughly (API mode and scraping fallback)

### 5. Implement Provider: Getty Images (`gettyimages`)
- [ ] Create provider file: `src/providers/gettyimages-provider.js`
- [ ] Implement `constructor` (handle API key)
- [ ] Implement `fetchImageUrls`
    - [ ] **API Mode**:
        - [ ] Make API call (Search/Images endpoint)
        - [ ] Parse response and map to `imageInfo`
    - [ ] **Scraping Fallback Mode**:
        - [ ] Navigate to search page
        - [ ] Identify CSS selectors for image items
        - [ ] Extract metadata
- [ ] Implement `getFullSizeImage`
    - [ ] **API Mode**:
        - [ ] Use preview `uri` from `display_sizes`
    - [ ] **Scraping Fallback Mode**:
        - [ ] Navigate to detail page
        - [ ] Identify CSS selector for main preview image
        - [ ] Extract watermarked preview URL
- [ ] Update `config.json` and `config.json.example` (include `apiKey` field)
- [ ] Update `README.md`
- [ ] Test provider thoroughly (API mode and scraping fallback)

### 6. Implement Provider: Dreamstime.com (`dreamstime`)
- [ ] Create provider file: `src/providers/dreamstime-provider.js`
- [ ] Implement `constructor` (handle API key)
- [ ] Implement `fetchImageUrls`
    - [ ] **API Mode**:
        - [ ] Make API call (Search endpoint)
        - [ ] Parse response and map to `imageInfo`
    - [ ] **Scraping Fallback Mode**:
        - [ ] Navigate to search page
        - [ ] Identify CSS selectors for image items
        - [ ] Extract metadata
- [ ] Implement `getFullSizeImage`
    - [ ] **API Mode**:
        - [ ] Use preview URL from API response
    - [ ] **Scraping Fallback Mode**:
        - [ ] Navigate to detail page
        - [ ] Identify CSS selector for main preview image
        - [ ] Extract watermarked preview URL
- [ ] Update `config.json` and `config.json.example` (include `apiKey` field)
- [ ] Update `README.md`
- [ ] Test provider thoroughly (API mode and scraping fallback)

## Other Providers (from Section 4 of the plan)

### Providers with Public APIs (Strategy: API Preferred)

#### 7. Implement Provider: iStock (`istock`)
- [ ] Investigate API similarity to Getty Images (as it's a Getty Images property)
- [ ] Create provider file: `src/providers/istock-provider.js`
- [ ] Implement `constructor` (handle API key)
- [ ] Implement `fetchImageUrls` (API)
- [ ] Implement `getFullSizeImage` (API, if needed)
- [ ] Update `config.json` and `config.json.example`
- [ ] Update `README.md`
- [ ] Test provider thoroughly

#### 8. Implement Provider: 500px (`500px`)
- [ ] Create provider file: `src/providers/500px-provider.js`
- [ ] Implement `constructor` (handle API key)
- [ ] Implement `fetchImageUrls` (API)
- [ ] Implement `getFullSizeImage` (API, if needed)
- [ ] Update `config.json` and `config.json.example`
- [ ] Update `README.md`
- [ ] Test provider thoroughly

#### 9. Implement Provider: Stocksy (`stocksy`)
- [ ] Create provider file: `src/providers/stocksy-provider.js`
- [ ] Implement `constructor` (handle API key)
- [ ] Implement `fetchImageUrls` (API)
- [ ] Implement `getFullSizeImage` (API, if needed)
- [ ] Update `config.json` and `config.json.example`
- [ ] Update `README.md`
- [ ] Test provider thoroughly

#### 10. Implement Provider: Alamy (`alamy`)
- [ ] Create provider file: `src/providers/alamy-provider.js`
- [ ] Implement `constructor` (handle API key)
- [ ] Implement `fetchImageUrls` (API)
- [ ] Implement `getFullSizeImage` (API, if needed)
- [ ] Update `config.json` and `config.json.example`
- [ ] Update `README.md`
- [ ] Test provider thoroughly

#### 11. Implement Provider: Bigstock (`bigstock`)
- [ ] Investigate API similarity to Shutterstock (as it's a Shutterstock property)
- [ ] Create provider file: `src/providers/bigstock-provider.js`
- [ ] Implement `constructor` (handle API key)
- [ ] Implement `fetchImageUrls` (API)
- [ ] Implement `getFullSizeImage` (API, if needed)
- [ ] Update `config.json` and `config.json.example`
- [ ] Update `README.md`
- [ ] Test provider thoroughly

#### 12. Implement Provider: Pond5 (`pond5`)
- [ ] Create provider file: `src/providers/pond5-provider.js`
- [ ] Implement `constructor` (handle API key)
- [ ] Implement `fetchImageUrls` (API - check if photo-specific or general media API)
- [ ] Implement `getFullSizeImage` (API, if needed)
- [ ] Update `config.json` and `config.json.example`
- [ ] Update `README.md`
- [ ] Test provider thoroughly

#### 13. Implement Provider: Depositphotos (`depositphotos`)
- [ ] Create provider file: `src/providers/depositphotos-provider.js`
- [ ] Implement `constructor` (handle API key)
- [ ] Implement `fetchImageUrls` (API)
- [ ] Implement `getFullSizeImage` (API, if needed)
- [ ] Update `config.json` and `config.json.example`
- [ ] Update `README.md`
- [ ] Test provider thoroughly

#### 14. Implement Provider: Wikimedia Commons (`wikimedia`)
- [ ] Create provider file: `src/providers/wikimedia-provider.js`
- [ ] Implement `constructor` (MediaWiki API might not require a key for search)
- [ ] Implement `fetchImageUrls` (MediaWiki API)
- [ ] Implement `getFullSizeImage` (MediaWiki API, if needed)
- [ ] Update `config.json` and `config.json.example`
- [ ] Update `README.md`
- [ ] Test provider thoroughly

### Providers Without Public APIs (Strategy: Web Scraping)

#### 15. Implement Provider: Freeimages (`freeimages`)
- [ ] Create provider file: `src/providers/freeimages-provider.js`
- [ ] Implement `constructor`
- [ ] Implement `fetchImageUrls` (Web Scraping)
- [ ] Implement `getFullSizeImage` (Web Scraping)
- [ ] Update `config.json` and `config.json.example`
- [ ] Update `README.md`
- [ ] Test provider thoroughly

#### 16. Implement Provider: Little Visuals (`littlevisuals`)
- [ ] Investigate site status (archive, active scraping feasibility)
- [ ] If feasible:
    - [ ] Create provider file: `src/providers/littlevisuals-provider.js`
    - [ ] Implement `constructor`
    - [ ] Implement `fetchImageUrls` (Web Scraping)
    - [ ] Implement `getFullSizeImage` (Web Scraping)
    - [ ] Update `config.json` and `config.json.example`
    - [ ] Update `README.md`
    - [ ] Test provider thoroughly

#### 17. Implement Provider: New Old Stock (`newoldstock`)
- [ ] Create provider file: `src/providers/newoldstock-provider.js`
- [ ] Implement `constructor`
- [ ] Implement `fetchImageUrls` (Web Scraping - vintage photos)
- [ ] Implement `getFullSizeImage` (Web Scraping)
- [ ] Update `config.json` and `config.json.example`
- [ ] Update `README.md`
- [ ] Test provider thoroughly

#### 18. Implement Provider: Visual Hunt (`visualhunt`)
- [ ] Investigate if it's an aggregator; if so, direct integration of sources might be better.
- [ ] If direct implementation is chosen:
    - [ ] Create provider file: `src/providers/visualhunt-provider.js`
    - [ ] Implement `constructor`
    - [ ] Implement `fetchImageUrls` (Web Scraping)
    - [ ] Implement `getFullSizeImage` (Web Scraping)
    - [ ] Update `config.json` and `config.json.example`
    - [ ] Update `README.md`
    - [ ] Test provider thoroughly

#### 19. Implement Provider: ISO Republic (`isorepublic`)
- [ ] Create provider file: `src/providers/isorepublic-provider.js`
- [ ] Implement `constructor`
- [ ] Implement `fetchImageUrls` (Web Scraping)
- [ ] Implement `getFullSizeImage` (Web Scraping)
- [ ] Update `config.json` and `config.json.example`
- [ ] Update `README.md`
- [ ] Test provider thoroughly

#### 20. Implement Provider: Magdeleine (`magdeleine`)
- [ ] Create provider file: `src/providers/magdeleine-provider.js`
- [ ] Implement `constructor`
- [ ] Implement `fetchImageUrls` (Web Scraping - curated photos)
- [ ] Implement `getFullSizeImage` (Web Scraping)
- [ ] Update `config.json` and `config.json.example`
- [ ] Update `README.md`
- [ ] Test provider thoroughly

#### 21. Implement Provider: Startup Stock Photos (`startupstockphotos`)
- [ ] Create provider file: `src/providers/startupstockphotos-provider.js`
- [ ] Implement `constructor`
- [ ] Implement `fetchImageUrls` (Web Scraping)
- [ ] Implement `getFullSizeImage` (Web Scraping)
- [ ] Update `config.json` and `config.json.example`
- [ ] Update `README.md`
- [ ] Test provider thoroughly

#### 22. Implement Provider: PNGTree (`pngtree`)
- [ ] Investigate terms, download mechanisms, freemium model carefully.
- [ ] If feasible:
    - [ ] Create provider file: `src/providers/pngtree-provider.js`
    - [ ] Implement `constructor`
    - [ ] Implement `fetchImageUrls` (Web Scraping)
    - [ ] Implement `getFullSizeImage` (Web Scraping)
    - [ ] Update `config.json` and `config.json.example`
    - [ ] Update `README.md`
    - [ ] Test provider thoroughly
