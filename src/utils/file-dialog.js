import { exec } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';
import { input, select } from '@inquirer/prompts';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import Logger from './logger.js';

const execAsync = promisify(exec);

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

  try {
    let command;
    
    if (isMac) {
      command = `osascript -e 'tell app "System Events" to POSIX path of (choose folder with prompt "${title}" default location POSIX file "${defaultPath}")'`;
    } else if (isWindows) {
      // Using PowerShell for Windows
      command = `powershell -Command "Add-Type -AssemblyName System.windows.forms; $folder = New-Object System.Windows.Forms.FolderBrowserDialog; $folder.Description = '${title}'; $folder.RootFolder = 'MyComputer'; if($folder.ShowDialog() -eq 'OK') { Write-Output $folder.SelectedPath }"`;
    } else if (isLinux) {
      // Using zenity for Linux
      command = `zenity --file-selection --directory --title="${title}" --filename="${defaultPath}"`;
    } else {
      throw new Error('Unsupported platform');
    }

    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      Logger.warn('Folder selection warning:', stderr);
    }

    return stdout.trim();
  } catch (error) {
    Logger.error('Error in folder selection:', error.message);
    throw error;
  }
}

export { selectFolder };
