"use strict";
/**
 * Preload Script
 *
 * This script runs in the renderer process before the web content loads.
 * It provides a secure bridge between the renderer (web) and main (Node.js) processes.
 *
 * Security: Uses contextBridge to expose only specific APIs to the renderer.
 * The renderer cannot access Node.js or Electron APIs directly.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
/**
 * Create type-safe IPC invoke wrapper
 */
function createInvokeHandler(channel) {
    return (...args) => electron_1.ipcRenderer.invoke(channel, ...args);
}
/**
 * Create event listener wrapper
 */
function createEventListener(channel) {
    return (callback) => {
        const subscription = (_event, data) => callback(data);
        electron_1.ipcRenderer.on(channel, subscription);
        // Return unsubscribe function
        return () => {
            electron_1.ipcRenderer.removeListener(channel, subscription);
        };
    };
}
/**
 * The Electron API exposed to the renderer process
 */
const electronAPI = {
    // File system operations
    fs: {
        readFile: (filePath, encoding) => electron_1.ipcRenderer.invoke('fs:readFile', filePath, encoding),
        readFileBinary: (filePath) => electron_1.ipcRenderer.invoke('fs:readFileBinary', filePath),
        writeFile: (filePath, content, encoding) => electron_1.ipcRenderer.invoke('fs:writeFile', filePath, content, encoding),
        writeFileBinary: (filePath, base64Content) => electron_1.ipcRenderer.invoke('fs:writeFileBinary', filePath, base64Content),
        readDirectory: (dirPath) => electron_1.ipcRenderer.invoke('fs:readDirectory', dirPath),
        createDirectory: (dirPath) => electron_1.ipcRenderer.invoke('fs:createDirectory', dirPath),
        deleteEntry: (entryPath) => electron_1.ipcRenderer.invoke('fs:deleteEntry', entryPath),
        rename: (oldPath, newPath) => electron_1.ipcRenderer.invoke('fs:rename', oldPath, newPath),
        copyFile: (srcPath, destPath) => electron_1.ipcRenderer.invoke('fs:copyFile', srcPath, destPath),
        exists: (entryPath) => electron_1.ipcRenderer.invoke('fs:exists', entryPath),
        stat: (entryPath) => electron_1.ipcRenderer.invoke('fs:stat', entryPath),
        watchDirectory: (dirPath) => electron_1.ipcRenderer.invoke('fs:watchDirectory', dirPath),
        unwatchDirectory: (dirPath) => electron_1.ipcRenderer.invoke('fs:unwatchDirectory', dirPath),
        // File system events
        onFileAdded: createEventListener('fs:fileAdded'),
        onFileChanged: createEventListener('fs:fileChanged'),
        onFileDeleted: createEventListener('fs:fileDeleted'),
        onDirectoryAdded: createEventListener('fs:directoryAdded'),
        onDirectoryDeleted: createEventListener('fs:directoryDeleted'),
        onWatchError: createEventListener('fs:watchError'),
    },
    // Dialog operations
    dialog: {
        showOpenDialog: (options) => electron_1.ipcRenderer.invoke('dialog:showOpenDialog', options),
        showSaveDialog: (options) => electron_1.ipcRenderer.invoke('dialog:showSaveDialog', options),
        showMessageBox: (options) => electron_1.ipcRenderer.invoke('dialog:showMessageBox', options),
        showErrorBox: (title, content) => electron_1.ipcRenderer.invoke('dialog:showErrorBox', title, content),
        openFile: (options) => electron_1.ipcRenderer.invoke('dialog:openFile', options),
        openFolder: (options) => electron_1.ipcRenderer.invoke('dialog:openFolder', options),
        saveFile: (options) => electron_1.ipcRenderer.invoke('dialog:saveFile', options),
        confirm: (options) => electron_1.ipcRenderer.invoke('dialog:confirm', options),
    },
    // Window controls
    window: {
        minimize: () => electron_1.ipcRenderer.invoke('window:minimize'),
        maximize: () => electron_1.ipcRenderer.invoke('window:maximize'),
        close: () => electron_1.ipcRenderer.invoke('window:close'),
        toggleFullscreen: () => electron_1.ipcRenderer.invoke('window:toggleFullscreen'),
        isMaximized: () => electron_1.ipcRenderer.invoke('window:isMaximized'),
        isMinimized: () => electron_1.ipcRenderer.invoke('window:isMinimized'),
        isFullscreen: () => electron_1.ipcRenderer.invoke('window:isFullscreen'),
        isFocused: () => electron_1.ipcRenderer.invoke('window:isFocused'),
        getBounds: () => electron_1.ipcRenderer.invoke('window:getBounds'),
        setBounds: (bounds) => electron_1.ipcRenderer.invoke('window:setBounds', bounds),
        getState: () => electron_1.ipcRenderer.invoke('window:getState'),
        setTitle: (title) => electron_1.ipcRenderer.invoke('window:setTitle', title),
        focus: () => electron_1.ipcRenderer.invoke('window:focus'),
        show: () => electron_1.ipcRenderer.invoke('window:show'),
        hide: () => electron_1.ipcRenderer.invoke('window:hide'),
        // Window events
        onMaximized: createEventListener('window-maximized'),
        onFullscreen: createEventListener('window-fullscreen'),
        onFocus: createEventListener('window-focus'),
    },
    // Notification operations
    notification: {
        isSupported: () => electron_1.ipcRenderer.invoke('notification:isSupported'),
        show: (options) => electron_1.ipcRenderer.invoke('notification:show', options),
        simple: (title, body) => electron_1.ipcRenderer.invoke('notification:simple', title, body),
        requestPermission: () => electron_1.ipcRenderer.invoke('notification:requestPermission'),
        setBadgeCount: (count) => electron_1.ipcRenderer.invoke('notification:setBadgeCount', count),
        getBadgeCount: () => electron_1.ipcRenderer.invoke('notification:getBadgeCount'),
        // Notification events
        onClick: createEventListener('notification:click'),
        onClose: createEventListener('notification:close'),
        onAction: createEventListener('notification:action'),
        onFailed: createEventListener('notification:failed'),
    },
    // App operations
    app: {
        getVersion: () => electron_1.ipcRenderer.invoke('app:getVersion'),
        getName: () => electron_1.ipcRenderer.invoke('app:getName'),
        isPackaged: () => electron_1.ipcRenderer.invoke('app:isPackaged'),
        getPath: (name) => electron_1.ipcRenderer.invoke('app:getPath', name),
        getPaths: () => electron_1.ipcRenderer.invoke('app:getPaths'),
        quit: () => electron_1.ipcRenderer.invoke('app:quit'),
        relaunch: () => electron_1.ipcRenderer.invoke('app:relaunch'),
        getPlatformInfo: () => electron_1.ipcRenderer.invoke('app:getPlatformInfo'),
        getLocale: () => electron_1.ipcRenderer.invoke('app:getLocale'),
        getSystemLocale: () => electron_1.ipcRenderer.invoke('app:getSystemLocale'),
        isDevelopment: () => electron_1.ipcRenderer.invoke('app:isDevelopment'),
        getResourcePath: (resource) => electron_1.ipcRenderer.invoke('app:getResourcePath', resource),
        getAppMetrics: () => electron_1.ipcRenderer.invoke('app:getAppMetrics'),
    },
    // Shell operations
    shell: {
        openExternal: (url) => electron_1.ipcRenderer.invoke('shell:openExternal', url),
        openPath: (filePath) => electron_1.ipcRenderer.invoke('shell:openPath', filePath),
        showItemInFolder: (filePath) => electron_1.ipcRenderer.invoke('shell:showItemInFolder', filePath),
        trashItem: (filePath) => electron_1.ipcRenderer.invoke('shell:trashItem', filePath),
        beep: () => electron_1.ipcRenderer.invoke('shell:beep'),
    },
    // Auto-updater operations
    updater: {
        checkForUpdates: () => electron_1.ipcRenderer.invoke('updater:checkForUpdates'),
        downloadUpdate: () => electron_1.ipcRenderer.invoke('updater:downloadUpdate'),
        installUpdate: () => electron_1.ipcRenderer.invoke('updater:installUpdate'),
        getCurrentVersion: () => electron_1.ipcRenderer.invoke('updater:getCurrentVersion'),
        // Updater events
        onStatus: createEventListener('updater:status'),
        onUpdateAvailable: createEventListener('updater:updateAvailable'),
        onUpToDate: createEventListener('updater:upToDate'),
        onDownloadProgress: createEventListener('updater:downloadProgress'),
        onUpdateDownloaded: createEventListener('updater:updateDownloaded'),
        onError: createEventListener('updater:error'),
    },
    // Menu events
    menu: {
        onNewProject: createEventListener('menu:newProject'),
        onOpenProject: createEventListener('menu:openProject'),
        onNewFile: createEventListener('menu:newFile'),
        onSave: createEventListener('menu:save'),
        onSaveAll: createEventListener('menu:saveAll'),
        onImportGitHub: createEventListener('menu:importGitHub'),
        onExportGitHub: createEventListener('menu:exportGitHub'),
        onFind: createEventListener('menu:find'),
        onReplace: createEventListener('menu:replace'),
        onToggleFileExplorer: createEventListener('menu:toggleFileExplorer'),
        onToggleTerminal: createEventListener('menu:toggleTerminal'),
        onTogglePreview: createEventListener('menu:togglePreview'),
        onToggleAIChat: createEventListener('menu:toggleAIChat'),
        onPreferences: createEventListener('menu:preferences'),
        onCheckForUpdates: createEventListener('menu:checkForUpdates'),
        onAbout: createEventListener('menu:about'),
    },
    // Protocol events
    protocol: {
        onOpenProject: createEventListener('protocol:openProject'),
        onImportGitHub: createEventListener('protocol:importGitHub'),
        onNewProject: createEventListener('protocol:newProject'),
        onAuthCallback: createEventListener('protocol:authCallback'),
        onUnknown: createEventListener('protocol:unknown'),
    },
};
// Expose the API to the renderer process
electron_1.contextBridge.exposeInMainWorld('electron', electronAPI);
// Log that preload script has loaded
console.log('Polaris IDE: Electron preload script loaded');
//# sourceMappingURL=index.js.map