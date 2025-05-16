#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import { fileURLToPath } from 'url';
import path from 'path';
import LocalCrawler from './modes/local-crawler.js';
import WebCrawler from './modes/web-crawler.js';
import configManager from './utils/config.js';
import Logger from './utils/logger.js';
import * as pathUtils from './utils/paths.js';
import { getPlatformInfo } from './utils/platform.js';
import { selectFolder } from './utils/file-dialog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize program
const program = new Command();
const platform = getPlatformInfo();

// Set up program
program
  .name('image-crawler')
  .description('A tool for collecting images from local drives or the web')
  .version('1.0.0');

// Local mode command
program
  .command('local')
  .description('Crawl local directories for images')
  .option('-s, --source <path>', 'Source directory to scan')
  .option('-o, --output <path>', 'Output directory for images')
  .option('--min-width <pixels>', 'Minimum image width in pixels', parseInt)
  .option('--min-height <pixels>', 'Minimum image height in pixels', parseInt)
  .option('--min-size <bytes>', 'Minimum file size in bytes', parseInt)
  .option('--max-files <count>', 'Maximum number of files to process', parseInt)
  .option('--flat', 'Flatten directory structure in output')
  .option('--select-drives', 'Interactively select drives (Windows only)')
  .action(async (options) => {
    try {
      await configManager.init();
      
      // Handle interactive drive selection on Windows
      if (options.selectDrives && platform.isWindows) {
        await handleDriveSelection();
        return;
      }

      // Interactive folder selection if no source provided
      if (!options.source) {
        try {
          options.source = await selectFolder('Select source folder', pathUtils.getDefaultScanDir());
          Logger.info(`Selected source folder: ${options.source}`);
        } catch (error) {
          Logger.warn('Using default source folder');
          options.source = platform.isWindows ? 'C:\\' : pathUtils.getDefaultScanDir();
        }
      }

      // Interactive output folder selection if not provided
      let outputDir = options.output;
      if (!outputDir) {
        try {
          outputDir = await selectFolder('Select output folder', pathUtils.getDefaultDownloadDir());
          Logger.info(`Selected output folder: ${outputDir}`);
        } catch (error) {
          Logger.warn('Using default output folder');
          outputDir = pathUtils.getDefaultDownloadDir();
        }
      }

      // Initialize and start the local crawler
      const crawler = new LocalCrawler({
        sourceDir: options.source,
        outputDir,
        minWidth: options.minWidth,
        minHeight: options.minHeight,
        minFileSize: options.minSize,
        maxFiles: options.maxFiles,
        preserveStructure: !options.flat
      });

      await crawler.start();
    } catch (error) {
      Logger.error('Error in local mode:', error);
      process.exit(1);
    }
  });

// Web mode command
program
  .command('web')
  .description('Download images from the web')
  .argument('[query]', 'Search query for images')
  .option('-o, --output <path>', 'Output directory for images')
  .option('--max-downloads <count>', 'Maximum number of images to download', parseInt)
  .option('--min-width <pixels>', 'Minimum image width in pixels', parseInt)
  .option('--min-height <pixels>', 'Minimum image height in pixels', parseInt)
  .option('--min-size <bytes>', 'Minimum file size in bytes', parseInt)
  .option('--no-safe-search', 'Disable safe search')
  .action(async (query, options) => {
    try {
      await configManager.init();
      
      // Prompt for query if not provided
      if (!query) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'query',
            message: 'Enter search query:',
            validate: input => input.trim() ? true : 'Query cannot be empty'
          }
        ]);
        query = answers.query;
      }

      // Interactive output folder selection if not provided
      let outputDir = options.output;
      if (!outputDir) {
        try {
          outputDir = await selectFolder('Select output folder for downloaded images', pathUtils.getDefaultDownloadDir());
          Logger.info(`Selected output folder: ${outputDir}`);
        } catch (error) {
          Logger.warn('Using default output folder');
          outputDir = pathUtils.getDefaultDownloadDir();
        }
      }

      // Initialize and start the web crawler
      const crawler = new WebCrawler({
        query,
        outputDir,
        maxDownloads: options.maxDownloads,
        minWidth: options.minWidth,
        minHeight: options.minHeight,
        minFileSize: options.minSize,
        safeSearch: options.safeSearch,
        headless: true
      });

      await crawler.start();
    } catch (error) {
      Logger.error('Error in web mode:', error);
      process.exit(1);
    }
  });

// Interactive mode
async function runInteractiveMode() {
  try {
    await configManager.init();
    
    const { mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'Select mode:',
        choices: [
          { name: 'Local - Scan local directories', value: 'local' },
          { name: 'Web - Download images from the internet', value: 'web' },
          { name: 'Exit', value: 'exit' }
        ]
      }
    ]);

    if (mode === 'exit') {
      Logger.info('Goodbye!');
      process.exit(0);
    }

    // For local mode
    if (mode === 'local') {
      const options = {};
      
      // Source directory selection
      try {
        options.source = await selectFolder('Select source folder', pathUtils.getDefaultScanDir());
        Logger.info(`Selected source folder: ${options.source}`);
      } catch (error) {
        Logger.warn('Using default source folder');
        options.source = platform.isWindows ? 'C:\\' : pathUtils.getDefaultScanDir();
      }

      // Output directory selection
      try {
        options.output = await selectFolder('Select output folder', pathUtils.getDefaultDownloadDir());
        Logger.info(`Selected output folder: ${options.output}`);
      } catch (error) {
        Logger.warn('Using default output folder');
        options.output = pathUtils.getDefaultDownloadDir();
      }

      // Initialize and start the local crawler
      const crawler = new LocalCrawler({
        sourceDir: options.source,
        outputDir: options.output,
        minWidth: 0,
        minHeight: 0,
        minFileSize: 0,
        maxFiles: 1000,
        preserveStructure: true
      });

      await crawler.start();
    } 
    // For web mode
    else if (mode === 'web') {
      const options = {};
      
      // Get search query
      const { query } = await inquirer.prompt([
        {
          type: 'input',
          name: 'query',
          message: 'Enter search query:',
          validate: input => input.trim() ? true : 'Query cannot be empty'
        }
      ]);

      // Output directory selection
      try {
        options.output = await selectFolder('Select output folder for downloaded images', pathUtils.getDefaultDownloadDir());
        Logger.info(`Selected output folder: ${options.output}`);
      } catch (error) {
        Logger.warn('Using default output folder');
        options.output = pathUtils.getDefaultDownloadDir();
      }

      // Initialize and start the web crawler
      const crawler = new WebCrawler({
        query,
        outputDir: options.output,
        maxDownloads: 20,
        minWidth: 800,
        minHeight: 600,
        minFileSize: 0,
        safeSearch: true,
        headless: true
      });

      await crawler.start();
    }
  } catch (error) {
    Logger.error('Error in interactive mode:', error);
    process.exit(1);
  }
}

// Register the interactive command
program
  .command('interactive')
  .description('Start in interactive mode')
  .action(runInteractiveMode);

// Handle Windows drive selection
async function handleDriveSelection() {
  try {
    const { getWindowsDrives } = await import('./utils/platform.js');
    const drives = await getWindowsDrives();
    
    if (drives.length === 0) {
      Logger.warn('No drives found. Using C:\\ as default.');
      return;
    }

    const { selectedDrives } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedDrives',
        message: 'Select drives to scan:',
        choices: drives.map(drive => ({
          name: drive,
          value: drive,
          checked: true
        })),
        validate: input => 
          input.length > 0 ? true : 'You must select at least one drive'
      }
    ]);

    // Get output directory
    let outputDir;
    try {
      outputDir = await selectFolder('Select output folder for scanned images', pathUtils.getDefaultDownloadDir());
      Logger.info(`Selected output folder: ${outputDir}`);
    } catch (error) {
      Logger.warn('Using default output folder');
      outputDir = pathUtils.getDefaultDownloadDir();
    }

    // Save selected drives to config
    await configManager.updateConfig({
      platformSpecific: {
        windows: {
          selectedDrives,
          lastOutputDir: outputDir
        }
      }
    });

    Logger.success(`Selected drives: ${selectedDrives.join(', ')}`);
    Logger.info('Run the local command again to start scanning the selected drives.');
  } catch (error) {
    Logger.error('Error selecting drives:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    // Set up default command (interactive mode)
    if (process.argv.length <= 2) {
      await program.parseAsync(['', '', 'interactive']);
    } else {
      await program.parseAsync(process.argv);
    }
  } catch (error) {
    Logger.error('An unexpected error occurred:', error);
    process.exit(1);
  }
}

// Start the application
main();