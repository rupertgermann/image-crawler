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
  const useNativeDialog = process.env.USE_NATIVE_DIALOG === 'true';

  Logger.debug(`Starting folder selection dialog: ${title}`);
  Logger.debug(`Platform: ${isMac ? 'macOS' : isWindows ? 'Windows' : isLinux ? 'Linux' : 'Unknown'}`);
  Logger.debug(`Default path: ${defaultPath}`);
  
  // If native dialog is disabled, use CLI interface
  if (!useNativeDialog) {
    Logger.debug('Native dialog disabled, using CLI interface');
    return selectFolderCLI(title, defaultPath);
  }

  try {
    let command;
    
    if (isMac) {
      command = `osascript -e 'tell app "System Events" to POSIX path of (choose folder with prompt "${title}" default location POSIX file "${defaultPath}")'`;
      Logger.debug(`Using macOS command: ${command}`);
    } else if (isWindows) {
      // Using PowerShell for Windows
      command = `powershell -Command "Add-Type -AssemblyName System.windows.forms; $folder = New-Object System.Windows.Forms.FolderBrowserDialog; $folder.Description = '${title}'; $folder.RootFolder = 'MyComputer'; if($folder.ShowDialog() -eq 'OK') { Write-Output $folder.SelectedPath }"`;
      Logger.debug(`Using Windows command: ${command}`);
    } else if (isLinux) {
      // Using zenity for Linux
      command = `zenity --file-selection --directory --title="${title}" --filename="${defaultPath}"`;
      Logger.debug(`Using Linux command: ${command}`);
    } else {
      Logger.error('Unsupported platform detected');
      throw new Error('Unsupported platform');
    }

    Logger.debug('Executing folder selection command...');
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      Logger.warn('Folder selection warning:', stderr);
    }

    const selectedPath = stdout.trim();
    Logger.debug(`Folder selected: ${selectedPath || 'No folder selected'}`);
    
    // If no path was selected or there was an issue, fall back to CLI interface
    if (!selectedPath) {
      Logger.info('No folder selected with native dialog, falling back to CLI interface');
      return selectFolderCLI(title, defaultPath);
    }
    
    return selectedPath;
  } catch (error) {
    Logger.error('Error in folder selection:', error.message);
    Logger.error('Error details:', error);
    Logger.debug('Stack trace:', error.stack);
    
    // Fall back to CLI interface if native dialog fails
    Logger.info('Native dialog failed, falling back to CLI interface');
    return selectFolderCLI(title, defaultPath);
  }
}

export { selectFolder };
