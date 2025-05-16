import { fileURLToPath } from 'url';
import path from 'path';
import * as pathUtils from '../../src/utils/paths.js';

describe('Path Utilities', () => {
  describe('getDefaultDownloadDir', () => {
    it('should return a valid download directory path', () => {
      const downloadDir = pathUtils.getDefaultDownloadDir();
      expect(typeof downloadDir).toBe('string');
      expect(downloadDir).toBeTruthy();
    });
  });

  describe('getDefaultScanDir', () => {
    it('should return a valid scan directory path', () => {
      const scanDir = pathUtils.getDefaultScanDir();
      expect(typeof scanDir).toBe('string');
      expect(scanDir).toBeTruthy();
    });
  });

  describe('ensureDir', () => {
    it('should create directory if it does not exist', async () => {
      const testDir = path.join(process.cwd(), 'test-temp-dir');
      
      try {
        const result = await pathUtils.ensureDir(testDir);
        expect(result).toBe(testDir);
        
        // Verify directory exists
        const fs = await import('fs/promises');
        const stats = await fs.stat(testDir);
        expect(stats.isDirectory()).toBe(true);
      } finally {
        // Cleanup
        await fs.rm(testDir, { recursive: true, force: true });
      }
    });
  });
});
