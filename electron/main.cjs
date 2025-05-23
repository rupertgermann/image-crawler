const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs-extra');

// Wrap the main process logic in an async IIFE
(async () => {
    let configManager;
    let Logger;
    let LocalCrawler;
    let PlaywrightCrawler;

    try {
        // Dynamic import for config.js (ES Module)
        const configModule = await import('../src/utils/config.js');
        configManager = configModule.default || configModule; // Handle default export or direct export
    } catch (e) {
        console.error("Failed to load configManager in main.js:", e);
        // Fallback or error handling
        configManager = {
            init: async () => console.log("Fallback configManager.init called"),
            getConfig: () => ({}),
            get: () => ({}),
            set: () => {},
            save: () => {}
        };
    }

    try {
        // Dynamic import for logger.js (ES Module)
        const loggerModule = await import('../src/utils/logger.js');
        Logger = loggerModule.default || loggerModule; // Handle default export or direct export
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

    try {
        // Dynamic import for local-crawler.js (ES Module)
        const localCrawlerModule = await import('../src/modes/local-crawler.js');
        LocalCrawler = localCrawlerModule.default || localCrawlerModule;
    } catch (e) {
        console.error("Failed to load LocalCrawler in main.js:", e);
        LocalCrawler = null; // Or a fallback class
    }

    try {
        // Dynamic import for playwright-crawler.js (ES Module)
        const playwrightCrawlerModule = await import('../src/modes/playwright-crawler.js');
        PlaywrightCrawler = playwrightCrawlerModule.default || playwrightCrawlerModule;
    } catch (e) {
        console.error("Failed to load PlaywrightCrawler in main.js:", e);
        PlaywrightCrawler = null; // Or a fallback class
    }

    // Existing main process code, now using dynamically imported modules
    function createWindow () {
        const mainWindow = new BrowserWindow({
            width: 1000, // Increased width
            height: 750, // Increased height
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: false, // is false by default
                contextIsolation: true, // protect against prototype pollution
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
                    await Logger.init(configManager.getConfig().logLevel);
                    Logger.info("Main process Logger initialized.");
                }
            } catch (e) {
                console.error("Error initializing config or logger:", e);
            }
        } else {
            console.warn("Using fallback configManager.init");
            await configManager.init();
            console.log('Config initialized by main.js');
            console.log("Fallback Logger init called");
            Logger.info("Main process Logger initialized.");
        }

        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });

    // --- IPC Handlers for Config --- //
    ipcMain.handle('GET_CONFIG', async () => {
        try {
            const config = configManager.getConfig();
            Logger.debug('GET_CONFIG: ' + JSON.stringify(config));
            return config;
        } catch (error) {
            Logger.error('Error getting config in main.js:', error);
            return {};
        }
    });

    ipcMain.handle('SET_CONFIG', async (event, newConfig) => {
        try {
            configManager.set(newConfig);
            await configManager.save();
            Logger.info('Config updated and saved.');
            return { success: true };
        } catch (error) {
            Logger.error('Error setting config in main.js:', error);
            return { success: false, error: error.message };
        }
    });

    // --- IPC Handlers for File Dialogs --- //
    ipcMain.handle('OPEN_DIRECTORY_DIALOG', async (event, defaultPath) => {
        Logger.debug(`[main.cjs] OPEN_DIRECTORY_DIALOG received with defaultPath: ${defaultPath}`);
        try {
            const { canceled, filePaths } = await dialog.showOpenDialog({
                properties: ['openDirectory'],
                defaultPath: defaultPath || os.homedir()
            });
            if (!canceled && filePaths.length > 0) {
                Logger.debug(`[main.cjs] Selected directory: ${filePaths[0]}`);
                return filePaths[0];
            } else {
                Logger.debug('[main.cjs] Directory selection canceled.');
                return null;
            }
        } catch (error) {
            Logger.error(`[main.cjs] Error in OPEN_DIRECTORY_DIALOG: ${error.message}`, error);
            return null;
        }
    });

    ipcMain.handle('OPEN_SAVE_DIALOG', async (event, defaultPath) => {
        Logger.debug(`[main.cjs] OPEN_SAVE_DIALOG received with defaultPath: ${defaultPath}`);
        try {
            const { canceled, filePath } = await dialog.showSaveDialog({
                defaultPath: defaultPath || path.join(os.homedir(), 'output.zip')
            });
            if (!canceled && filePath) {
                Logger.debug(`[main.cjs] Selected save path: ${filePath}`);
                return filePath;
            } else {
                Logger.debug('[main.cjs] Save dialog canceled.');
                return null;
            }
        } catch (error) {
            Logger.error(`[main.cjs] Error in OPEN_SAVE_DIALOG: ${error.message}`, error);
            return null;
        }
    });

    // --- IPC Handlers for Logger --- //
    ipcMain.handle('LOG_MESSAGE', (event, level, message, ...args) => {
        if (Logger && Logger[level]) {
            Logger[level](message, ...args);
        } else {
            console.log(`[RENDERER ${level.toUpperCase()}] ${message}`, ...args);
        }
    });

    // --- Local Crawler IPC Handling --- //
    ipcMain.handle('START_LOCAL_SCAN', async (event, options) => {
        const sender = event.sender;
        if (!LocalCrawler) {
            Logger.error('LocalCrawler not loaded.');
            return { success: false, message: 'LocalCrawler not available.' };
        }
        try {
            const crawler = new LocalCrawler(options);
            crawler.on('progress', (data) => {
                sender.send('local-crawler-log', data);
            });
            crawler.on('complete', (data) => {
                sender.send('local-crawler-complete', data);
            });
            crawler.on('error', (error) => {
                sender.send('local-crawler-error', error);
            });
            await crawler.start();
            return { success: true };
        } catch (error) {
            Logger.error(`Error starting local scan: ${error.message}`, error);
            return { success: false, message: error.message };
        }
    });

    // --- Web Crawler IPC Handling --- //
    ipcMain.handle('START_WEB_DOWNLOAD', async (event, options) => {
        const sender = event.sender;
        if (!PlaywrightCrawler) {
            Logger.error('PlaywrightCrawler not loaded.');
            return { success: false, message: 'PlaywrightCrawler not available.' };
        }
        try {
            const crawler = new PlaywrightCrawler(options);
            crawler.on('progress', (data) => {
                sender.send('web-crawler-log', data);
            });
            crawler.on('complete', (data) => {
                sender.send('web-crawler-complete', data);
            });
            crawler.on('error', (error) => {
                sender.send('web-crawler-error', error);
            });
            await crawler.start();
            return { success: true };
        } catch (error) {
            Logger.error(`Error starting web download: ${error.message}`, error);
            return { success: false, message: error.message };
        }
    });

    // Quit when all windows are closed, except on macOS. There, it's common
    // for applications and their menu bar to stay active until the user quits
    // explicitly with Cmd + Q.
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
})();
