# Product Context - Image Crawler

## Why This Project Exists

Image Crawler addresses the common need for efficiently collecting and organizing images from multiple sources. Whether you're a designer building a mood board, a developer creating a dataset, or someone organizing their photo collection, the tool provides a unified solution for image acquisition and management.

## Problems It Solves

### 1. Fragmented Image Collection Workflow
**Problem**: Users typically need different tools for different image sources - one for local organization, another for web downloads, separate tools for different providers.
**Solution**: Single tool that handles both local scanning and web crawling with consistent interface and options.

### 2. Manual Image Organization
**Problem**: Manually sorting through thousands of images, checking for duplicates, and applying filters is time-consuming and error-prone.
**Solution**: Automated filtering by size, dimensions, file type, and hash-based deduplication.

### 3. Cross-Platform Inconsistencies
**Problem**: Tools that work on one operating system often fail or behave differently on others, especially with path handling.
**Solution**: Native cross-platform support with proper path handling and platform-specific optimizations.

### 4. Complex Setup Requirements
**Problem**: Many image tools require API keys, complex configuration, or technical knowledge to get started.
**Solution**: Zero-configuration startup with sensible defaults, optional advanced configuration for power users.

## How It Should Work

### User Journey - Local Mode
1. **Discovery**: User runs `image-crawler local` or starts interactive mode
2. **Source Selection**: Choose source directory via native dialog or CLI input
3. **Filter Configuration**: Set size, dimension, and file type filters (optional)
4. **Processing**: Tool scans directory, applies filters, checks for duplicates
5. **Output**: Images copied to output directory with progress feedback
6. **Completion**: Summary report showing processed vs. copied files

### User Journey - Web Mode
1. **Query Input**: User provides search query via CLI argument or interactive prompt
2. **Provider Selection**: Choose specific providers or use all available
3. **Filter Configuration**: Set download limits, size requirements, safe search
4. **Crawling**: Tool searches providers, extracts image URLs, applies filters
5. **Download**: Images downloaded with progress indication and error handling
6. **Completion**: Summary report showing downloads per provider and overall status

### User Journey - Interactive Mode
1. **Mode Selection**: Choose between local, web, or exit
2. **Guided Configuration**: Step-by-step prompts for all options
3. **Folder Selection**: Native dialogs for source/output directories
4. **Execution**: Same processing as CLI modes but with guided setup
5. **Results**: Clear feedback and next steps

## User Experience Goals

### Simplicity First
- Works immediately without configuration
- Sensible defaults for all options
- Clear, non-technical error messages
- Progressive disclosure of advanced features

### Flexibility for Power Users
- Comprehensive CLI options
- JSON configuration files
- Environment variable overrides
- Scriptable for automation

### Reliability Across Platforms
- Consistent behavior on Windows, macOS, Linux
- Graceful handling of platform-specific features
- Robust error recovery and fallbacks
- Proper handling of file permissions and paths

### Performance and Efficiency
- Configurable limits to prevent runaway operations
- Progress indication for long-running tasks
- Efficient duplicate detection
- Respectful rate limiting for web providers

## Success Metrics

### Functional Success
- Successfully processes images from all supported sources
- Handles edge cases without crashing
- Maintains data integrity (no corrupted downloads)
- Respects user-specified limits and filters

### User Experience Success
- New users can complete basic tasks without documentation
- Power users can automate complex workflows
- Clear feedback during all operations
- Minimal support requests for basic usage

### Technical Success
- Consistent behavior across all supported platforms
- Efficient resource usage (memory, network, disk)
- Proper error handling and recovery
- Maintainable and extensible codebase
