import { jest } from '@jest/globals';
import Logger from '../../src/utils/logger.js';

describe('Logger', () => {
  let consoleLog, consoleError, consoleWarn, consoleInfo, consoleDebug;

  beforeEach(() => {
    // Mock console methods
    consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfo = jest.spyOn(console, 'info').mockImplementation(() => {});
    consoleDebug = jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original implementations
    consoleLog.mockRestore();
    consoleError.mockRestore();
    consoleWarn.mockRestore();
    consoleInfo.mockRestore();
    consoleDebug.mockRestore();
  });

  it('should log info messages', () => {
    const message = 'Test info message';
    Logger.info(message);
    expect(consoleInfo).toHaveBeenCalledWith(expect.stringContaining(`[INFO] ${message}`));
  });

  it('should log error messages', () => {
    const message = 'Test error message';
    const error = new Error('Test error');
    Logger.error(message, error);
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining(`[ERROR] ${message}`));
  });

  it('should log warning messages', () => {
    const message = 'Test warning message';
    Logger.warn(message);
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining(`[WARN] ${message}`));
  });

  it('should log debug messages when debug is enabled', () => {
    const originalDebug = Logger.debugEnabled;
    Logger.debugEnabled = true;
    
    const message = 'Test debug message';
    Logger.debug(message);
    expect(consoleDebug).toHaveBeenCalledWith(expect.stringContaining(`[DEBUG] ${message}`));
    
    // Restore original debug state
    Logger.debugEnabled = originalDebug;
  });

  it('should not log debug messages when debug is disabled', () => {
    const originalDebug = Logger.debugEnabled;
    Logger.debugEnabled = false;
    
    const message = 'Test debug message';
    Logger.debug(message);
    expect(consoleDebug).not.toHaveBeenCalled();
    
    // Restore original debug state
    Logger.debugEnabled = originalDebug;
  });
});
