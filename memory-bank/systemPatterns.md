# System Patterns - Image Crawler

## Architecture Overview

The Image Crawler follows a modular, provider-based architecture with clear separation of concerns between CLI interface, crawling modes, and image providers.

```
┌─────────────────┐
│   CLI Interface │ (src/index.js)
│   (Commander.js) │
└─────────┬───────┘
          │
    ┌─────▼─────┐
    │   Modes   │
    │           │
    ├───────────┤
    │ Local     │ (src/modes/local-crawler.js)
    │ Crawler   │
    ├───────────┤
    │ Web       │ (src/modes/playwright-crawler.js)
    │ Crawler   │
    └─────┬─────┘
          │
    ┌─────▼─────┐
    │ Provider  │ (src/providers/)
    │ Registry  │
    └─────┬─────┘
          │
    ┌─────▼─────┐
    │ Image     │ (Google, Pixabay, Unsplash, etc.)
    │ Providers │
    └───────────┘
```

## Key Technical Decisions

### 1. ES Modules Throughout
**Decision**: Use ES modules (`import`/`export`) instead of CommonJS (`require`/`module.exports`)
**Rationale**: 
- Modern JavaScript standard
- Better static analysis and tree shaking
- Future-proof for Node.js evolution
- Improved IDE support and tooling

**Implementation**:
- `"type": "module"` in package.json
- Dynamic imports for conditional loading
- `import.meta.url` for file path resolution
- Async module loading in provider registry

### 2. Provider-Based Architecture
**Decision**: Pluggable provider system with unified interface
**Rationale**:
- Easy to add new image sources
- Consistent behavior across providers
- Isolated provider-specific logic
- Testable components

**Implementation**:
```javascript
// Base provider interface
class BaseProvider {
  async initialize() { /* Setup */ }
  async fetchImageUrls(query, options) { /* Get URLs */ }
  async getFullSizeImage(url) { /* Get full image */ }
}
```

### 3. Configuration Hierarchy
**Decision**: Layered configuration with CLI overrides
**Rationale**:
- Sensible defaults for zero-config usage
- File-based config for persistent settings
- CLI overrides for one-off changes
- Environment variables for deployment

**Implementation**:
```
Default Config → File Config → CLI Options → Final Config
```

### 4. Cross-Platform Path Handling
**Decision**: Use Node.js path utilities consistently
**Rationale**:
- Avoid hardcoded path separators
- Handle Windows drive letters properly
- Support UNC paths and long paths
- Consistent behavior across platforms

**Implementation**:
- `path.join()` and `path.resolve()` everywhere
- Platform detection via `os.platform()`
- Dynamic default paths using environment variables
- Proper handling of `import.meta.url`

## Design Patterns

### 1. Command Pattern (CLI Interface)
```javascript
// Each command encapsulates its execution logic
program
  .command('local')
  .action(async (options) => {
    // Command-specific logic
  });
```

### 2. Registry Pattern (Provider Management)
```javascript
class ProviderRegistry {
  async initialize() {
    // Load providers based on configuration
    for (const providerName of order) {
      const ProviderClass = await this.loadProviderClass(providerName);
      this.providers[providerName] = new ProviderClass(config);
    }
  }
}
```

### 3. Strategy Pattern (Crawling Modes)
```javascript
// Different crawling strategies for different sources
class LocalCrawler { /* File system strategy */ }
class PlaywrightCrawler { /* Web crawling strategy */ }
```

### 4. Factory Pattern (Dynamic Provider Loading)
```javascript
async loadProviderClass(name) {
  switch (name) {
    case 'google': return (await import('./google-provider.js')).default;
    case 'pixabay': return (await import('./pixabay-provider.js')).default;
    // ...
  }
}
```

## Component Relationships

### Core Components
1. **CLI Interface** (`src/index.js`)
   - Entry point and command parsing
   - Interactive mode orchestration
   - Error handling and user feedback

2. **Configuration Manager** (`src/utils/config.js`)
   - Config file loading and merging
   - Default value management
   - CLI option integration

3. **Crawling Modes**
   - **LocalCrawler**: File system scanning and filtering
   - **PlaywrightCrawler**: Web crawling coordination

4. **Provider System**
   - **ProviderRegistry**: Dynamic provider loading
   - **BaseProvider**: Common interface and utilities
   - **Specific Providers**: Source-specific implementations

### Utility Components
1. **Path Utilities** (`src/utils/paths.js`)
   - Cross-platform path handling
   - Default directory resolution
   - Size parsing (human-readable formats)

2. **Platform Detection** (`src/utils/platform.js`)
   - OS-specific behavior
   - Windows drive enumeration
   - Environment detection

3. **File Dialog** (`src/utils/file-dialog.js`)
   - Native folder selection
   - CLI fallbacks
   - Cross-platform dialog handling

4. **Image Utilities** (`src/utils/image-utils.js`)
   - Image validation and metadata
   - Hash-based deduplication
   - Format detection

## Critical Implementation Paths

### 1. Local Crawling Flow
```
CLI Input → Config Loading → Source Selection → 
Directory Scanning → Image Filtering → Hash Checking → 
File Copying → Progress Reporting → Summary
```

### 2. Web Crawling Flow
```
CLI Input → Config Loading → Provider Loading → 
Query Processing → URL Extraction → Image Filtering → 
Download Processing → Deduplication → Summary
```

### 3. Interactive Mode Flow
```
Mode Selection → Parameter Gathering → 
Folder Selection → Configuration Building → 
Crawler Execution → Result Display
```

### 4. Provider Integration Flow
```
Registry Initialization → Dynamic Import → 
Provider Construction → Interface Validation → 
Query Execution → Result Processing
```

## Error Handling Patterns

### 1. Graceful Degradation
- Native dialogs fall back to CLI input
- Provider failures don't stop other providers
- Network errors retry with backoff

### 2. Validation Layers
- CLI argument validation
- Configuration validation
- Runtime parameter checking
- File system permission checks

### 3. User-Friendly Messages
- Technical errors translated to user language
- Actionable error messages with suggestions
- Progress indication during long operations
- Clear success/failure reporting
