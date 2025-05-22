const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra'); // Added for SAVE_UI_LOGS

// Attempt to import configManager
let configManager;
try {
  // config.js now uses module.exports = new ConfigManager();
  // and also module.exports.DEFAULT_CONFIG = DEFAULT_CONFIG;
  // So, the main export is the instance.
  configManager = require('../src/utils/config.js');
} catch (e) {
  console.error('Failed to load configManager in main.js:', e);
  // Fallback or error handling if configManager can't be loaded.
  configManager = { init: async () => { console.log('Using fallback configManager.init'); }, getConfig: () => { console.log('Using fallback configManager.getConfig'); return {}; } };
}

// Attempt to import Logger
let Logger; 
try {
  const loggerModule = require('../src/utils/logger.js');
  Logger = loggerModule; // The default export is the class itself
  if (typeof loggerModule.initLogger === 'function') { 
    Logger.init = loggerModule.initLogger; // Make it available as Logger.init
  } else if (typeof Logger.init === 'function') {
    // If Logger class itself has a static init, that's fine too.
  } else {
      // This case might occur if initLogger is not exported or Logger doesn't have a static init.
      // For now, we assume one of them will be true based on logger.js structure.
      // If not, Logger.init will be undefined and handled in app.whenReady.
      console.warn("Logger.init function not found directly on module or as static class method. Logger might not initialize from config.");
  }
} catch (e) {
  console.error("Failed to load Logger in main.js", e);
  // Basic fallback logger if import fails
  Logger = {
    init: async () => console.log("Fallback Logger init called"),
    info: (msg) => console.log(`[FALLBACK LOGGER - INFO] ${msg}`),
    error: (msg, err) => console.error(`[FALLBACK LOGGER - ERROR] ${msg}`, err || ''),
    warn: (msg) => console.warn(`[FALLBACK LOGGER - WARN] ${msg}`),
    debug: (msg) => console.log(`[FALLBACK LOGGER - DEBUG] ${msg}`),
  };
}

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1000, // Increased width
    height: 750, // Increased height
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // Keep true for security
      nodeIntegration: false // Keep false for security
    }
  });
  mainWindow.loadFile('electron/index.html');
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(async () => {
  if (configManager && typeof configManager.init === 'function') {
    try {
      await configManager.init();
      console.log('Config initialized by main.js'); // Keep this console log for basic startup info

      // Initialize the logger AFTER configManager is initialized
      if (Logger && typeof Logger.init === 'function') {
        try {
          await Logger.init(); // Initialize the logger
          Logger.info('Main process Logger initialized.'); // Use Logger for its own init message
        } catch (err) {
          console.error('Error initializing Logger in main.js:', err); // Log init error
        }
      } else {
        console.warn('Logger.init is not a function. Logger might not be correctly initialized.');
      }

    } catch (err) {
      console.error('Error initializing config in main.js:', err);
    }
  }
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handler for Config Data
ipcMain.handle('REQUEST_CONFIG_DATA', async (event) => {
  if (configManager && typeof configManager.getConfig === 'function') {
    try {
      const config = configManager.getConfig();
      // The DEFAULT_CONFIG is now a static property on the class, or attached to the instance.
      // Let's ensure it's passed along if the renderer expects it at the top level.
      // However, getConfig() in the modified config.js should already return a merged view.
      // The original config.js also had DEFAULT_CONFIG exported separately.
      // The current CJS version exports instance as default and DEFAULT_CONFIG as a named property.
      // So, we might need to send both if renderer expects DEFAULT_CONFIG separately.
      // For now, let's assume getConfig() is sufficient.
      // We also need to consider that configManager itself is the instance.
      // configManager.DEFAULT_CONFIG might be accessible if we set it up that way.
      // The provided renderer code looks for config.DEFAULT_CONFIG.
      // The getConfig() method in config.js returns a merged object.
      // Let's adjust what the main process sends, or how renderer accesses it.
      // The getConfig() method in ConfigManager returns a deepMerge of DEFAULT_CONFIG and current config.
      // So, the structure `config.DEFAULT_CONFIG.outputDir` used in renderer might be incorrect.
      // It should likely be `config.outputDir` or `config.platformSpecific[platform].defaultOutputDir`.

      // Let's get the raw DEFAULT_CONFIG as well if available, to match renderer expectation.
      // In config.js, we have module.exports.DEFAULT_CONFIG = DEFAULT_CONFIG;
      // So, we can access it via configManager.constructor.DEFAULT_CONFIG (if static)
      // or by requiring config.js again for its named export, which is not ideal.
      // Let's assume configManager.getConfig() is the primary source and adjust renderer later if needed.
      // The provided main.js code for configManager require was:
      // configManager = require('../src/utils/config.js').default;
      // This would fail as there is no .default property on module.exports.
      // It should be: configManager = require('../src/utils/config.js'); which IS the instance.
      // And configManager.DEFAULT_CONFIG is a separate export.
      // So, we can do this:
      const mainConfigInstance = require('../src/utils/config.js'); // This is the ConfigManager instance
      const defaultConfigData = require('../src/utils/config.js').DEFAULT_CONFIG; // This is the DEFAULT_CONFIG object

      const currentFullConfig = mainConfigInstance.getConfig(); // This is already merged

      // The renderer example uses `config?.DEFAULT_CONFIG?.outputDir`
      // This implies the renderer expects an object that has a DEFAULT_CONFIG key.
      // Let's return an object structured to make this easy for the renderer.
      return {
        current: currentFullConfig, // The fully merged current config
        default: defaultConfigData   // The raw default config
      };

    } catch (err) {
      console.error('Error getting config in main.js:', err);
      return { current: {}, default: {} }; // Return empty object on error
    }
  }
  return { current: {}, default: {} }; // Return empty if no configManager
});

// IPC Handler for Directory Selection Dialog
ipcMain.handle('SELECT_DIRECTORY_DIALOG', async (event, dialogTitle) => {
  const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), { // Added parent window
    title: dialogTitle,
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// --- Local Crawler IPC Handling ---
const LocalCrawler = require('../src/modes/local-crawler.js');

ipcMain.handle('START_LOCAL_SCAN', async (event, options) => {
  const sender = event.sender; 
  const initialLogMsg = `Received START_LOCAL_SCAN with options: ${JSON.stringify(options)}`;
  if (Logger && Logger.info) Logger.info(initialLogMsg);
  sender.send('LOCAL_CRAWLER_LOG', { level: 'info', message: initialLogMsg });
  
  const crawler = new LocalCrawler(options);

  crawler.on('log', (level, message) => {
    const logMessage = `[Local Crawler] ${message}`; // Add context
    if (Logger && typeof Logger[level] === 'function') {
      Logger[level](logMessage);
    } else if (Logger && Logger.info) { 
      Logger.info(`[Local Crawler/${level.toUpperCase()}] ${message}`); // Fallback to info
    }
    sender.send('LOCAL_CRAWLER_LOG', { level, message }); // Send original message to UI
  });
  crawler.on('progress', (progressData) => {
    sender.send('LOCAL_CRAWLER_PROGRESS', progressData);
  });
  crawler.on('error', (errorMessage, errorDetails) => { 
    sender.send('LOCAL_CRAWLER_ERROR', { message: errorMessage, details: errorDetails });
  });
  crawler.on('complete', (summary) => {
    sender.send('LOCAL_CRAWLER_COMPLETE', summary);
  });

  try {
    sender.send('LOCAL_CRAWLER_LOG', { level: 'info', message: 'Starting local crawler execution...' });
    const summary = await crawler.start(); // crawler.start() should return the summary
    sender.send('LOCAL_CRAWLER_LOG', { level: 'info', message: 'Local crawler finished successfully.' });
    return { success: true, message: 'Scan completed successfully.', summary };
  } catch (error) {
    console.error('Error during local scan execution in main.js:', error);
    sender.send('LOCAL_CRAWLER_ERROR', { message: `Crawler failed: ${error.message}`, details: error.stack });
    return { success: false, message: `Scan failed: ${error.message}` };
  }
});

// --- Web Crawler IPC Handling ---
const PlaywrightCrawler = require('../src/modes/playwright-crawler.js');

ipcMain.handle('START_WEB_DOWNLOAD', async (event, options) => {
  const sender = event.sender;
  const initialLogMsgWeb = `Received START_WEB_DOWNLOAD with options: ${JSON.stringify(options)}`;
  if (Logger && Logger.info) Logger.info(initialLogMsgWeb);
  sender.send('WEB_CRAWLER_LOG', { level: 'info', message: initialLogMsgWeb });
  
  const crawler = new PlaywrightCrawler(options);

  crawler.on('log', (level, message) => { 
    // Message from PlaywrightCrawler often includes provider name, e.g., `[Google] Searching...`
    // No need to add "[Web Crawler]" prefix if message is already context-rich.
    if (Logger && typeof Logger[level] === 'function') {
      Logger[level](message); 
    } else if (Logger && Logger.info) { 
      Logger.info(`[Web Crawler/${level.toUpperCase()}] ${message}`); // Fallback to info
    }
    sender.send('WEB_CRAWLER_LOG', { level, message }); // Send original message to UI
  });
  crawler.on('progress', (progressData) => {
    sender.send('WEB_CRAWLER_PROGRESS', progressData);
  });
  crawler.on('error', (errorData) => { // PlaywrightCrawler emits 'error' with { message, details }
    sender.send('WEB_CRAWLER_ERROR', errorData);
  });
  crawler.on('complete', (summary) => {
    sender.send('WEB_CRAWLER_COMPLETE', summary);
  });

  try {
    sender.send('WEB_CRAWLER_LOG', { level: 'info', message: 'Starting web crawler execution...' });
    const summary = await crawler.start(); // crawler.start() should return the summary
    sender.send('WEB_CRAWLER_LOG', { level: 'info', message: 'Web crawler finished successfully.' });
    // The summary from crawler.start() is what we want to send with 'complete'
    // The 'complete' event is already emitted by the crawler itself with the summary.
    // So, the return here is for the invoke promise.
    return { success: true, message: 'Web download process completed.', summary };
  } catch (error) {
    console.error('Error during web download execution in main.js:', error);
    // The crawler's 'error' event should have already sent detailed error info.
    // This catch is for errors in main.js orchestration or if crawler.start() throws before/after emitting.
    sender.send('WEB_CRAWLER_ERROR', { message: `Web crawler failed in main: ${error.message}`, details: error.stack });
    return { success: false, message: `Web download failed: ${error.message}` };
  }
});

// --- Settings IPC Handling ---
ipcMain.handle('SAVE_SETTINGS', async (event, settingsToSave) => {
  const settingsJson = JSON.stringify(settingsToSave);
  if (Logger && Logger.info) Logger.info(`Attempting to save settings: ${settingsJson}`);
  event.sender.send('APP_LOG', { level: 'info', message: `Saving settings: ${settingsJson}` }); // Inform UI

  if (!configManager || typeof configManager.updateConfig !== 'function') {
    const errorMsg = 'Configuration manager is not properly set up for saving.';
    console.error(errorMsg);
    if (Logger && Logger.error) Logger.error(errorMsg);
    event.sender.send('APP_LOG', { level: 'error', message: errorMsg });
    return { success: false, message: errorMsg };
  }
  try {
    await configManager.updateConfig(settingsToSave);
    const successMsg = 'Settings saved successfully.';
    if (Logger && Logger.info) Logger.info(successMsg);
    event.sender.send('APP_LOG', { level: 'info', message: successMsg });
    return { success: true, message: successMsg };
  } catch (error) {
    const errorMsg = `Error saving settings: ${error.message}`;
    console.error('Error saving settings:', error);
    if (Logger && Logger.error) Logger.error(errorMsg, error);
    event.sender.send('APP_LOG', { level: 'error', message: errorMsg });
    return { success: false, message: errorMsg };
  }
});

// New IPC Handler for saving UI logs
ipcMain.handle('SAVE_UI_LOGS', async (event, logContent) => {
  if (!logContent) {
    if (Logger && Logger.warn) Logger.warn('Save UI logs attempt with no content.');
    return { success: false, message: 'No log content provided.' };
  }
  try {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (!focusedWindow) {
        if (Logger && Logger.warn) Logger.warn('No focused window to show save dialog for UI logs.');
        return { success: false, message: 'No focused window.'};
    }
    const { canceled, filePath } = await dialog.showSaveDialog(focusedWindow, {
      title: 'Save UI Logs',
      defaultPath: `image-crawler-ui-logs-${new Date().toISOString().replace(/:/g, '-')}.txt`,
      filters: [{ name: 'Text Files', extensions: ['txt'] }]
    });

    if (canceled || !filePath) {
      if (Logger && Logger.info) Logger.info('Save UI logs dialog canceled.');
      return { success: false, message: 'Save dialog canceled.' };
    }

    await fs.writeFile(filePath, logContent);
    if (Logger && Logger.info) Logger.info(`UI logs saved to: ${filePath}`);
    return { success: true, message: `Logs saved to ${filePath}` };
  } catch (error) {
    if (Logger && Logger.error) Logger.error(`Error saving UI logs: ${error.message}`, error);
    console.error('Error saving UI logs:', error); // Keep console.error for direct visibility
    return { success: false, message: `Error saving logs: ${error.message}` };
  }
});
