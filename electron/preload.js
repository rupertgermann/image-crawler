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
    stopLocalScan: () => ipcRenderer.invoke('STOP_LOCAL_SCAN'),
    onScanLog: (callback) => ipcRenderer.on('scan-log', (event, ...args) => callback(...args)),
    onScanComplete: (callback) => ipcRenderer.on('scan-complete', (event, ...args) => callback(...args)),
    onScanError: (callback) => ipcRenderer.on('scan-error', (event, ...args) => callback(...args)),
    onScanStopped: (callback) => ipcRenderer.on('scan-stopped', (event, ...args) => callback(...args)),
    removeAllLocalCrawlerListeners: () => {
        ipcRenderer.removeAllListeners('scan-log');
        ipcRenderer.removeAllListeners('scan-complete');
        ipcRenderer.removeAllListeners('scan-error');
        ipcRenderer.removeAllListeners('scan-stopped');
    },

    // Web Crawler
    startWebDownload: (options) => ipcRenderer.invoke('START_WEB_DOWNLOAD', options),
    stopWebDownload: () => ipcRenderer.invoke('STOP_WEB_DOWNLOAD'),
    onWebLog: (callback) => ipcRenderer.on('web-log', (event, ...args) => callback(...args)),
    onWebComplete: (callback) => ipcRenderer.on('web-complete', (event, ...args) => callback(...args)),
    onWebError: (callback) => ipcRenderer.on('web-error', (event, ...args) => callback(...args)),
    onWebStopped: (callback) => ipcRenderer.on('web-stopped', (event, ...args) => callback(...args)),
    removeAllWebCrawlerListeners: () => {
        ipcRenderer.removeAllListeners('web-log');
        ipcRenderer.removeAllListeners('web-complete');
        ipcRenderer.removeAllListeners('web-error');
        ipcRenderer.removeAllListeners('web-stopped');
    },

    // App Logging from Main Process
    onAppLog: (callback) => ipcRenderer.on('app-log', (event, ...args) => callback(...args)),
    removeAllAppLogListeners: () => ipcRenderer.removeAllListeners('app-log'),
    
    // Provider Management
    getAvailableProviders: () => ipcRenderer.invoke('GET_AVAILABLE_PROVIDERS'),
});
