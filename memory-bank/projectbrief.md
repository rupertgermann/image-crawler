# Project Brief - Image Crawler

## Project Overview

Image Crawler is a cross-platform Node.js application that provides a unified interface for collecting images from both local directories and web sources. The project was developed entirely by AI using advanced coding models and the Windsurf AI engineering platform.

## Core Requirements

### Primary Goals
1. **Local Image Collection**: Scan local directories for images with advanced filtering capabilities
2. **Web Image Crawling**: Download images from multiple web providers using search queries
3. **Cross-Platform Compatibility**: Support Windows, macOS, and Linux environments
4. **User-Friendly Interface**: Provide both CLI and interactive modes for different user preferences

### Key Features
- **Dual Mode Operation**: Local scanning and web crawling in a single tool
- **Multiple Provider Support**: Google Images, Pixabay, Unsplash, Pexels, Bing, Flickr, DuckDuckGo, FreeImages, Wikimedia
- **Advanced Filtering**: Size, dimensions, file type, and content-based filtering
- **Deduplication**: Hash-based duplicate detection to avoid redundant downloads
- **Interactive UI**: Native folder dialogs with CLI fallbacks
- **Configuration Management**: Flexible JSON-based configuration with environment variable support

### Technical Requirements
- **Node.js 18+**: ES Modules support required
- **Modern JavaScript**: ES2022+ features throughout codebase
- **Cross-Platform Paths**: Proper handling of Windows, macOS, and Linux file systems
- **Browser Automation**: Playwright for reliable web crawling
- **Testing Coverage**: Comprehensive unit and integration tests with 70% minimum coverage

### User Experience Goals
- **Zero Configuration**: Works out-of-the-box with sensible defaults
- **Progressive Enhancement**: CLI for power users, interactive mode for beginners
- **Robust Error Handling**: Graceful fallbacks and clear error messages
- **Performance**: Efficient crawling with configurable limits and timeouts

## Success Criteria
1. Successfully crawl both local directories and web sources
2. Handle edge cases gracefully (permissions, network issues, invalid paths)
3. Maintain consistent behavior across all supported platforms
4. Provide clear feedback and progress indication to users
5. Support both automated scripting and interactive usage patterns

## Constraints
- Must use ES Modules (no CommonJS)
- No external API keys required for basic functionality
- Minimal dependencies for core functionality
- Respect rate limits and terms of service for web providers
