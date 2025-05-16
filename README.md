# Image Crawler

A cross-platform tool for collecting images from local drives or the web.

## Features

- **Local Mode**: Scan local directories for images
  - Filter by file type, size, and dimensions
  - Preserve directory structure
  - Windows drive selection

- **Web Mode**: Download images from Google Images
  - Search by keyword
  - Filter by size and dimensions
  - Safe search

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

### Local Mode

Scan a local directory for images:

```bash
image-crawler local --source ~/Pictures --output ./downloads
```

Options:
- `-s, --source <path>`: Source directory to scan (default: platform-specific)
- `-o, --output <path>`: Output directory for images (default: ./downloads)
- `--min-width <pixels>`: Minimum image width in pixels
- `--min-height <pixels>`: Minimum image height in pixels
- `--min-size <bytes>`: Minimum file size (supports human-readable formats like '100KB', '1.5MB')
- `--max-files <count>`: Maximum number of files to process
- `--preserve-structure`: Preserve directory structure in output (default: flat)
- `--select-drives`: Interactively select drives (Windows only)
- `--file-types <types>`: Comma-separated list of file extensions to include (e.g., 'jpg,png,webp')

### Web Mode

Download images from the web:

```bash
image-crawler web "nature landscape" --max-downloads 50
```

Options:
- `-o, --output <path>`: Output directory for images (default: ./downloads)
- `--max-downloads <count>`: Maximum number of images to download (default: 100)
- `--min-width <pixels>`: Minimum image width in pixels (default: 800)
- `--min-height <pixels>`: Minimum image height in pixels (default: 600)
- `--min-size <bytes>`: Minimum file size (supports human-readable formats like '100KB', '1.5MB')
- `--no-safe-search`: Disable safe search
- `--file-types <types>`: Comma-separated list of file extensions to include (e.g., 'jpg,png,webp')
- `--headless`: Run browser in headless mode (default: true)
- `--timeout <ms>`: Browser operation timeout in milliseconds (default: 30000)

### Interactive Mode

Start in interactive mode for a guided experience:

```bash
image-crawler interactive
```

## Configuration

Configuration is stored in `config.json` in the current working directory. The file is automatically created on first run.

### Environment Variables

The application supports the following environment variables:

- `USE_NATIVE_DIALOG=true` - Enables native folder selection dialogs (CLI interface is used by default)

Example usage:

```bash
USE_NATIVE_DIALOG=true node src/index.js local
```

Or when using the installed package:

```bash
USE_NATIVE_DIALOG=true image-crawler local
```

## Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run in development mode:
   ```bash
   npm run dev
   ```

## Testing

Run tests:

```bash
npm test
```

## License

MIT
