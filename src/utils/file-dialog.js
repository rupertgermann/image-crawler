import { exec } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';
import { input, select } from '@inquirer/prompts';
import inquirer from 'inquirer';
import { readdirSync } from 'fs';
import path from 'path';
import Logger from './logger.js';

const execAsync = promisify(exec);

/**
 * Select a folder using CLI interface
 * @param {string} title - Dialog title
 * @param {string} defaultPath - Default path
 * @returns {Promise<string>} Selected folder path
 */
async function selectFolderCLI(title, defaultPath) {
  Logger.info(`${title} (CLI mode)`);
  
  let currentPath = defaultPath;
  let selectedPath = null;
  
  while (!selectedPath) {
    try {
      // List directories in the current path
      const dirs = readdirSync(currentPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .sort();
      
      // Add navigation options
      const options = [
        { name: '[SELECT THIS FOLDER]', value: 'SELECT_CURRENT' },
        { name: '[GO UP ONE LEVEL]', value: 'GO_UP' },
        ...dirs.map(dir => ({ name: dir, value: dir }))
      ];
      
      Logger.info(`Current directory: ${currentPath}`);
      
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'Select a folder or navigate:',
          choices: options
        }
      ]);
      
      if (action === 'SELECT_CURRENT') {
        selectedPath = currentPath;
      } else if (action === 'GO_UP') {
        currentPath = path.dirname(currentPath);
      } else {
        currentPath = path.join(currentPath, action);
      }
    } catch (error) {
      Logger.error(`Error navigating folders: ${error.message}`);
      return defaultPath; // Return default path if there's an error
    }
  }
  
  return selectedPath;
}

/**
 * Open a folder selection dialog
 * @param {string} title - Dialog title
 * @param {string} defaultPath - Default path to open
 * @returns {Promise<string>} Selected folder path
 */
async function selectFolder(title = 'Select Folder', defaultPath = process.cwd()) {
  const isMac = platform() === 'darwin';
  const isWindows = platform() === 'win32';
  const isLinux = platform() === 'linux';

  Logger.debug(`Starting folder selection dialog: ${title}`);
  Logger.debug(`Platform: ${isMac ? 'macOS' : isWindows ? 'Windows' : isLinux ? 'Linux' : 'Unknown'}`);
  Logger.debug(`Default path: ${defaultPath}`);
  
  return selectFolderCLI(title, defaultPath);
}

export { selectFolder };
