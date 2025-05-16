#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import LocalCrawler from './modes/local-crawler.js';
import WebCrawler from './modes/web-crawler.js';
import configManager from './utils/config.js';
import Logger from './utils/logger.js';
import * as pathUtils from './utils/paths.js';
import { getPlatformInfo } from './utils/platform.js';

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

      // Set default source directory if not provided
      if (!options.source) {
        options.source = platform.isWindows ? 'C:\\' : pathUtils.getDefaultScanDir();
      }

      // Initialize and start the local crawler
      const crawler = new LocalCrawler({
        sourceDir: options.source,
        outputDir: options.output || pathUtils.getDefaultDownloadDir(),
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

      // Initialize and start the web crawler
      const crawler = new WebCrawler({
        query,
        outputDir: options.output || pathUtils.getDefaultDownloadDir(),
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
program
  .command('interactive')
  .description('Start in interactive mode')
  .action(async () => {
    try {
      await configManager.init();
      
      const { mode } = await inquirer.prompt([
        {
          type: 'list',
          name: 'mode',
          message: 'Select mode:',
          choices: [
            { name: 'Local - Scan local directories', value: 'local' },
            { name: 'Web - Download images from the internet', value: 'web' }
          ]
        }
      ]);

      if (mode === 'local') {
        await program.parseAsync(['', '', 'local', ...process.argv.slice(2)]);
      } else {
        await program.parseAsync(['', '', 'web', ...process.argv.slice(2)]);
      }
    } catch (error) {
      Logger.error('Error in interactive mode:', error);
      process.exit(1);
    }
  });

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


    await configManager.updateConfig({
      platformSpecific: {
        windows: {
          selectedDrives
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