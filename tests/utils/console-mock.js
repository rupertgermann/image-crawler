/**
 * Console Mock
 * 
 * This module provides utility functions to mock and test console output.
 */

class ConsoleMock {
  constructor() {
    this.originalConsole = { ...console };
    this.messages = {
      log: [],
      info: [],
      warn: [],
      error: [],
      debug: []
    };
    
    this.setupMocks();
  }
  
  /**
   * Set up console mocks
   */
  setupMocks() {
    // Save original console methods
    this.originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };
    
    // Override console methods
    console.log = this.createMock('log');
    console.info = this.createMock('info');
    console.warn = this.createMock('warn');
    console.error = this.createMock('error');
    console.debug = this.createMock('debug');
  }
  
  /**
   * Create a mock function for a console method
   * @param {string} level - Console method name (log, info, warn, error, debug)
   * @returns {Function} Mock function
   */
  createMock(level) {
    return (...args) => {
      this.messages[level].push({
        timestamp: new Date().toISOString(),
        args
      });
      
      // Optionally log to the real console for debugging
      if (process.env.DEBUG_CONSOLE) {
        this.originalConsole[level](`[${level.toUpperCase()}]`, ...args);
      }
    };
  }
  
  /**
   * Get all messages for a specific log level
   * @param {string} level - Log level (log, info, warn, error, debug)
   * @returns {Array} Array of messages
   */
  getMessages(level) {
    return this.messages[level] || [];
  }
  
  /**
   * Get all messages across all log levels
   * @returns {Object} Object with arrays of messages for each log level
   */
  getAllMessages() {
    return { ...this.messages };
  }
  
  /**
   * Clear all captured messages
   */
  clear() {
    Object.keys(this.messages).forEach(level => {
      this.messages[level] = [];
    });
  }
  
  /**
   * Restore original console methods
   */
  restore() {
    console.log = this.originalConsole.log;
    console.info = this.originalConsole.info;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.debug = this.originalConsole.debug;
  }
  
  /**
   * Check if a message was logged that contains the given text
   * @param {string} text - Text to search for
   * @param {string} [level] - Log level to search in (optional)
   * @returns {boolean} True if the message was found
   */
  hasMessageContaining(text, level) {
    const levels = level ? [level] : Object.keys(this.messages);
    
    return levels.some(lvl => 
      this.messages[lvl].some(msg => 
        msg.args.some(arg => 
          String(arg).includes(text)
        )
      )
    );
  }
  
  /**
   * Get all messages that contain the given text
   * @param {string} text - Text to search for
   * @param {string} [level] - Log level to search in (optional)
   * @returns {Array} Array of matching messages
   */
  getMessagesContaining(text, level) {
    const levels = level ? [level] : Object.keys(this.messages);
    const results = [];
    
    levels.forEach(lvl => {
      this.messages[lvl].forEach(msg => {
        const matchingArgs = msg.args.filter(arg => String(arg).includes(text));
        if (matchingArgs.length > 0) {
          results.push({
            level: lvl,
            timestamp: msg.timestamp,
            args: matchingArgs
          });
        }
      });
    });
    
    return results;
  }
}

// Create a singleton instance
const consoleMock = new ConsoleMock();

// Auto-restore on process exit
process.on('exit', () => {
  consoleMock.restore();
});

export default consoleMock;
