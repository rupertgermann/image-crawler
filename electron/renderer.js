// Basic UI logic for showing/hiding mode-specific options

document.addEventListener('DOMContentLoaded', async () => {
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    const localOptions = document.getElementById('localOptions');
    const webOptions = document.getElementById('webOptions');

    function updateVisibleOptions() {
        const selectedMode = document.querySelector('input[name="mode"]:checked').value;
        if (selectedMode === 'local') {
            localOptions.style.display = 'block';
            webOptions.style.display = 'none';
        } else if (selectedMode === 'web') {
            localOptions.style.display = 'none';
            webOptions.style.display = 'block';
        }
    }

    modeRadios.forEach(radio => {
        radio.addEventListener('change', updateVisibleOptions);
    });

    updateVisibleOptions(); // Initial call

    const logArea = document.getElementById('logArea');
    function logMessage(message) {
        const time = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${time}] ${message}`;
        logArea.appendChild(logEntry);
        logArea.scrollTop = logArea.scrollHeight; // Auto-scroll
    }
    
    logMessage('Renderer process initialized.');

    // --- Global Config and UI Population ---
    const globalDefaultOutputDirInput = document.getElementById('globalDefaultOutputDir');
    const globalDefaultWebProviderSelect = document.getElementById('globalDefaultWebProvider');
    
    // Local Mode Inputs
    const localOutputDirInput = document.getElementById('localOutputDir');
    const localMinWidthInput = document.getElementById('localMinWidth');
    const localMinHeightInput = document.getElementById('localMinHeight');
    const localMinSizeInput = document.getElementById('localMinSize');
    const localMaxFilesInput = document.getElementById('localMaxFiles');
    const localFileTypesInput = document.getElementById('localFileTypes');
    const localPreserveStructureCheckbox = document.getElementById('localPreserveStructure');

    // Web Mode Inputs
    const webOutputDirInput = document.getElementById('webOutputDir');
    const webMaxDownloadsInput = document.getElementById('webMaxDownloads');
    const webMinWidthInput = document.getElementById('webMinWidth');
    const webMinHeightInput = document.getElementById('webMinHeight');
    const webMinSizeInput = document.getElementById('webMinSize');
    const webFileTypesInput = document.getElementById('webFileTypes');
    const webProviderSelect = document.getElementById('webProvider');
    const webSafeSearchCheckbox = document.getElementById('webSafeSearch');
    const webHeadlessCheckbox = document.getElementById('webHeadless');
    const webTimeoutInput = document.getElementById('webTimeout');

    async function loadAndApplyConfig() {
        if (!window.electronAPI || typeof window.electronAPI.getConfig !== 'function') {
            logMessage('Error: electronAPI or getConfig function is not available.');
            return;
        }
        logMessage('Requesting configuration data...');
        try {
            const configData = await window.electronAPI.getConfig();
            logMessage('Configuration data received.');
            console.log('Config payload for loadAndApplyConfig:', configData);
            
            const config = configData.current || {}; 
            const defaultConfig = configData.default || {}; 

            const effectiveOutputDir = config.outputDir || defaultConfig.platformSpecific?.[config.platform]?.defaultOutputDir || defaultConfig.outputDir || '';
            const effectiveProvider = config.provider || (defaultConfig.providers ? defaultConfig.providers.order[0] : 'all') || 'all';

            if (globalDefaultOutputDirInput) globalDefaultOutputDirInput.value = effectiveOutputDir;
            if (globalDefaultWebProviderSelect) globalDefaultWebProviderSelect.value = effectiveProvider;
            if (localOutputDirInput) localOutputDirInput.value = effectiveOutputDir;
            if (webOutputDirInput) webOutputDirInput.value = effectiveOutputDir;
            
            if(localMinWidthInput) localMinWidthInput.value = config.minWidth !== undefined ? config.minWidth : (defaultConfig.minWidth !== undefined ? defaultConfig.minWidth : '');
            if(localMinHeightInput) localMinHeightInput.value = config.minHeight !== undefined ? config.minHeight : (defaultConfig.minHeight !== undefined ? defaultConfig.minHeight : '');
            if(localMinSizeInput) localMinSizeInput.value = config.minFileSize !== undefined ? config.minFileSize : (defaultConfig.minFileSize !== undefined ? defaultConfig.minFileSize : '');
            if(localMaxFilesInput) localMaxFilesInput.value = config.maxDownloads !== undefined ? config.maxDownloads : (defaultConfig.maxDownloads !== undefined ? defaultConfig.maxDownloads : '');
            const localFileTypes = config.fileTypes || defaultConfig.fileTypes || [];
            if(localFileTypesInput) localFileTypesInput.value = Array.isArray(localFileTypes) ? localFileTypes.join(',') : (defaultConfig.fileTypes || []).join(',');
            if(localPreserveStructureCheckbox) localPreserveStructureCheckbox.checked = config.preserveStructure !== undefined ? config.preserveStructure : (defaultConfig.preserveStructure !== undefined ? defaultConfig.preserveStructure : false);

            if(webMaxDownloadsInput) webMaxDownloadsInput.value = config.maxDownloads !== undefined ? config.maxDownloads : (defaultConfig.maxDownloads !== undefined ? defaultConfig.maxDownloads : 50);
            if(webMinWidthInput) webMinWidthInput.value = config.minWidth !== undefined ? config.minWidth : (defaultConfig.minWidth !== undefined ? defaultConfig.minWidth : ''); 
            if(webMinHeightInput) webMinHeightInput.value = config.minHeight !== undefined ? config.minHeight : (defaultConfig.minHeight !== undefined ? defaultConfig.minHeight : ''); 
            if(webMinSizeInput) webMinSizeInput.value = config.minFileSize !== undefined ? config.minFileSize : (defaultConfig.minFileSize !== undefined ? defaultConfig.minFileSize : '');
            
            const webFileTypes = config.fileTypes || defaultConfig.fileTypes || ['jpg', 'png'];
            if(webFileTypesInput) webFileTypesInput.value = Array.isArray(webFileTypes) ? webFileTypes.join(',') : webFileTypes;

            if(webProviderSelect) webProviderSelect.value = config.provider || effectiveProvider || 'all'; 
            
            if(webSafeSearchCheckbox) webSafeSearchCheckbox.checked = config.safeSearch !== undefined ? config.safeSearch : (defaultConfig.searchEngines?.google?.safeSearch !== undefined ? defaultConfig.searchEngines.google.safeSearch : true);
            if(webHeadlessCheckbox) webHeadlessCheckbox.checked = config.headless !== undefined ? config.headless : (defaultConfig.headless !== undefined ? defaultConfig.headless : true); 
            if(webTimeoutInput) webTimeoutInput.value = config.timeout !== undefined ? config.timeout : (defaultConfig.timeout !== undefined ? defaultConfig.timeout : 30000);

            logMessage('All relevant UI fields populated from configuration.');

        } catch (error) {
            logMessage(`Error fetching or applying configuration: ${error.message}`);
            console.error('Error fetching/applying configuration:', error);
        }
    }
    await loadAndApplyConfig(); 

    // --- Event Listeners for Global Settings ---
    const selectGlobalDefaultOutputDirBtn = document.getElementById('selectGlobalDefaultOutputDirBtn');
    if (selectGlobalDefaultOutputDirBtn && globalDefaultOutputDirInput && window.electronAPI) {
        selectGlobalDefaultOutputDirBtn.addEventListener('click', async () => {
            try {
                const directoryPath = await window.electronAPI.selectDirectory('Select Global Default Output Directory');
                if (directoryPath) globalDefaultOutputDirInput.value = directoryPath;
                logMessage(directoryPath ? `Selected global default output: ${directoryPath}` : 'Global output selection canceled.');
            } catch (error) { logMessage(`Error selecting global output dir: ${error.message}`); }
        });
    }

    const saveGlobalSettingsBtn = document.getElementById('saveGlobalSettingsBtn');
    if (saveGlobalSettingsBtn && window.electronAPI) {
        saveGlobalSettingsBtn.addEventListener('click', async () => {
            const settingsToSave = {
                outputDir: globalDefaultOutputDirInput.value || null, 
                provider: globalDefaultWebProviderSelect.value || 'all' 
            };
            Object.keys(settingsToSave).forEach(key => {
                if (settingsToSave[key] === null && key !== 'outputDir') delete settingsToSave[key];
            });
            logMessage(`Saving global settings: ${JSON.stringify(settingsToSave)}`);
            try {
                saveGlobalSettingsBtn.disabled = true; saveGlobalSettingsBtn.textContent = 'Saving...';
                const result = await window.electronAPI.saveSettings(settingsToSave);
                logMessage(`Settings save result: ${result.message}`);
                if (result.success) {
                    alert('Global default settings saved successfully!');
                    await loadAndApplyConfig(); 
                } else {
                    alert(`Failed to save settings: ${result.message}`);
                }
            } catch (error) {
                logMessage(`Error saving global settings via IPC: ${error.message}`);
                alert(`Error saving settings: ${error.message}`);
            } finally {
                saveGlobalSettingsBtn.disabled = false; saveGlobalSettingsBtn.textContent = 'Save These Defaults';
            }
        });
    }
    
    if (window.electronAPI && window.electronAPI.onAppLog) {
         if(window.electronAPI.removeAllAppLogListeners) window.electronAPI.removeAllAppLogListeners(); 
         window.electronAPI.onAppLog(({level, message}) => {
            logMessage(`[APP - ${level.toUpperCase()}] ${message}`);
        });
    }
    // --- End of Global Settings ---

    // --- Event Listeners for Local Mode --- 
    const selectSourceDirBtn = document.getElementById('selectSourceDirBtn');
    const localSourceDirInput = document.getElementById('localSourceDir');
    if (selectSourceDirBtn && localSourceDirInput && window.electronAPI) {
        selectSourceDirBtn.addEventListener('click', async () => {
            try {
                const directoryPath = await window.electronAPI.selectDirectory('Select Source Directory');
                if (directoryPath) localSourceDirInput.value = directoryPath;
                logMessage(directoryPath ? `Selected local source: ${directoryPath}` : 'Local source selection canceled.');
            } catch (error) { logMessage(`Error selecting local source dir: ${error.message}`); }
        });
    }

    const selectLocalOutputDirBtn = document.getElementById('selectLocalOutputDirBtn');
    // localOutputDirInput is already defined at the top
    if (selectLocalOutputDirBtn && localOutputDirInput && window.electronAPI) {
        selectLocalOutputDirBtn.addEventListener('click', async () => {
            try {
                const directoryPath = await window.electronAPI.selectDirectory('Select Local Output Directory');
                if (directoryPath) localOutputDirInput.value = directoryPath;
                logMessage(directoryPath ? `Selected local output: ${directoryPath}` : 'Local output selection canceled.');
            } catch (error) { logMessage(`Error selecting local output dir: ${error.message}`); }
        });
    }

    const startLocalScanBtn = document.getElementById('startLocalScanBtn');
    if (startLocalScanBtn && window.electronAPI) {
        startLocalScanBtn.addEventListener('click', async () => {
            const sourceDir = document.getElementById('localSourceDir').value;
            const outputDir = localOutputDirInput.value; 
            if (!sourceDir || !outputDir) { alert('Source and Output directories are required for local scan.'); return; }
            const options = {
                sourceDir, outputDir,
                minWidth: parseInt(localMinWidthInput.value) || null,
                minHeight: parseInt(localMinHeightInput.value) || null,
                minSize: localMinSizeInput.value || null,
                maxDownloads: parseInt(localMaxFilesInput.value) || 0,
                extensions: localFileTypesInput.value.split(',').map(ft => ft.trim()).filter(ft => ft),
                preserveStructure: localPreserveStructureCheckbox.checked
            };
            for (const key in options) { if (options[key] === null || Number.isNaN(options[key]) || (Array.isArray(options[key]) && !options[key].length)) { if (key !== 'preserveStructure' && key !== 'maxDownloads') delete options[key]; } }
            logMessage('Starting local scan...');
            startLocalScanBtn.disabled = true;
            const originalButtonText = startLocalScanBtn.textContent;
            startLocalScanBtn.textContent = 'Scanning...';

            setupLocalCrawlerEventListeners(startLocalScanBtn, originalButtonText);

            try {
                const result = await window.electronAPI.startLocalScan(options);
                if (result.success) {
                    logMessage('Main process response (local scan): Scan initiated successfully.');
                } else {
                    logMessage(`Main process response (local scan): Failed to start scan - ${result.message || 'Unknown error'}`);
                }
            } catch (error) {
                logMessage(`Error starting local scan: ${error.message}`);
                startLocalScanBtn.disabled = false;
                startLocalScanBtn.textContent = originalButtonText;
            }
        });
    }

    // --- Event Listener for Web Mode ---
    const selectWebOutputDirBtn = document.getElementById('selectWebOutputDirBtn');
    // webOutputDirInput is already defined at the top
    if (selectWebOutputDirBtn && webOutputDirInput && window.electronAPI) {
        selectWebOutputDirBtn.addEventListener('click', async () => {
            try {
                const directoryPath = await window.electronAPI.selectDirectory('Select Web Output Directory');
                if (directoryPath) webOutputDirInput.value = directoryPath;
                logMessage(directoryPath ? `Selected web output: ${directoryPath}` : 'Web output selection canceled.');
            } catch (error) { logMessage(`Error selecting web output dir: ${error.message}`); }
        });
    }

    const startWebDownloadBtn = document.getElementById('startWebDownloadBtn');
    if (startWebDownloadBtn && window.electronAPI) {
        startWebDownloadBtn.addEventListener('click', async () => {
            const query = document.getElementById('webQuery').value;
            const outputDir = webOutputDirInput.value; 
            if (!query.trim() || !outputDir) { alert('Search query and Output directory are required.'); return; }
            const options = {
                query, outputDir,
                maxDownloads: parseInt(webMaxDownloadsInput.value) || 0,
                minWidth: parseInt(webMinWidthInput.value) || null,
                minHeight: parseInt(webMinHeightInput.value) || null,
                minSize: webMinSizeInput.value || null,
                extensions: webFileTypesInput.value.split(',').map(ft => ft.trim()).filter(ft => ft),
                provider: webProviderSelect.value,
                safeSearch: webSafeSearchCheckbox.checked,
                headless: webHeadlessCheckbox.checked,
                timeout: parseInt(webTimeoutInput.value) || 30000
            };
            for (const key in options) { if (options[key] === null || Number.isNaN(options[key]) || (Array.isArray(options[key]) && !options[key].length)) { if (key !== 'safeSearch' && key !== 'headless' && (key !== 'maxDownloads' || options[key] !==0) ) delete options[key]; } }

            logMessage('Starting web download...');
            startWebDownloadBtn.disabled = true;
            const originalButtonText = startWebDownloadBtn.textContent;
            startWebDownloadBtn.textContent = 'Downloading...';

            setupWebCrawlerEventListeners(startWebDownloadBtn, originalButtonText);

            try {
                const result = await window.electronAPI.startWebDownload(options);
                if (result.success) {
                    logMessage('Main process response (web download): Download initiated successfully.');
                } else {
                    logMessage(`Main process response (web download): Failed to start download - ${result.message || 'Unknown error'}`);
                }
            } catch (error) {
                logMessage(`Error starting web download: ${error.message}`);
                startWebDownloadBtn.disabled = false;
                startWebDownloadBtn.textContent = originalButtonText;
            }
        });
    }
    
    // --- Event Listener for Save UI Logs Button ---
    const saveUiLogsBtn = document.getElementById('saveUiLogsBtn');
    // logArea is already defined as const logArea = document.getElementById('logArea');

    if (saveUiLogsBtn && logArea && window.electronAPI && typeof window.electronAPI.saveUiLogs === 'function') {
        saveUiLogsBtn.addEventListener('click', async () => {
            const logContent = logArea.textContent; // Or innerText for better line break handling by some systems
            if (!logContent.trim()) {
                alert('There are no logs to save.');
                return;
            }

            logMessage('Attempting to save UI logs...'); 
            try {
                saveUiLogsBtn.disabled = true;
                saveUiLogsBtn.textContent = 'Saving Logs...';
                const result = await window.electronAPI.saveUiLogs(logContent);
                if (result.success) {
                    logMessage(`UI logs save result: ${result.message}`); // Log to UI
                    alert(`UI logs saved successfully: ${result.message}`);
                } else {
                    logMessage(`Failed to save UI logs: ${result.message}`);
                    alert(`Failed to save UI logs: ${result.message || 'Operation canceled or failed.'}`);
                }
            } catch (error) {
                logMessage(`Error saving UI logs via IPC: ${error.message}`);
                alert(`Error saving UI logs: ${error.message}`);
            } finally {
                saveUiLogsBtn.disabled = false;
                saveUiLogsBtn.textContent = 'Save UI Logs';
            }
        });
    }
    // --- End of Save UI Logs Button Listener ---

    // Helper Functions for Event Listeners
    function setupLocalCrawlerEventListeners(buttonElement, originalButtonText) {
        if (window.electronAPI) {
            // Remove previous listeners to prevent duplicates
            if (window.electronAPI.removeAllLocalCrawlerListeners) {
                window.electronAPI.removeAllLocalCrawlerListeners();
            }
            if (window.electronAPI.onLocalCrawlerLog) {
                window.electronAPI.onLocalCrawlerLog((data) => {
                    logMessage(`Local Scan Progress: ${data.processed}/${data.total} files`);
                    // Update UI with progress if needed
                });
            }
            if (window.electronAPI.onLocalCrawlerComplete) {
                window.electronAPI.onLocalCrawlerComplete((data) => {
                    const summaryMessage = `Local Scan Complete: Found ${data.foundImages} images, Copied ${data.copiedImages}, Skipped ${data.skippedFiles}, Errors ${data.errorCount}.`;
                    logMessage(summaryMessage);
                    buttonElement.disabled = false;
                    buttonElement.textContent = originalButtonText;
                });
            }
            if (window.electronAPI.onLocalCrawlerError) {
                window.electronAPI.onLocalCrawlerError((error) => {
                    logMessage(`Local Scan Error: ${error.message}`);
                    buttonElement.disabled = false;
                    buttonElement.textContent = originalButtonText;
                    alert(`Local scan error: ${error.message}`);
                });
            }
        }
    }

    function setupWebCrawlerEventListeners(buttonElement, originalButtonText) {
        if (window.electronAPI) {
            // Remove previous listeners to prevent duplicates
            if (window.electronAPI.removeAllWebCrawlerListeners) {
                window.electronAPI.removeAllWebCrawlerListeners();
            }
            if (window.electronAPI.onWebCrawlerLog) {
                window.electronAPI.onWebCrawlerLog((data) => {
                    logMessage(`Web Download Progress: ${data.downloadedCount}/${data.requestedCount} files`);
                    // Update UI with progress if needed
                });
            }
            if (window.electronAPI.onWebCrawlerComplete) {
                window.electronAPI.onWebCrawlerComplete((data) => {
                    const summaryMessage = `Web Download Complete: Downloaded ${data.downloaded}, Skipped ${data.skipped}, Errors ${data.errors}.`;
                    logMessage(summaryMessage);
                    buttonElement.disabled = false;
                    buttonElement.textContent = originalButtonText;
                });
            }
            if (window.electronAPI.onWebCrawlerError) {
                window.electronAPI.onWebCrawlerError((error) => {
                    logMessage(`Web Download Error: ${error.message}`);
                    buttonElement.disabled = false;
                    buttonElement.textContent = originalButtonText;
                    alert(`Web download error: ${error.message}`);
                });
            }
        }
    }

    logMessage('UI is ready.');
});
