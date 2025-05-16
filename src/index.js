#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs-extra';
import LocalCrawler from './modes/local-crawler.js';
import PlaywrightCrawler from './modes/playwright-crawler.js';
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
  .option('--min-size <bytes>', 'Minimum file size in bytes (e.g., 100KB)', val => pathUtils.parseSize(val))
  .option('--max-files <count>', 'Maximum number of files to process', parseInt)
  .option('--preserve-structure', 'Preserve directory structure in output (default: flat)')
  .option('--select-drives', 'Interactively select drives (Windows only)')
  .option('--file-types <types>', 'Comma-separated list of file extensions to include', val => val.split(','))
  .action(async (options) => {
    try {
      Logger.info('Starting local mode...');
      Logger.debug('Local mode options:', JSON.stringify(options, null, 2));
      
      Logger.debug('Initializing configuration...');
      await configManager.init();
      Logger.debug('Configuration initialized successfully');
      
      // Handle interactive drive selection on Windows
      if (options.selectDrives && platform.isWindows) {
        Logger.info('Starting drive selection on Windows...');
        await handleDriveSelection();
        return;
      }

      // Always use interactive folder selection for source
      try {
        Logger.info('Starting interactive folder selection for source...');
        const defaultScanDir = pathUtils.getDefaultScanDir();
        Logger.debug(`Default scan directory: ${defaultScanDir}`);
        
        // If source was provided via CLI, use it as the default in the dialog
        const initialDir = options.source || defaultScanDir;
        Logger.debug(`Using initial directory for dialog: ${initialDir}`);
        
        Logger.debug('Launching folder selection dialog...');
        options.source = await selectFolder('Select source folder', initialDir);
        Logger.info(`Selected source folder: ${options.source}`);
      } catch (error) {
        Logger.warn('Source folder selection canceled or failed, using default source folder');
        Logger.debug(`Error during folder selection: ${error.message}`);
        options.source = platform.isWindows ? 'C:\\' : pathUtils.getDefaultScanDir();
        Logger.debug(`Using fallback source directory: ${options.source}`);
      }

      // Use output folder from CLI or config
      let outputDir = options.output;
      if (!outputDir) {
        Logger.debug('No output directory specified, getting from config...');
        outputDir = pathUtils.getDefaultDownloadDir();
        Logger.info(`Using output folder from config: ${outputDir}`);
      } else {
        Logger.debug(`Using output directory from CLI: ${outputDir}`);
      }
      
      // Validate output directory - ensure it's not undefined
      if (!outputDir) {
        Logger.warn('Output directory is undefined, using fallback directory');
        outputDir = path.join(process.cwd(), 'downloads');
        Logger.info(`Using fallback output directory: ${outputDir}`);
        // Ensure the directory exists
        try {
          await fs.ensureDir(outputDir);
        } catch (error) {
          Logger.error(`Failed to create fallback output directory: ${error.message}`);
          throw new Error('Failed to create output directory');
        }
      }

      // Initialize and start the local crawler
      Logger.info('Initializing local crawler...');
      const crawlerOptions = {
        sourceDir: options.source,
        outputDir,
        minWidth: options.minWidth,
        minHeight: options.minHeight,
        minFileSize: options.minSize,
        maxFiles: options.maxFiles,
        preserveStructure: options.preserveStructure
      };
      Logger.debug('Crawler options:', JSON.stringify(crawlerOptions, null, 2));
      
      const crawler = new LocalCrawler(crawlerOptions);

      Logger.info('Starting local crawler...');
      await crawler.start();
      Logger.info('Local crawler completed successfully.');
    } catch (error) {
      Logger.error('Error in local mode:', error.message);
      Logger.debug('Error details:', error);
      Logger.debug('Stack trace:', error.stack);
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
  .option('--min-size <bytes>', 'Minimum file size in bytes (e.g., 100KB)', val => pathUtils.parseSize(val))
  .option('--no-safe-search', 'Disable safe search')
  .option('--file-types <types>', 'Comma-separated list of file extensions to include', val => val.split(','))
  .option('--headless', 'Run browser in headless mode', true)
  .option('--timeout <ms>', 'Browser operation timeout in milliseconds', parseInt)
  .action(async (query, options) => {
    try {
      Logger.info('Starting web mode...');
      Logger.debug('Web mode options:', JSON.stringify(options, null, 2));
      
      Logger.debug('Initializing configuration...');
      await configManager.init();
      Logger.debug('Configuration initialized successfully');
      
      // Prompt for query if not provided
      if (!query) {
        Logger.info('No search query provided, prompting user...');
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'query',
            message: 'Enter search query:',
            validate: input => input.trim() ? true : 'Query cannot be empty'
          }
        ]);
        query = answers.query;
        Logger.info(`Search query entered: ${query}`);
      } else {
        Logger.info(`Using search query: ${query}`);
      }

      // Interactive output folder selection if not provided
      let outputDir = options.output;
      if (!outputDir) {
        Logger.debug('No output directory specified, launching folder selection dialog...');
        try {
          const defaultDownloadDir = pathUtils.getDefaultDownloadDir();
          Logger.debug(`Default download directory: ${defaultDownloadDir}`);
          outputDir = await selectFolder('Select output folder for downloaded images', defaultDownloadDir);
          Logger.info(`Selected output folder: ${outputDir}`);
        } catch (error) {
          Logger.warn('Output folder selection canceled or failed, using default output folder');
          Logger.debug(`Error during folder selection: ${error.message}`);
          outputDir = pathUtils.getDefaultDownloadDir();
          Logger.debug(`Using fallback output directory: ${outputDir}`);
        }
      } else {
        Logger.debug(`Using output directory from CLI: ${outputDir}`);
      }
      
      // Validate output directory - ensure it's not undefined
      if (!outputDir) {
        Logger.warn('Output directory is undefined, using fallback directory');
        outputDir = path.join(process.cwd(), 'downloads');
        Logger.info(`Using fallback output directory: ${outputDir}`);
        // Ensure the directory exists
        try {
          await fs.ensureDir(outputDir);
        } catch (error) {
          Logger.error(`Failed to create fallback output directory: ${error.message}`);
          throw new Error('Failed to create output directory');
        }
      }

      // Initialize and start the web crawler
      Logger.info('Initializing web crawler with Playwright...');
      const crawlerOptions = {
        query,
        outputDir,
        maxDownloads: options.maxDownloads,
        minWidth: options.minWidth,
        minHeight: options.minHeight,
        minFileSize: options.minSize,
        safeSearch: options.safeSearch,
        headless: options.headless,
        timeout: options.timeout,
        fileTypes: options.fileTypes
      };
      Logger.debug('Crawler options:', JSON.stringify(crawlerOptions, null, 2));
      
      const crawler = new PlaywrightCrawler(crawlerOptions);

      Logger.info('Starting web crawler...');
      await crawler.start();
      Logger.info('Web crawler completed successfully.');
    } catch (error) {
      Logger.error('Error in web mode:', error.message);
      Logger.debug('Error details:', error);
      Logger.debug('Stack trace:', error.stack);
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
      const crawler = new PlaywrightCrawler({
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