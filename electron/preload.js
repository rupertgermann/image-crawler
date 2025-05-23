const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // General IPC communication
    log: (message) => ipcRenderer.send('log', message),
    
    // Config related
    getConfig: () => ipcRenderer.invoke('GET_CONFIG'),
    saveSettings: (settings) => ipcRenderer.invoke('SET_CONFIG', settings),

    // Dialogs
    selectDirectory: (title) => ipcRenderer.invoke('OPEN_DIRECTORY_DIALOG', title),
    selectSaveDirectory: (title, defaultPath, filename) => ipcRenderer.invoke('OPEN_SAVE_DIALOG', title, defaultPath, filename),

    // Local Crawler
    startLocalScan: (options) => ipcRenderer.invoke('START_LOCAL_SCAN', options),
    onLocalCrawlerLog: (callback) => ipcRenderer.on('local-crawler-log', (event, ...args) => callback(...args)),
    removeAllLocalCrawlerListeners: () => ipcRenderer.removeAllListeners('local-crawler-log'),
    onLocalCrawlerComplete: (callback) => ipcRenderer.on('local-crawler-complete', (event, ...args) => callback(...args)),
    onLocalCrawlerError: (callback) => ipcRenderer.on('local-crawler-error', (event, ...args) => callback(...args)),

    // Web Crawler
    startWebDownload: (options) => ipcRenderer.invoke('START_WEB_DOWNLOAD', options),
    onWebCrawlerLog: (callback) => ipcRenderer.on('web-crawler-log', (event, ...args) => callback(...args)),
    removeAllWebCrawlerListeners: () => ipcRenderer.removeAllListeners('web-crawler-log'),
    onWebCrawlerComplete: (callback) => ipcRenderer.on('web-crawler-complete', (event, ...args) => callback(...args)),
    onWebCrawlerError: (callback) => ipcRenderer.on('web-crawler-error', (event, ...args) => callback(...args)),

    // App Logging from Main Process
    onAppLog: (callback) => ipcRenderer.on('app-log', (event, ...args) => callback(...args)),
    removeAllAppLogListeners: () => ipcRenderer.removeAllListeners('app-log'),
});
