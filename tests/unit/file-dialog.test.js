import { test, expect, describe } from '@playwright/test';
import { selectDirectory } from '../../src/utils/file-dialog.js';
import child_process from 'child_process'; // Import the whole module to mock exec

const originalExec = child_process.exec;
const originalPlatform = process.platform;

// Helper to store calls and set mock implementation for exec
let mockExecImplementation = (command, callback) => callback(null, '', ''); // Default success, no output
let lastExecCommand = null;

describe('File Dialog Utilities', () => {
  test.beforeEach(() => {
    // Reset/reapply mock for child_process.exec for each test
    child_process.exec = (command, optionsOrCallback, callback) => {
      lastExecCommand = command;
      let cb = callback;
      if (typeof optionsOrCallback === 'function') {
        cb = optionsOrCallback;
      }
      // If optionsOrCallback is an object, it's options, and callback is the third arg
      // This simplified mock assumes callback is always the last or second arg if no options
      mockExecImplementation(command, cb);
    };
    // Reset platform to original before each test, then set as needed by test
    Object.defineProperty(process, 'platform', { value: originalPlatform, writable: true });
  });
  
  test.afterEach(() => {
    // Restore original process.platform and child_process.exec
    Object.defineProperty(process, 'platform', { value: originalPlatform, writable: true });
    child_process.exec = originalExec;
    lastExecCommand = null;
    // Reset mockExecImplementation to default if needed, or let beforeEach handle it
    mockExecImplementation = (command, callback) => callback(null, '', '');
  });
  
  describe('selectDirectory', () => {
    test('should use osascript on macOS', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', writable: true });
      
      mockExecImplementation = (command, callback) => {
        callback(null, '/test/directory\n', ''); // Simulate osascript output
      };
      
      const result = await selectDirectory('Select a directory');
      expect(lastExecCommand).toContain('osascript');
      expect(result).toBe('/test/directory');
    });
    
    test('should use zenity on Linux', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux', writable: true });
      
      mockExecImplementation = (command, callback) => {
        callback(null, '/test/directory\n', ''); // Simulate zenity output
      };
      
      const result = await selectDirectory('Select a directory');
      expect(lastExecCommand).toContain('zenity');
      expect(result).toBe('/test/directory');
    });
    
    test('should use PowerShell on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32', writable: true });
      
      mockExecImplementation = (command, callback) => {
        callback(null, 'C:\\test\\directory\r\n', ''); // Simulate PowerShell output
      };
      
      const result = await selectDirectory('Select a directory');
      expect(lastExecCommand).toContain('powershell');
      expect(result).toBe('C:\\test\\directory');
    });
    
    test('should throw an error on unsupported platforms', async () => {
      Object.defineProperty(process, 'platform', { value: 'freebsd', writable: true });
      
      await expect(selectDirectory('Select a directory'))
        .rejects
        .toThrow('Unsupported platform: freebsd');
    });
    
    test('should handle errors from exec', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', writable: true });
      
      const testError = new Error('Test error');
      // testError.stderr = 'Error details'; // stderr is part of the error object if exec populates it
      
      mockExecImplementation = (command, callback) => {
        callback(testError, '', 'Error details'); // Simulate exec error with stderr
      };
      
      await expect(selectDirectory('Select a directory'))
        .rejects
        .toThrow('Test error');
    });
    
    test('should handle empty or whitespace-only output', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', writable: true });
      
      mockExecImplementation = (command, callback) => {
        callback(null, '   \n', ''); // Simulate empty/whitespace output
      };
      
      const result = await selectDirectory('Select a directory');
      expect(result).toBe('');
    });
  });
});
