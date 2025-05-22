import chalk from 'chalk';
import configManager from './config.js';

/**
 * Log levels
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

// Default log level - force DEBUG level for now to help diagnose issues
let logLevel = LOG_LEVELS.DEBUG;

/**
 * Logger class for consistent logging
 */
class Logger {
  /**
   * Set the log level
   * @param {string} level - Log level (error, warn, info, debug, trace)
   */
  static setLevel(level) {
    const upperLevel = level.toUpperCase();
    if (LOG_LEVELS[upperLevel] !== undefined) {
      logLevel = LOG_LEVELS[upperLevel];
    } else {
      this.warn(`Invalid log level: ${level}. Using default level.`);
    }
  }

  /**
   * Log error message
   * @param {string} message - Message to log
   * @param {Error} [error] - Optional error object
   */
  static error(message, error) {
    if (logLevel >= LOG_LEVELS.ERROR) {
      console.error(chalk.red(`[ERROR] ${message}`));
      if (error) {
        console.error(chalk.red(error.stack || error.message));
      }
    }
  }

  /**
   * Log warning message
   * @param {string} message - Message to log
   */
  static warn(message) {
    if (logLevel >= LOG_LEVELS.WARN) {
      console.warn(chalk.yellow(`[WARN] ${message}`));
    }
  }

  /**
   * Log info message
   * @param {string} message - Message to log
   */
  static info(message) {
    if (logLevel >= LOG_LEVELS.INFO) {
      console.log(chalk.blue(`[INFO] ${message}`));
    }
  }

  /**
   * Log debug message
   * @param {string} message - Message to log
   */
  static debug(message) {
    if (logLevel >= LOG_LEVELS.DEBUG) {
      console.log(chalk.gray(`[DEBUG] ${message}`));
    }
  }

  /**
   * Log trace message
   * @param {string} message - Message to log
   */
  static trace(message) {
    if (logLevel >= LOG_LEVELS.TRACE) {
      console.log(chalk.gray(`[TRACE] ${message}`));
    }
  }

  /**
   * Log success message
   * @param {string} message - Message to log
   */
  static success(message) {
    console.log(chalk.green(`[SUCCESS] ${message}`));
  }

  /**
   * Log progress
   * @param {string} message - Progress message
   * @param {number} current - Current progress
   * @param {number} total - Total items
   */
  static progress(message, current, total) {
    if (logLevel >= LOG_LEVELS.INFO) {
      const percent = Math.round((current / total) * 100);
      process.stdout.write(
        `\r${chalk.cyan(`[${percent}%]`)} ${message} (${current}/${total})`
      );
      
      if (current >= total) {
        process.stdout.write('\n');
      }
    }
  }
}

// Initialize logger with config
const initLogger = async () => {
  try {
    const config = await configManager.init();
    if (config.logLevel) {
      Logger.setLevel(config.logLevel);
    }
  } catch (error) {
    console.error('Failed to initialize logger:', error);
  }
};

// Auto-initialize logger
// Consider if auto-init is desired or if it should be called explicitly by the app.
// For Electron, it might be better to initialize after app ready or when config is loaded.
// initLogger().catch(console.error); // Commenting out auto-init for now

export { initLogger };
export default Logger;
