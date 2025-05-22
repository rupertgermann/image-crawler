# Image Crawler
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![GitHub](https://img.shields.io/badge/GitHub-rupertgermann/image--crawler-blue)](https://github.com/rupertgermann/image-crawler)
[![npm version](https://badge.fury.io/js/image-crawler.svg)](https://badge.fury.io/js/image-crawler) [![npm downloads](https://img.shields.io/npm/dm/image-crawler.svg)](https://www.npmjs.com/package/image-crawler) [![Build Status](https://travis-ci.org/rupertgermann/image-crawler.svg?branch=master)](https://travis-ci.org/rupertgermann/image-crawler)

A cross-platform tool for collecting images from local drives or the web.

## A Note on Authorship

This application was proudly developed 100% by AI, leveraging the capabilities of advanced coding models and the Windsurf AI engineering platform. This project showcases the power of AI in modern software development.

## Why Image Crawler?

Image Crawler was created to provide a simple, yet powerful and unified interface for downloading high-quality images from various sources or organizing local image collections efficiently.

## Showcase / Demo

(A visual demonstration GIF showcasing the crawler in action is planned for a future update!)

## Features

- **Local Mode**: Scan local directories for images
  - Filter by file type, size, and dimensions
  - Preserve directory structure
  - Interactive folder selection
  - Deduplicate images by content hash (skips existing files)
  - Windows drive selection support

- **Web Mode**: Download images from multiple sources
  - Supports a wide range of providers: Google Images, Pixabay, Unsplash, Pexels, Bing, Flickr, DuckDuckGo, FreeImages, and Wikimedia.
  - Search by keyword with advanced filters
  - Safe search (enabled by default)
  - Headless browser mode

## Installation

### Prerequisites

1. **Windows 10 or later** - The application is tested on Windows 10 and above
2. **Node.js 18+** (v18.17.0 or later recommended for full ES modules support)

### Automatic Installation (Recommended)

Run the following command to install the application and all required dependencies, including Playwright browsers:

```bash
# Install globally
npm install -g image-crawler

# Install Playwright browsers (this may take a few minutes)
npx playwright install --with-deps

# Verify installation
npx playwright test --browser=chromium
```

Or use with npx without global installation:

```bash
npx image-crawler
# The first run will prompt to install Playwright browsers if needed
```

### Manual Installation (if automatic fails)

If you encounter issues with the automatic installation, follow these steps:

1. Install Visual C++ Redistributable (required for Playwright):
   - Download from: https://aka.ms/vs/17/release/vc_redist.x64.exe
   - Run the installer and follow the prompts

2. Install Windows 10+ SDK (required for WebKit):
   - Download from: https://go.microsoft.com/fwlink/?linkid=2196241
   - Run the installer and select "Windows 10 SDK"

3. Install the application:
   ```bash
   # Install globally
   npm install -g image-crawler
   
   # Install Playwright without browsers
   npx playwright install-deps
   
   # Install browsers one by one (if needed)
   npx playwright install chromium
   npx playwright install firefox
   npx playwright install webkit
   ```

### Troubleshooting

If you encounter issues during installation:

1. **Proxy Issues**: If behind a corporate proxy, set the proxy environment variables:
   ```cmd
   set HTTP_PROXY=http://your-proxy:port
   set HTTPS_PROXY=http://your-proxy:port
   ```

2. **Permission Issues**: Run the command prompt as Administrator

3. **Long Paths**: If you see path length errors, enable long paths in Windows:
   - Open Group Policy Editor (gpedit.msc)
   - Navigate to: Computer Configuration > Administrative Templates > System > Filesystem
   - Enable "Enable Win32 long paths"

## Usage

Run without any commands to start in interactive mode:

```bash
image-crawler
```

### Local Mode

Scan a local directory for images. If no source is provided, you'll be prompted to select a folder. By default, Local Mode skips files already present in the output directory by comparing their content hashes.

#### Basic Examples:

```bash
# Scan your Pictures folder and save to ./downloads
npx image-crawler local --source ~/Pictures --output ./downloads

# Find only high-resolution images (min 1920x1080)
npx image-crawler local --min-width 1920 --min-height 1080 --output ./wallpapers

# Find and organize by file type
npx image-crawler local --source ~/Downloads --file-types jpg,png --output ./organized

# Find large image files (minimum 1MB)
npx image-crawler local --min-size 1MB --output ./large-images
```

#### Advanced Examples:

```bash
# Preserve the original directory structure
npx image-crawler local --source ~/Projects --output ./backup --preserve-structure

# Find images modified in the last 7 days (macOS/Linux)
find ~/Pictures -type f -mtime -7 -name "*.jpg" -o -name "*.png" | xargs -I {} npx image-crawler local --source "{}" --output ./recent

# Windows: Find and process images on multiple drives
npx image-crawler local --select-drives --output ./all-drives-backup
```

```bash

npx image-crawler web "hamster" --provider all

# Basic usage with interactive folder selection
npx image-crawler local --output ./downloads

# Specify source directory
npx image-crawler local --source ~/Pictures --output ./downloads

# With filters and max files
npx image-crawler local --min-width 800 --min-height 600 --max-files 100
```

#### Options:
- `-s, --source <path>`: Source directory to scan (optional, will prompt if not provided)
- `-o, --output <path>`: Output directory for images (default: `./downloads`)
- `--min-width <pixels>`: Minimum image width in pixels (default: `640`)
- `--min-height <pixels>`: Minimum image height in pixels (default: `480`)
- `--min-size <size>`: Minimum file size (supports human-readable formats like `100KB`, `1.5MB`)
- `--max-files <count>`: Maximum number of files to process (default: `100`)
- `--max-downloads <count>`: Alias for `--max-files`
- `--preserve-structure`: Preserve directory structure in output (default: `false`)
- `--select-drives`: Interactively select drives (Windows only)
- `--file-types <types>`: Comma-separated list of file extensions (default: `jpg,jpeg,png,gif,webp`)

### Web Mode

Download images from the web. A search query is required. The tool will automatically handle pagination and scroll through search results to find the best matches.

#### Basic Search Examples:

```bash
# Simple search across all providers
npx image-crawler web "mountain sunset" --max-downloads 20

# Search specific providers
npx image-crawler web "abstract art" --provider unsplash,pexels --max-downloads 30

# High-resolution wallpapers
npx image-crawler web "4k nature" --min-width 3840 --min-height 2160 --output ./wallpapers
```

#### Advanced Usage Examples:

```bash
# Download images for machine learning dataset
npx image-crawler web "cat" --provider flickr,bing --max-downloads 500 --output ./dataset/cats

# Create a mood board (mix of different styles)
npx image-crawler web "minimalist interior design" --provider unsplash,pexels --max-downloads 50 --output ./mood-board

# Download public domain images for a project
npx image-crawler web "vintage patterns" --provider wikimedia --output ./public-domain
```

#### Provider-Specific Examples:

```bash
# Get trending photos from Unsplash
npx image-crawler web "" --provider unsplash --output ./unsplash-trending

# Search for Creative Commons images on Flickr
npx image-crawler web "street photography" --provider flickr --output ./flickr-cc

# Get high-quality nature wallpapers from Pexels
npx image-crawler web "nature" --provider pexels --min-width 1920 --min-height 1080
```

```bash
# Basic usage (tries all enabled sources by default)
npx image-crawler web "nature landscape" --max-downloads 50

# Specify a single provider
npx image-crawler web "mountain lake" --provider unsplash

# Specify multiple providers (comma-separated)
npx image-crawler web "city lights" --provider bing,pexels --max-downloads 20

### Windows-Specific Examples

```cmd
:: Basic usage with Windows path
npx image-crawler local --source "C:\Users\Public\Pictures" --output "D:\Downloads\Images"

:: Using environment variables for paths
set SOURCE_DIR=%USERPROFILE%\Pictures\Screenshots
set OUTPUT_DIR=%USERPROFILE%\Downloads\Processed
npx image-crawler local --source "%SOURCE_DIR%" --output "%OUTPUT_DIR%"

:: Using Windows network paths (UNC paths)
npx image-crawler local --source "\\server\shared\photos" --output "D:\Backup\Photos"

:: Using Windows drive letters with specific file types
npx image-crawler local --source "D:" --file-types "jpg,png" --min-size 1MB

:: Running as a scheduled task (save as .bat file)
@echo off
setlocal
cd /d "%~dp0"
npx image-crawler web "windows 11 wallpaper" --output "%USERPROFILE%\Pictures\Wallpapers" --max-downloads 10
endlocal

:: Using PowerShell variables
$query = "4k wallpaper"
$output = "$env:USERPROFILE\Pictures\Wallpapers\$(Get-Date -Format 'yyyy-MM')"
npx image-crawler web $query --output $output --max-downloads 20
```

### Windows Troubleshooting Commands

```cmd
:: Check if Playwright browsers are installed correctly
npx playwright install --dry-run

:: Clear Playwright cache if you encounter issues
npx playwright install --force

:: Run with debug logging (PowerShell)
$env:DEBUG="image-crawler:*"
npx image-crawler web "test" --output "$env:TEMP\test-download"

:: Check system requirements
npx playwright check

:: Install missing Windows dependencies (run as Administrator)
npx playwright install-deps
```

# With size and type filters
npx image-crawler web "sunset" --min-width 1920 --min-height 1080 --file-types jpg,png
```

#### Options:
- `-o, --output <path>`: Output directory for images (default: `./downloads`)
- `--max-downloads <count>`: Maximum number of images to download (default: `100`)
- `--min-width <pixels>`: Minimum image width in pixels (default: `640`)
- `--min-height <pixels>`: Minimum image height in pixels (default: `480`)
- `--min-size <size>`: Minimum file size (supports human-readable formats like `100KB`, `1.5MB`)
- `--no-safe-search`: Disable safe search (default: `true`)
- `--file-types <types>`: Comma-separated list of file extensions (default: `jpg,jpeg,png,gif,webp`)
- `--headless`: Run browser in headless mode (default: `true`)
- `--timeout <ms>`: Browser operation timeout in milliseconds (default: `30000`)
- `--provider <name>`: Comma-separated list of image providers to use (e.g., `google`, `unsplash`, `bing,pexels`). Supported: `google`, `pixabay`, `unsplash`, `pexels`, `bing`, `flickr`, `duckduckgo`, `freeimages`, `wikimedia`. Default is 'all' configured providers.

### Interactive Mode

Start in interactive mode for a guided experience. This is perfect for new users or when you want to explore available options:

```bash
# Start the interactive mode
npx image-crawler interactive

# Example interactive session flow:
# 1. Choose between Local or Web mode
# 2. For Local: Select source folder, output location, and filters
# 3. For Web: Enter search query, select providers, and set filters
# 4. Review settings and confirm to start

# You can also pre-select the mode:
npx image-crawler interactive --mode web
npx image-crawler interactive --mode local
```

```bash
npx image-crawler interactive
```

## Configuration

Configuration is stored in `config.json` in the current working directory. The file is automatically created on first run with default values. You can also create a custom config file and specify it with the `--config` option.

### Example Configurations

#### Basic Configuration
```json
{
  "logLevel": "info",
  "providers": {
    "order": ["google", "unsplash", "pixabay"],
    "google": {
      "enabled": true,
      "safeSearch": true
    },
    "unsplash": {
      "enabled": true,
      "apiKey": "your_unsplash_api_key_here"
    }
  },
  "defaults": {
    "outputDir": "./downloads",
    "maxDownloads": 100,
    "minWidth": 800,
    "minHeight": 600
  }
}
```

#### Advanced Configuration
```json
{
  "logLevel": "debug",
  "providers": {
    "order": ["google", "bing", "unsplash", "pixabay", "flickr"],
    "google": {
      "enabled": true,
      "safeSearch": true,
      "timeout": 60000
    },
    "flickr": {
      "enabled": true,
      "apiKey": "your_flickr_api_key",
      "license": "4,5,6,9,10"  // Creative Commons licenses
    }
  },
  "defaults": {
    "outputDir": "~/Pictures/ImageCrawler",
    "maxDownloads": 200,
    "minWidth": 1024,
    "minHeight": 768,
    "fileTypes": ["jpg", "jpeg", "png", "webp"],
    "preserveStructure": true
  },
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}
```

Use the config file:
```bash
# Use a specific config file
npx image-crawler web "landscape" --config ./my-config.json
```

### Environment Variables

The application supports the following environment variables:

- `USE_NATIVE_DIALOG=true`: Enables native folder selection dialogs (CLI interface is used by default)
- `DEBUG=image-crawler:*`: Enable debug logging
- `NODE_ENV=development`: Run in development mode (enables additional logging)

Example usage:

```bash
# Enable native dialogs and debug logging
USE_NATIVE_DIALOG=true DEBUG=image-crawler:* npx image-crawler local
```

## Development

This project uses ES modules (import/export) instead of CommonJS (require/module.exports).

1. Clone the repository:
   ```bash
   git clone https://github.com/rupertgermann/image-crawler.git
   cd image-crawler
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Testing

Run tests:

```bash
npm test
```

## Troubleshooting

- **ES Modules related errors**: Ensure you're using Node.js 18.17.0 or later. If you encounter `ERR_REQUIRE_ESM`, make sure all files use ES module syntax.
- **No images found**: Try adjusting the search query or filters
- **Browser timeout errors**: Increase the timeout with `--timeout 60000`
- **Permission issues**: Ensure the output directory is writable
- **Headless mode issues**: Try running with `--no-headless` if you experience browser-related problems

## Tech Stack

- Node.js (ES Modules)
- Playwright (for Web Mode)
- Various CLI helper libraries (e.g., yargs, chalk, inquirer)
- Modern JavaScript (ES2022+ features)

## Requirements

- Node.js 18.17.0 or later
- npm 9.0.0 or later
- Playwright browsers (installed automatically)

## Contributing

Contributions are welcome! Whether it's reporting a bug, suggesting a feature, or submitting a pull request, your help is appreciated.

### Reporting Bugs

If you find a bug, please open an issue on GitHub and provide detailed steps to reproduce it. Include information about your OS, Node.js version, and the command you ran.

### Suggesting Enhancements

Have an idea to make Image Crawler better? Open an issue to discuss it. We're always looking for ways to improve.

### Pull Requests

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/YourFeature` or `bugfix/YourBugfix`).
3.  Make your changes.
4.  Ensure your code adheres to the existing style and any linting configurations (if present).
5.  Write clear and concise commit messages.
6.  Push to your branch (`git push origin feature/YourFeature`).
7.  Open a pull request.

## Repository

https://github.com/rupertgermann/image-crawler

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).
