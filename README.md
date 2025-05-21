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

1. Ensure you have Node.js 18+ installed
2. Install the package globally:

```bash
npm install -g image-crawler
```

Or use with npx:

```bash
npx image-crawler
```

## Usage

Run without any commands to start in interactive mode:

```bash
image-crawler
```

### Local Mode

Scan a local directory for images. If no source is provided, you'll be prompted to select a folder:

By default, Local Mode skips files already present in the output directory by comparing their content hashes.

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

Download images from the web. A search query is required:

```bash
# Basic usage (tries all enabled sources by default)
npx image-crawler web "nature landscape" --max-downloads 50

# Specify a single provider
npx image-crawler web "mountain lake" --provider unsplash

# Specify multiple providers (comma-separated)
npx image-crawler web "city lights" --provider bing,pexels --max-downloads 20

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

Start in interactive mode for a guided experience:

```bash
npx image-crawler interactive
```

## Configuration

Configuration is stored in `config.json` in the current working directory. The file is automatically created on first run with default values.

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

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/image-crawler.git
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

- **No images found**: Try adjusting the search query or filters
- **Browser timeout errors**: Increase the timeout with `--timeout 60000`
- **Permission issues**: Ensure the output directory is writable
- **Headless mode issues**: Try running with `--no-headless` if you experience browser-related problems

## Tech Stack

- Node.js
- Playwright (for Web Mode)
- Various CLI helper libraries (e.g., yargs, chalk, inquirer)

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
