# Image Crawler Implementation Plan

## 1. Project Overview
A Node.js application that collects images either from local drives or via Google Images search with configurable filters.

## 2. Core Features

### 2.1 Local Image Collection
- Recursive directory scanning
- File type filtering (jpg, png, gif, webp, bmp)
- File size filtering
- Image dimension validation
- Progress reporting
- Duplicate checking

### 2.2 Web Image Collection
- Google Images search integration
- Search term generation
- Image result parsing
- Parallel download with rate limiting
- Error handling for failed downloads

### 2.3 Configuration Options
- Mode selection (local/web)
- Max downloads limit
- Minimum dimensions (with presets)
  - Small: 640x480
  - Medium: 1280x720
  - Large: 1920x1080
  - 4K: 3840x2160
- Minimum file size (in KB)
- Source directories (for local mode)
- Search terms (for web mode)
- Output directory
- File naming convention

## 3. Technical Implementation

### 3.1 Dependencies
- `commander`: CLI interface
- `fs-extra`: Enhanced file system operations
- `sharp`: Image processing and validation
- `puppeteer`: Web scraping
- `chalk`: Colored console output
- `progress`: Download progress bars
- `yargs`: Command line argument parsing
- `config`: Configuration management
- `p-limit`: Concurrency control

### 3.2 Project Structure
```
image-crawler/
├── src/
│   ├── index.js          # Main entry point
│   ├── local-crawler.js  # Local filesystem crawler
│   ├── web-crawler.js    # Google Images downloader
│   └── utils/
│       ├── config.js     # Configuration management
│       ├── logger.js     # Logging utilities
│       ├── validators.js # Input validation
│       └── helpers.js    # Helper functions
├── config/               # Configuration files
│   └── default.json
├── .gitignore
├── package.json
└── README.md
```

### 3.3 Implementation Phases

#### Phase 1: Setup & Configuration
- Initialize Node.js project
- Set up project structure
- Configure ESLint and Prettier
- Create basic configuration system

#### Phase 2: Local Crawler
- Implement recursive directory scanning
- Add file filtering by type and size
- Add image dimension validation
- Implement file copying with progress

#### Phase 3: Web Crawler
- Set up Puppeteer for web scraping
- Implement Google Images search
- Add result parsing and filtering
- Implement parallel downloads with rate limiting

#### Phase 4: CLI & Integration
- Create command-line interface
- Add command-line arguments
- Implement help and usage information
- Add error handling and user feedback

#### Phase 5: Testing & Optimization
- Write unit tests
- Test with various inputs
- Optimize performance
- Add error recovery

## 4. Error Handling
- File system errors
- Network errors
- Invalid user input
- Rate limiting
- Memory management

## 5. Future Enhancements
- Support for more image sources
- Advanced filtering options
- Batch processing
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
