import { test, expect, describe } from '@playwright/test';
import Logger from '../../src/utils/logger.js';

describe('Logger', () => {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;
  const originalConsoleDebug = console.debug;

  let logSpy, errorSpy, warnSpy, infoSpy, debugSpy;

  test.beforeEach(() => {
    logSpy = { calls: [] };
    errorSpy = { calls: [] };
    warnSpy = { calls: [] };
    infoSpy = { calls: [] };
    debugSpy = { calls: [] };

    console.log = (...args) => logSpy.calls.push(args);
    console.error = (...args) => errorSpy.calls.push(args);
    console.warn = (...args) => warnSpy.calls.push(args);
    console.info = (...args) => infoSpy.calls.push(args);
    console.debug = (...args) => debugSpy.calls.push(args);
  });

  test.afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.info = originalConsoleInfo;
    console.debug = originalConsoleDebug;
  });

  test('should log info messages', () => {
    const message = 'Test info message';
    Logger.info(message);
    expect(infoSpy.calls.length).toBe(1);
    expect(infoSpy.calls[0][0]).toContain(`[INFO] ${message}`);
  });

  test('should log error messages', () => {
    const message = 'Test error message';
    const error = new Error('Test error');
    Logger.error(message, error); // Logger might log the error object separately or as part of the message
    expect(errorSpy.calls.length).toBeGreaterThanOrEqual(1); // Logger might call console.error multiple times for error and stack
    expect(errorSpy.calls[0][0]).toContain(`[ERROR] ${message}`);
    // Optionally, check for error object logging if Logger does that
    // expect(errorSpy.calls.some(callArgs => callArgs.includes(error))).toBe(true);
  });

  test('should log warning messages', () => {
    const message = 'Test warning message';
    Logger.warn(message);
    expect(warnSpy.calls.length).toBe(1);
    expect(warnSpy.calls[0][0]).toContain(`[WARN] ${message}`);
  });

  test('should log debug messages when debug is enabled', () => {
    const originalDebugEnabled = Logger.debugEnabled;
    Logger.debugEnabled = true;
    
    const message = 'Test debug message';
    Logger.debug(message);
    expect(debugSpy.calls.length).toBe(1);
    expect(debugSpy.calls[0][0]).toContain(`[DEBUG] ${message}`);
    
    Logger.debugEnabled = originalDebugEnabled;
  });

  test('should not log debug messages when debug is disabled', () => {
    const originalDebugEnabled = Logger.debugEnabled;
    Logger.debugEnabled = false;
    
    const message = 'Test debug message';
    Logger.debug(message);
    expect(debugSpy.calls.length).toBe(0);
    
    Logger.debugEnabled = originalDebugEnabled;
  });
});
