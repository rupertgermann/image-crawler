const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const { readdir } = require('fs/promises');

// Wrap the main process logic in an async IIFE
(async () => {
    let configManager;
    let Logger;
    let LocalCrawler;
    let PlaywrightCrawler;
    let ProviderRegistry;
    let providerRegistryInstance;

    let activeLocalCrawler = null;
    let activeWebCrawler = null;

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
        // Dynamic import for ProviderRegistry.js (ES Module)
        const providerRegistryModule = await import('../src/providers/provider-registry.js');
        ProviderRegistry = providerRegistryModule.default || providerRegistryModule;
    } catch (e) {
        console.error("Failed to load ProviderRegistry in main.js:", e);
        ProviderRegistry = null; // Fallback or error handling
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

    // Function to get available providers by scanning the providers directory
    async function getAvailableProviders() {
        try {
            if (!providerRegistryInstance) {
                Logger.error('ProviderRegistry not initialized yet.');
                return { success: false, message: 'ProviderRegistry not available.', providers: [] };
            }
            // Use the new method from ProviderRegistry
            const providers = providerRegistryInstance.getAllKnownProviderNames();
            return { success: true, providers };
        } catch (error) {
            Logger.error('Error getting available providers from ProviderRegistry:', error);
            return { 
                success: false, 
                message: 'Failed to get available providers',
                error: error.message,
                providers: [] 
            };
        }
    }
    
    // Expose the function via IPC
    ipcMain.handle('GET_AVAILABLE_PROVIDERS', getAvailableProviders);

    // Existing main process code, now using dynamically imported modules
    function createWindow () {
        const mainWindow = new BrowserWindow({
            width: 1200, // Increased width for better space efficiency
            height: 900, // Increased height for better space efficiency
            backgroundColor: '#ffffff', // Better font rendering as per Electron best practices
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

                // Initialize ProviderRegistry AFTER configManager and Logger
                if (ProviderRegistry) {
                    providerRegistryInstance = new ProviderRegistry();
                    // Pass a dummy emitter or a simple one for main process logs from registry if needed
                    // For now, assuming initialize doesn't strictly need a full crawlerInstance here
                    // or that its internal logging is self-contained or uses console.
                    // If it needs to emit to renderer, that's a different pattern.
                    await providerRegistryInstance.initialize({ emit: (event, level, message) => {
                        if (event === 'log') {
                            Logger[level] ? Logger[level](`[ProviderRegistry via Main] ${message}`) : console.log(`[ProviderRegistry via Main - ${level}] ${message}`);
                        }
                    }});
                    Logger.info("ProviderRegistry initialized in main process.");
                } else {
                    Logger.error("ProviderRegistry module not loaded, cannot initialize.");
                }

            } catch (e) {
                console.error("Error initializing config, logger, or provider registry:", e);
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
            sender.send('scan-error', 'LocalCrawler module not available.'); // Use consistent event
            return { success: false, message: 'LocalCrawler not available.' };
        }
        if (activeLocalCrawler) {
            Logger.warn('Local scan already in progress.');
            sender.send('scan-error', 'Another local scan is already in progress.');
            return { success: false, message: 'Local scan already in progress.' };
        }
        try {
            const crawler = new LocalCrawler(options);
            activeLocalCrawler = crawler; // Store reference

            crawler.on('log', (level, message) => { // Assuming crawler emits 'log' with level and message
                sender.send('scan-log', level, message);
            });
            crawler.on('progress', (data) => { // Example: if progress is a specific event
                // Potentially map to a 'scan-log' type event or a new specific event if needed
                sender.send('scan-log', 'info', `Progress: ${data.processed}/${data.total}`);
            });
            crawler.on('complete', (data) => {
                sender.send('scan-complete', data);
                activeLocalCrawler = null; // Clear reference
            });
            crawler.on('error', (error) => {
                // Ensure error is a string or simple object for IPC
                const errorMessage = typeof error === 'string' ? error : (error.message || 'Unknown local scan error');
                sender.send('scan-error', errorMessage);
                activeLocalCrawler = null; // Clear reference
            });
            await crawler.start();
            Logger.info('Local scan initiated.');
            return { success: true, message: 'Local scan initiated.' };
        } catch (error) {
            Logger.error('Error starting local scan:', error);
            const errorMessage = typeof error === 'string' ? error : (error.message || 'Failed to start local scan.');
            sender.send('scan-error', errorMessage);
            activeLocalCrawler = null;
            return { success: false, message: errorMessage };
        }
    });

    ipcMain.handle('STOP_LOCAL_SCAN', async (event) => { // Added 'event' parameter
        Logger.info('Attempting to stop local scan...');
        if (activeLocalCrawler) {
            try {
                await activeLocalCrawler.stop();
                Logger.info('Local scan stop method called.');
                event.sender.send('scan-stopped', { message: 'Local scan stop requested successfully.' }); // Use event.sender
                activeLocalCrawler = null; // Clear reference immediately after requesting stop
                return { success: true, message: 'Stop requested.' };
            } catch (error) {
                Logger.error('Error stopping local scan:', error);
                event.sender.send('scan-error', `Error stopping local scan: ${error.message}`); // Use event.sender
                return { success: false, message: `Error: ${error.message}` };
            }
        } else {
            Logger.warn('No active local scan to stop.');
            event.sender.send('scan-stopped', { message: 'No active local scan to stop.' }); // Use event.sender
            return { success: false, message: 'No active scan.' };
        }
    });

    // --- Web Crawler IPC Handling --- //
    ipcMain.handle('START_WEB_DOWNLOAD', async (event, options) => {
        const sender = event.sender;
        if (!PlaywrightCrawler) {
            Logger.error('PlaywrightCrawler not loaded.');
            sender.send('web-error', 'PlaywrightCrawler module not available.'); // Use consistent event
            return { success: false, message: 'PlaywrightCrawler not available.' };
        }
        if (activeWebCrawler) {
            Logger.warn('Web download already in progress.');
            sender.send('web-error', 'Another web download is already in progress.');
            return { success: false, message: 'Web download already in progress.' };
        }
        try {
            const crawler = new PlaywrightCrawler(options);
            activeWebCrawler = crawler; // Store reference

            crawler.on('log', (level, message) => { // Assuming crawler emits 'log' with level and message
                sender.send('web-log', level, message);
            });
            crawler.on('complete', (data) => {
                sender.send('web-complete', data);
                activeWebCrawler = null; // Clear reference
            });
            crawler.on('error', (error) => {
                const errorMessage = typeof error === 'string' ? error : (error.message || 'Unknown web download error');
                sender.send('web-error', errorMessage);
                activeWebCrawler = null; // Clear reference
            });
            await crawler.start();
            Logger.info('Web download initiated.');
            return { success: true, message: 'Web download initiated.' };
        } catch (error) {
            Logger.error('Error starting web download:', error);
            const errorMessage = typeof error === 'string' ? error : (error.message || 'Failed to start web download.');
            sender.send('web-error', errorMessage);
            activeWebCrawler = null;
            return { success: false, message: errorMessage };
        }
    });

    ipcMain.handle('STOP_WEB_DOWNLOAD', async (event) => { // Added 'event' parameter
        Logger.info('Attempting to stop web download...');
        if (activeWebCrawler) {
            try {
                await activeWebCrawler.stop();
                Logger.info('Web download stop method called.');
                event.sender.send('web-stopped', { message: 'Web download stop requested successfully.' }); // Use event.sender
                activeWebCrawler = null; // Clear reference immediately after requesting stop
                return { success: true, message: 'Stop requested.' };
            } catch (error) {
                Logger.error('Error stopping web download:', error);
                event.sender.send('web-error', `Error stopping web download: ${error.message}`); // Use event.sender
                return { success: false, message: `Error: ${error.message}` };
            }
        } else {
            Logger.warn('No active web download to stop.');
            event.sender.send('web-stopped', { message: 'No active web download to stop.' }); // Use event.sender
            return { success: false, message: 'No active download.' };
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
