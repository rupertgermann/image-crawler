const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('REQUEST_CONFIG_DATA'),
  selectDirectory: (title) => ipcRenderer.invoke('SELECT_DIRECTORY_DIALOG', title),
  // Local Crawler related IPC
  startLocalScan: (options) => ipcRenderer.invoke('START_LOCAL_SCAN', options),
  onLocalCrawlerLog: (callback) => ipcRenderer.on('LOCAL_CRAWLER_LOG', (_event, value) => callback(value)),
  onLocalCrawlerProgress: (callback) => ipcRenderer.on('LOCAL_CRAWLER_PROGRESS', (_event, value) => callback(value)),
  onLocalCrawlerError: (callback) => ipcRenderer.on('LOCAL_CRAWLER_ERROR', (_event, value) => callback(value)),
  onLocalCrawlerComplete: (callback) => ipcRenderer.on('LOCAL_CRAWLER_COMPLETE', (_event, value) => callback(value)),
  removeAllLocalCrawlerListeners: () => {
      ipcRenderer.removeAllListeners('LOCAL_CRAWLER_LOG');
      ipcRenderer.removeAllListeners('LOCAL_CRAWLER_PROGRESS');
      ipcRenderer.removeAllListeners('LOCAL_CRAWLER_ERROR');
      ipcRenderer.removeAllListeners('LOCAL_CRAWLER_COMPLETE');
  },
  // Web Crawler related IPC
  startWebDownload: (options) => ipcRenderer.invoke('START_WEB_DOWNLOAD', options),
  onWebCrawlerLog: (callback) => ipcRenderer.on('WEB_CRAWLER_LOG', (_event, value) => callback(value)),
  onWebCrawlerProgress: (callback) => ipcRenderer.on('WEB_CRAWLER_PROGRESS', (_event, value) => callback(value)),
  onWebCrawlerError: (callback) => ipcRenderer.on('WEB_CRAWLER_ERROR', (_event, value) => callback(value)),
  onWebCrawlerComplete: (callback) => ipcRenderer.on('WEB_CRAWLER_COMPLETE', (_event, value) => callback(value)),
  removeAllWebCrawlerListeners: () => {
      ipcRenderer.removeAllListeners('WEB_CRAWLER_LOG');
      ipcRenderer.removeAllListeners('WEB_CRAWLER_PROGRESS');
      ipcRenderer.removeAllListeners('WEB_CRAWLER_ERROR');
      ipcRenderer.removeAllListeners('WEB_CRAWLER_COMPLETE');
  },
  // Global Settings and App Log
  saveSettings: (settings) => ipcRenderer.invoke('SAVE_SETTINGS', settings),
  onAppLog: (callback) => ipcRenderer.on('APP_LOG', (_event, value) => callback(value)),
  removeAllAppLogListeners: () => ipcRenderer.removeAllListeners('APP_LOG'),
  // UI Log Saving
  saveUiLogs: (logContent) => ipcRenderer.invoke('SAVE_UI_LOGS', logContent)
});

console.log('Preload script executed, electronAPI exposed with Local/Web Crawler, Global Settings, and UI Log Saving handlers.');
