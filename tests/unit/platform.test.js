import { platform } from 'os';
import { getPlatformInfo } from '../../src/utils/platform.js';

// Mock the OS module
jest.mock('os', () => ({
  platform: jest.fn()
}));

describe('Platform Utilities', () => {
  describe('getPlatformInfo', () => {
    it('should detect Windows platform', () => {
      platform.mockReturnValue('win32');
      const info = getPlatformInfo();
      
      expect(info.isWindows).toBe(true);
      expect(info.isMacOS).toBe(false);
      expect(info.isLinux).toBe(false);
      expect(info.name).toBe('windows');
    });

    it('should detect macOS platform', () => {
      platform.mockReturnValue('darwin');
      const info = getPlatformInfo();
      
      expect(info.isWindows).toBe(false);
      expect(info.isMacOS).toBe(true);
      expect(info.isLinux).toBe(false);
      expect(info.name).toBe('macos');
    });

    it('should detect Linux platform', () => {
      platform.mockReturnValue('linux');
      const info = getPlatformInfo();
      
      expect(info.isWindows).toBe(false);
      expect(info.isMacOS).toBe(false);
      expect(info.isLinux).toBe(true);
      expect(info.name).toBe('linux');
    });

    it('should handle unknown platform', () => {
      platform.mockReturnValue('freebsd');
      const info = getPlatformInfo();
      
      expect(info.isWindows).toBe(false);
      expect(info.isMacOS).toBe(false);
      expect(info.isLinux).toBe(false);
      expect(info.name).toBe('unknown');
    });
  });
});
