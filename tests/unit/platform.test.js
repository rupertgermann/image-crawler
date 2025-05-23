import { test, expect, describe } from '@playwright/test';
import { getPlatformInfo } from '../../src/utils/platform.js';

// Store the original process.platform
const originalPlatform = process.platform;

describe('Platform Utilities', () => {
  // Restore original process.platform after all tests in this describe block
  afterAll(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true // Make it writable again if needed, or configure as per original
    });
  });

  describe('getPlatformInfo', () => {
    const testCases = [
      { os: 'win32', expected: { isWindows: true, isMacOS: false, isLinux: false, name: 'windows' } },
      { os: 'darwin', expected: { isWindows: false, isMacOS: true, isLinux: false, name: 'macos' } },
      { os: 'linux', expected: { isWindows: false, isMacOS: false, isLinux: true, name: 'linux' } },
      { os: 'freebsd', expected: { isWindows: false, isMacOS: false, isLinux: false, name: 'unknown' } }
    ];

    for (const { os, expected } of testCases) {
      test(`should detect ${os} platform`, () => {
        // Mock process.platform for this test case
        Object.defineProperty(process, 'platform', {
          value: os,
          writable: true // Or false if it shouldn't be changed further within the test
        });

        const info = getPlatformInfo();
        
        expect(info.isWindows).toBe(expected.isWindows);
        expect(info.isMacOS).toBe(expected.isMacOS);
        expect(info.isLinux).toBe(expected.isLinux);
        if (os === 'win32') expect(info.platform).toBe('win32');
        else if (os === 'darwin') expect(info.platform).toBe('darwin');
        else if (os === 'linux') expect(info.platform).toBe('linux');
        else expect(info.platform).toBe(os); // For 'freebsd' and any other unmapped
      });
    }
  });
});
