import { jest } from '@jest/globals';
import { selectDirectory } from '../../src/utils/file-dialog.js';
import { exec } from 'child_process';

// Mock child_process.exec
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

describe('File Dialog Utilities', () => {
  const originalPlatform = process.platform;
  
  afterEach(() => {
    // Restore the original platform
    Object.defineProperty(process, 'platform', {
      value: originalPlatform
    });
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  describe('selectDirectory', () => {
    it('should use osascript on macOS', async () => {
      // Mock process.platform to be 'darwin' (macOS)
      Object.defineProperty(process, 'platform', {
        value: 'darwin'
      });
      
      // Mock exec to return a test directory
      exec.mockImplementation((command, callback) => {
        expect(command).toContain('osascript');
        callback(null, '/test/directory\n', '');
      });
      
      const result = await selectDirectory('Select a directory');
      expect(result).toBe('/test/directory');
    });
    
    it('should use zenity on Linux', async () => {
      // Mock process.platform to be 'linux'
      Object.defineProperty(process, 'platform', {
        value: 'linux'
      });
      
      // Mock exec to return a test directory
      exec.mockImplementation((command, callback) => {
        expect(command).toContain('zenity');
        callback(null, '/test/directory\n', '');
      });
      
      const result = await selectDirectory('Select a directory');
      expect(result).toBe('/test/directory');
    });
    
    it('should use File-FormattingDialog on Windows', async () => {
      // Mock process.platform to be 'win32' (Windows)
      Object.defineProperty(process, 'platform', {
        value: 'win32'
      });
      
      // Mock exec to return a test directory
      exec.mockImplementation((command, callback) => {
        expect(command).toContain('powershell');
        callback(null, 'C:\\test\\directory\r\n', '');
      });
      
      const result = await selectDirectory('Select a directory');
      expect(result).toBe('C:\\test\\directory');
    });
    
    it('should throw an error on unsupported platforms', async () => {
      // Mock process.platform to be an unsupported platform
      Object.defineProperty(process, 'platform', {
        value: 'freebsd'
      });
      
      await expect(selectDirectory('Select a directory'))
        .rejects
        .toThrow('Unsupported platform: freebsd');
    });
    
    it('should handle errors from exec', async () => {
      // Mock process.platform to be 'darwin' (macOS)
      Object.defineProperty(process, 'platform', {
        value: 'darwin'
      });
      
      // Mock exec to return an error
      const testError = new Error('Test error');
      testError.stderr = 'Error details';
      exec.mockImplementation((command, callback) => {
        callback(testError);
      });
      
      await expect(selectDirectory('Select a directory'))
        .rejects
        .toThrow('Test error');
    });
    
    it('should handle empty or whitespace-only output', async () => {
      // Mock process.platform to be 'darwin' (macOS)
      Object.defineProperty(process, 'platform', {
        value: 'darwin'
      });
      
      // Mock exec to return empty output
      exec.mockImplementation((command, callback) => {
        callback(null, '   \n', '');
      });
      
      const result = await selectDirectory('Select a directory');
      expect(result).toBe('');
    });
  });
});
