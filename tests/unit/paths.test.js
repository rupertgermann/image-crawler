import { test, expect, describe } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';
import * as pathUtils from '../../src/utils/paths.js';

describe('Path Utilities', () => {
  describe('getDefaultDownloadDir', () => {
    test('should return a valid download directory path', () => {
      const downloadDir = pathUtils.getDefaultDownloadDir();
      expect(typeof downloadDir).toBe('string');
      expect(downloadDir).toBeTruthy();
    });
  });

  describe('getDefaultScanDir', () => {
    test('should return a valid scan directory path', () => {
      const scanDir = pathUtils.getDefaultScanDir();
      expect(typeof scanDir).toBe('string');
      expect(scanDir).toBeTruthy();
    });
  });

  describe('ensureDir', () => {
    test('should create directory if it does not exist', async () => {
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

  describe('parseSize', () => {
    test('should parse numeric values as bytes', () => {
      expect(pathUtils.parseSize(1024)).toBe(1024);
      expect(pathUtils.parseSize('1024')).toBe(1024);
    });

    test('should parse KB values correctly', () => {
      expect(pathUtils.parseSize('1KB')).toBe(1024);
      expect(pathUtils.parseSize('1kb')).toBe(1024);
      expect(pathUtils.parseSize('1.5KB')).toBe(1536);
      expect(pathUtils.parseSize('1.5 KB')).toBe(1536);
    });

    test('should parse MB values correctly', () => {
      expect(pathUtils.parseSize('1MB')).toBe(1048576);
      expect(pathUtils.parseSize('1mb')).toBe(1048576);
      expect(pathUtils.parseSize('2.5MB')).toBe(2621440);
    });

    test('should parse GB values correctly', () => {
      expect(pathUtils.parseSize('1GB')).toBe(1073741824);
      expect(pathUtils.parseSize('0.5GB')).toBe(536870912);
    });

    test('should handle invalid formats gracefully', () => {
      // Mock console.warn to prevent test output pollution
      const originalWarn = console.warn;
      const mockWarn = () => {}; // Simple no-op mock
      console.warn = mockWarn;

      expect(pathUtils.parseSize('invalid')).toBe(0);
      expect(pathUtils.parseSize('100XB')).toBe(100); // Unknown unit defaults to bytes

      // Restore console.warn
      console.warn = originalWarn;
    });
  });
});
