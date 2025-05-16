# Image Crawler Implementation Plan

## 1. Project Overview
A Node.js application that collects images either from local drives or via Google Images search with configurable filters.

## 2. Core Features

### 2.1 Local Image Collector
- Recursive directory scanning
  - Windows: Drive selection interface
  - macOS: Default to user home directory
- File type filtering (jpg, png, gif, webp)
- File size filtering
- Image dimension validation
- Duplicate detection
- Progress reporting
- Duplicate checking

### 2.2 Web Image Collection
- Search term generation
- Smart result filtering
- Rate limiting
- Error handling for failed downloads

## 3. Technical Specifications

### 3.1 Platform Support
- **Operating Systems**: Windows 10/11, macOS 10.15+
- **Node.js**: v18.0.0 or higher
- **Package Manager**: npm or yarn

### 3.2 Dependencies
```json
{
  "dependencies": {
    "chalk": "^4.1.2",
    "commander": "^11.0.0",
    "cross-spawn": "^7.0.3",
    "fs-extra": "^11.1.1",
    "puppeteer": "^21.0.0",
    "sharp": "^0.32.0",
    "progress": "^2.0.3",
    "inquirer": "^9.2.0",
    "windows-drive-letters": "^1.0.3"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "eslint": "^8.0.0",
    "@types/node": "^18.0.0"
  },
  "optionalDependencies": {
    "windows-drive-letters": "^1.0.3"
  }
}
```

## 4. Project Structure

```
image-crawler/
├── src/
│   ├── index.js              # CLI entry point
│   ├── modes/
│   │   ├── local-crawler.js  # Local file system crawler
│   │   └── web-crawler.js    # Web image downloader
│   ├── utils/
│   │   ├── platform.js       # OS-specific utilities
│   │   ├── paths.js          # Cross-platform path handling
│   │   ├── config.js         # Configuration management
│   │   ├── logger.js         # Logging utilities
│   │   └── validators.js     # Input validation
│   └── types/               # Type definitions
├── tests/
│   ├── unit/
│   └── integration/
├── .gitignore
├── .eslintrc
├── package.json
└── README.md
```

## 5. Implementation Phases

### Phase 1: Core Infrastructure (2 days)
- [ ] Project setup and configuration
- [ ] Cross-platform utilities
- [ ] Logging system
- [ ] Configuration management

### Phase 2: Local Crawler (2 days)
- [ ] Platform detection
- [ ] Windows: Drive detection and selection
  - [ ] List available drives
  - [ ] Interactive drive selection
  - [ ] Cache selected drives
- [ ] Directory traversal
- [ ] File filtering
- [ ] Image processing
- [ ] Progress reporting

### Phase 3: Web Crawler (3 days)
- [ ] Google Images search
- [ ] Result parsing
- [ ] Download manager
- [ ] Rate limiting

### Phase 4: CLI & Integration (2 days)
- [ ] Command interface
- [ ] Error handling
- [ ] User feedback
- [ ] Testing

### Phase 5: Testing & Polish (2 days)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Documentation
- [ ] Performance optimization

## 6. Cross-Platform Considerations

### 6.1 Path Handling
- Use `path.join()` for all path operations
- Handle drive letters (Windows) vs. mount points (macOS)
- Normalize path separators
- Windows-specific drive selection UI when running on Windows
  - Detect available drives using `wmic` command on Windows
  - Present interactive list of available drives
  - Allow multi-drive selection for scanning
  - Cache drive selection in config for subsequent runs

### 6.2 File System
- Use `fs-extra` for atomic operations
- Handle permission differences
- Case sensitivity awareness

### 6.3 Browser Automation
- Platform-specific browser paths
- Headless mode configuration
- GPU acceleration settings

## 7. Configuration Options

```javascript
{
  "maxDownloads": 100,
  "minWidth": 800,
  "minHeight": 600,
  "minFileSize": "100KB",
  "outputDir": "~/image-crawler/downloads",
  "fileTypes": ["jpg", "jpeg", "png", "gif", "webp"],
  "platformSpecific": {
    "windows": {
      "selectedDrives": ["C:\\"],
      "scanNetworkDrives": false
    },
    "darwin": {
      "defaultScanPath": "/Users/username/Pictures"
    }
  },
  "searchEngines": {
    "google": {
      "enabled": true,
      "maxResults": 100,
      "safeSearch": true
    }
  }
}
```

## 8. CLI Commands

```bash
# Local mode (Windows - with drive selection)
node src/index.js local --drives C D E --output ./downloads

# Local mode (macOS/Linux)
node src/index.js local --source ~/Pictures --output ./downloads --min-width 800 --min-height 600

# Interactive drive selection (Windows only)
node src/index.js local --select-drives

# Web mode
node src/index.js web --query "nature landscape" --max-downloads 50 --min-size 1MB

# Interactive mode
npm run dev
```

## 9. Testing Strategy

### 9.1 Unit Tests
- Path utilities
- File operations
- Validation logic

### 9.2 Integration Tests
- Full crawl operations
- Web downloads
- Configuration loading

### 9.3 Manual Testing
- Windows 10/11
- macOS
- Different permission levels

## 10. Error Handling
- Network failures
- File system errors
- Permission issues
- Invalid inputs
- Rate limiting

## 11. Performance Considerations
- Batch processing
- Memory management
- Parallel downloads
- Caching

## 12. Documentation
- README with usage examples
- Configuration reference
- Troubleshooting guide
- API documentation

## 13. Future Enhancements
- Support for more image sources
- Advanced filtering options
- GUI interface
- Scheduled crawling
- Duplicate image detection

## 14. Risks & Mitigation
- **Risk**: Google blocking requests
  - **Mitigation**: Implement rate limiting and user-agent rotation
- **Risk**: File system permission issues
  - **Mitigation**: Graceful error handling and clear error messages
- **Risk**: Large memory usage
  - **Mitigation**: Stream processing and batch operations

## 15. Success Metrics
- Successful downloads
- Error rates
- Performance benchmarks
- User feedback
- GUI interface
- Docker support

## 6. Usage Examples

### Local Mode
```bash
node src/index.js local --source ~/Pictures --output ./images --min-width 800 --min-height 600 --min-size 100
```

### Web Mode
```bash
node src/index.js web --query "nature landscape" --output ./downloads --max-downloads 50 --min-width 1920 --min-height 1080
```

## 7. Development Workflow
1. Initialize project and install dependencies
2. Implement core functionality
3. Add configuration options
4. Implement error handling
5. Add logging and progress reporting
6. Write tests
7. Document usage
8. Package for distribution

## 8. Testing Strategy
- Unit tests for utility functions
- Integration tests for core features
- End-to-end tests for CLI
- Performance testing for large directories
- Error case testing

## 9. Deployment
- Package as npm package
- Create installable binary
- Add to system PATH
- Add auto-update functionality
