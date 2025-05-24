# Technical Context - Image Crawler

## Technology Stack

### Core Runtime
- **Node.js 18+**: ES Modules support, modern JavaScript features
- **ES2022+ JavaScript**: Modern syntax, async/await, optional chaining
- **ES Modules**: `import`/`export` throughout, no CommonJS

### Key Dependencies

#### CLI & User Interface
- **Commander.js 11.1.0**: Command-line argument parsing and subcommands
- **Inquirer.js 9.2.10**: Interactive prompts and user input
- **@inquirer/prompts 3.0.0**: Modern prompt components
- **Chalk 5.3.0**: Terminal text styling and colors

#### Web Crawling & Automation
- **Playwright 1.52.0**: Primary browser automation (replaced Puppeteer)
- **Puppeteer 21.7.0**: Legacy dependency, being phased out
- **Cross-spawn 7.0.3**: Cross-platform process spawning

#### File System & Image Processing
- **fs-extra 11.2.0**: Enhanced file system operations
- **Sharp 0.33.0**: High-performance image processing and metadata
- **Progress 2.0.3**: Progress bar display for long operations

#### Development & Testing
- **Jest 29.7.0**: Testing framework with ES modules support
- **ESLint 8.54.0**: Code linting with modern JavaScript rules
- **Prettier 3.1.0**: Code formatting
- **Husky 8.0.3**: Git hooks for pre-commit validation
- **Babel**: ES modules transpilation for Jest compatibility

#### Optional Platform Dependencies
- **windows-drive-letters 1.0.3**: Windows drive enumeration (optional)
- **Electron 28.0.0**: Desktop application wrapper (development)

## Development Setup

### Environment Requirements
```bash
Node.js: >=18.0.0 (ES modules support)
npm: >=9.0.0
Operating System: Windows 10+, macOS 10.15+, Linux (Ubuntu 20.04+)
```

### Installation Process
```bash
# Clone and install
git clone <repository>
cd image-crawler
npm install

# Install Playwright browsers
npx playwright install --with-deps

# Verify setup
npm test
npm run lint
```

### Development Scripts
```bash
npm start          # Run CLI application
npm run dev        # Run in interactive mode
npm test           # Run all tests
npm run test:watch # Watch mode testing
npm run test:coverage # Coverage report
npm run lint       # ESLint checking
npm run lint:fix   # Auto-fix linting issues
npm run format     # Prettier formatting
```

## Technical Constraints

### ES Modules Requirements
- **No CommonJS**: All code uses `import`/`export`
- **Dynamic Imports**: Conditional module loading via `await import()`
- **File Extensions**: Explicit `.js` extensions in imports
- **URL Resolution**: `import.meta.url` for file path resolution

### Cross-Platform Considerations
- **Path Handling**: Always use `path.join()` and `path.resolve()`
- **Environment Variables**: Platform-specific defaults via `process.env`
- **File Permissions**: Graceful handling of permission errors
- **Native Dialogs**: Platform-specific implementations with CLI fallbacks

### Browser Automation Constraints
- **Playwright Focus**: Primary automation engine
- **Headless Default**: GUI mode only for debugging
- **Rate Limiting**: Respectful crawling with delays
- **Error Recovery**: Robust handling of network and page errors

### Performance Constraints
- **Memory Management**: Efficient handling of large image collections
- **Concurrent Operations**: Controlled parallelism to avoid overwhelming systems
- **Progress Feedback**: User feedback for long-running operations
- **Resource Cleanup**: Proper cleanup of browser instances and file handles

## Configuration Architecture

### Configuration Hierarchy
```javascript
// 1. Default configuration (hardcoded)
const DEFAULT_CONFIG = {
  logLevel: 'info',
  maxDownloads: 50,
  minWidth: 640,
  minHeight: 480,
  // ...
};

// 2. File-based configuration (config.json)
// 3. Environment variables
// 4. CLI arguments (highest priority)
```

### Configuration Files
- **config.json**: User-editable configuration in working directory
- **package.json**: Project metadata and dependencies
- **jest.config.cjs**: Testing configuration (CommonJS for Jest compatibility)
- **.eslintrc.js**: Linting rules and ES modules configuration
- **.prettierrc**: Code formatting rules

## Testing Strategy

### Test Structure
```
tests/
├── unit/           # Unit tests for utilities and components
├── integration/    # Integration tests for crawlers
├── utils/          # Test utilities and helpers
├── __mocks__/      # Mock implementations
└── setup.js        # Global test setup
```

### Testing Patterns
- **Mocking**: File system, network, and browser operations
- **Test Data**: Generated test images and directory structures
- **Coverage**: Minimum 70% threshold for all metrics
- **Isolation**: Each test runs in isolated environment

### Mock Strategy
```javascript
// File system mocking
jest.mock('fs-extra');

// Browser automation mocking
jest.mock('playwright');

// Console output capture
const consoleMock = require('./utils/console-mock');
```

## Deployment Considerations

### Distribution Methods
1. **npm Package**: Global installation via `npm install -g`
2. **npx Usage**: Direct execution without installation
3. **Electron App**: Desktop application wrapper (future)

### Environment Variables
```bash
DEBUG=image-crawler:*     # Enable debug logging
NODE_ENV=development      # Development mode
```

### Platform-Specific Setup
- **Windows**: Visual C++ Redistributable for Playwright
- **macOS**: Xcode Command Line Tools
- **Linux**: System dependencies for browser automation

## Integration Points

### External APIs
- **Image Providers**: Various APIs with different authentication requirements
- **File System**: Native OS file operations
- **Browser Engines**: Chromium, Firefox, WebKit via Playwright

### System Integration
- **Native Dialogs**: OS-specific folder selection
- **Process Management**: Child process spawning for external tools
- **Environment Detection**: Platform and capability detection

## Future Technical Considerations

### Potential Migrations
- **TypeScript**: Type safety and better IDE support
- **Modern Testing**: Vitest or other ES-native test runners
- **Module Bundling**: ESBuild or Rollup for distribution
- **Container Support**: Docker images for consistent environments

### Scalability Considerations
- **Worker Threads**: Parallel image processing
- **Streaming**: Large file handling without memory issues
- **Caching**: Intelligent caching of provider results
- **Database**: Persistent storage for large collections
