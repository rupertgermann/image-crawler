# Image Crawler
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![GitHub](https://img.shields.io/badge/GitHub-rupertgermann/image--crawler-blue)](https://github.com/rupertgermann/image-crawler)

A cross-platform tool for collecting images from local drives or the web.

## Features

- **Local Mode**: Scan local directories for images
  - Filter by file type, size, and dimensions
  - Preserve directory structure
  - Interactive folder selection
  - Deduplicate images by content hash (skips existing files)
  - Windows drive selection support

- **Web Mode**: Download images from multiple sources
  - Supports Pixabay, Unsplash, and Google Images
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
# Basic usage with interactive folder selection
image-crawler local --output ./downloads

# Specify source directory
image-crawler local --source ~/Pictures --output ./downloads

# With filters and max files
image-crawler local --min-width 800 --min-height 600 --max-files 100
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
# Basic usage with default provider (tries all sources)
image-crawler web "nature landscape" --max-downloads 50

# Specify provider (pixabay, unsplash, or google)
image-crawler web "mountain lake" --provider unsplash

# With size and type filters
image-crawler web "sunset" --min-width 1920 --min-height 1080 --file-types jpg,png
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
- `--provider <name>`: Image provider (`pixabay`, `unsplash`, `google`, or `all`)

### Interactive Mode

Start in interactive mode for a guided experience:

```bash
image-crawler interactive
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
USE_NATIVE_DIALOG=true DEBUG=image-crawler:* image-crawler local
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

## Repository

https://github.com/rupertgermann/image-crawler

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).
