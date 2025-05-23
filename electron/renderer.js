// Basic UI logic for showing/hiding mode-specific options

document.addEventListener('DOMContentLoaded', async () => {
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    const localOptions = document.getElementById('localOptions');
    const webOptions = document.getElementById('webOptions');
    const actionButton = document.getElementById('actionButton');
    const stopButton = document.getElementById('stopButton');

    let currentOperation = null; // To track what's running: 'local' or 'web'

    function updateVisibleOptions() {
        const selectedMode = document.querySelector('input[name="mode"]:checked').value;
        if (selectedMode === 'local') {
            localOptions.classList.add('active');
            webOptions.classList.remove('active');
            if (actionButton && !stopButton.disabled) { // Only change text if no operation is running
                actionButton.textContent = 'Start Local Scan';
            }
        } else if (selectedMode === 'web') {
            localOptions.classList.remove('active');
            webOptions.classList.add('active');
            if (actionButton && !stopButton.disabled) { // Only change text if no operation is running
                actionButton.textContent = 'Start Web Download';
            }
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

    // --- Dark Mode Toggle Implementation ---
    const themeToggle = document.getElementById('themeToggle');
    const lightIcon = document.getElementById('lightIcon');
    const darkIcon = document.getElementById('darkIcon');

    function updateThemeIcons(theme) {
        if (theme === 'dark') {
            lightIcon.style.display = 'none';
            darkIcon.style.display = 'inline';
        } else {
            lightIcon.style.display = 'inline';
            darkIcon.style.display = 'none';
        }
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcons(newTheme);
        
        logMessage(`Theme switched to ${newTheme} mode`);
    }

    // Initialize theme icons based on current theme
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    updateThemeIcons(currentTheme);

    // Add event listener for theme toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Listen for system theme changes
    if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            // Only auto-switch if user hasn't manually set a preference
            if (!localStorage.getItem('theme')) {
                const systemTheme = e.matches ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', systemTheme);
                updateThemeIcons(systemTheme);
                logMessage(`Theme auto-switched to ${systemTheme} mode (system preference)`);
            }
        });
    }

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

    // --- Event Listeners for Directory Selection (Local Mode) ---
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

    // Event listener for the unified action button
    if (actionButton && window.electronAPI) {
        actionButton.addEventListener('click', async () => {
            const selectedMode = document.querySelector('input[name="mode"]:checked').value;
            actionButton.disabled = true;
            stopButton.disabled = false;
            const originalButtonText = actionButton.textContent;
            actionButton.textContent = 'Processing...';

            if (selectedMode === 'local') {
                currentOperation = 'local';
                const sourceDir = document.getElementById('localSourceDir').value;
                const outputDir = localOutputDirInput.value;
                if (!sourceDir || !outputDir) {
                    alert('Source and Output directories are required for local scan.');
                    actionButton.disabled = false;
                    stopButton.disabled = true;
                    actionButton.textContent = originalButtonText;
                    currentOperation = null;
                    return;
                }
                const options = {
                    sourceDir,
                    outputDir,
                    minWidth: parseInt(localMinWidthInput.value) || 0,
                    minHeight: parseInt(localMinHeightInput.value) || 0,
                    minFileSize: localMinSizeInput.value || '0KB',
                    maxFiles: parseInt(localMaxFilesInput.value) || 0,
                    fileTypes: localFileTypesInput.value ? localFileTypesInput.value.split(',').map(ft => ft.trim()) : ['jpg', 'png', 'jpeg', 'gif', 'bmp'],
                    preserveStructure: localPreserveStructureCheckbox.checked
                };
                logMessage(`Starting local scan with options: ${JSON.stringify(options)}`);
                try {
                    setupLocalCrawlerEventListeners(actionButton, originalButtonText);
                    await window.electronAPI.startLocalScan(options);
                } catch (error) {
                    logMessage(`Error starting local scan: ${error.message}`);
                    actionButton.disabled = false;
                    stopButton.disabled = true;
                    actionButton.textContent = originalButtonText;
                    currentOperation = null;
                }
            } else if (selectedMode === 'web') {
                currentOperation = 'web';
                const query = document.getElementById('webQuery').value;
                const outputDir = webOutputDirInput.value;
                if (!query.trim() || !outputDir) {
                    alert('Search query and Output directory are required.');
                    actionButton.disabled = false;
                    stopButton.disabled = true;
                    actionButton.textContent = originalButtonText;
                    currentOperation = null;
                    return;
                }
                const options = {
                    query: query.trim(),
                    outputDir,
                    maxDownloads: parseInt(webMaxDownloadsInput.value) || 0,
                    minWidth: parseInt(webMinWidthInput.value) || 0,
                    minHeight: parseInt(webMinHeightInput.value) || 0,
                    minFileSize: webMinSizeInput.value || '0KB',
                    fileTypes: webFileTypesInput.value ? webFileTypesInput.value.split(',').map(ft => ft.trim()) : ['jpg', 'png'],
                    provider: webProviderSelect.value || 'all',
                    safeSearch: webSafeSearchCheckbox.checked,
                    headless: webHeadlessCheckbox.checked,
                    timeout: parseInt(webTimeoutInput.value) || 30000
                };
                logMessage(`Starting web download with options: ${JSON.stringify(options)}`);
                try {
                    setupWebCrawlerEventListeners(actionButton, originalButtonText);
                    await window.electronAPI.startWebDownload(options);
                } catch (error) {
                    logMessage(`Error starting web download: ${error.message}`);
                    actionButton.disabled = false;
                    stopButton.disabled = true;
                    actionButton.textContent = originalButtonText;
                    currentOperation = null;
                }
            }
        });
    }

    // Event listener for the stop button
    if (stopButton && window.electronAPI) {
        stopButton.addEventListener('click', async () => {
            logMessage(`Stop button clicked. Current operation: ${currentOperation}`);
            if (currentOperation === 'local') {
                logMessage('Attempting to stop local scan...');
                await window.electronAPI.stopLocalScan();
            } else if (currentOperation === 'web') {
                logMessage('Attempting to stop web download...');
                await window.electronAPI.stopWebDownload();
            }
            // State changes (disabling stop, enabling action) will be handled by completion/error events from main process
            // or if stop is immediate, can be done here too.
            // For now, let's assume completion events will reset buttons.
            // stopButton.disabled = true; // Potentially disable immediately
            // actionButton.disabled = false; // Potentially enable immediately
            // updateVisibleOptions(); // Refresh button text
        });
    }

    // --- IPC Event Handlers --- (no changes to these functions, but they now affect actionButton/stopButton)
    // Helper function to set up common event listeners for local crawler operations
    function setupLocalCrawlerEventListeners(buttonElement, originalButtonText) {
        window.electronAPI.onScanLog((level, message) => {
            logMessage(`[LOCAL SCAN - ${level.toUpperCase()}]: ${message}`);
        });
        window.electronAPI.onScanComplete((summary) => {
            logMessage(`Local scan complete: ${summary}`);
            alert(`Local scan finished!
Processed: ${summary.processed}
Copied: ${summary.copied}
Errors: ${summary.errors}`);
            buttonElement.disabled = false;
            stopButton.disabled = true;
            buttonElement.textContent = originalButtonText;
            currentOperation = null;
            updateVisibleOptions(); // Ensure button text is correct for current mode
        });
        window.electronAPI.onScanError((error) => {
            logMessage(`Local scan error: ${error}`);
            alert(`Local scan failed: ${error}`);
            buttonElement.disabled = false;
            stopButton.disabled = true;
            buttonElement.textContent = originalButtonText;
            currentOperation = null;
            updateVisibleOptions();
        });
        window.electronAPI.onScanStopped(() => {
            logMessage('Local scan has been stopped by user.');
            alert('Local scan stopped.');
            buttonElement.disabled = false;
            stopButton.disabled = true;
            buttonElement.textContent = originalButtonText;
            currentOperation = null;
            updateVisibleOptions();
        });
    }

    // Helper function to set up common event listeners for web crawler operations
    function setupWebCrawlerEventListeners(buttonElement, originalButtonText) {
        window.electronAPI.onWebLog((level, message) => {
            logMessage(`[WEB DOWNLOAD - ${level.toUpperCase()}]: ${message}`);
        });
        window.electronAPI.onWebComplete((summary) => {
            logMessage(`Web download complete: ${summary}`);
            alert(`Web download finished!
Attempted: ${summary.attempted}
Successful: ${summary.successful}
Failed: ${summary.failed}`);
            buttonElement.disabled = false;
            stopButton.disabled = true;
            buttonElement.textContent = originalButtonText;
            currentOperation = null;
            updateVisibleOptions(); // Ensure button text is correct for current mode
        });
        window.electronAPI.onWebError((error) => {
            logMessage(`Web download error: ${error}`);
            alert(`Web download failed: ${error}`);
            buttonElement.disabled = false;
            stopButton.disabled = true;
            buttonElement.textContent = originalButtonText;
            currentOperation = null;
            updateVisibleOptions();
        });
        window.electronAPI.onWebStopped(() => {
            logMessage('Web download has been stopped by user.');
            alert('Web download stopped.');
            buttonElement.disabled = false;
            stopButton.disabled = true;
            buttonElement.textContent = originalButtonText;
            currentOperation = null;
            updateVisibleOptions();
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

    logMessage('UI is ready.');
});
