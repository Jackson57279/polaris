/**
 * Preload Script
 *
 * This script runs in the renderer process before the web content loads.
 * It provides a secure bridge between the renderer (web) and main (Node.js) processes.
 *
 * Security: Uses contextBridge to expose only specific APIs to the renderer.
 * The renderer cannot access Node.js or Electron APIs directly.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from './types';

/**
 * Create type-safe IPC invoke wrapper
 */
function createInvokeHandler<T>(channel: string) {
  return (...args: unknown[]): Promise<T> => ipcRenderer.invoke(channel, ...args);
}

/**
 * Create event listener wrapper
 */
function createEventListener<T = unknown>(channel: string) {
  return (callback: (data: T) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, data: T) => callback(data);
    ipcRenderer.on(channel, subscription);

    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  };
}

/**
 * The Electron API exposed to the renderer process
 */
const electronAPI: ElectronAPI = {
  // File system operations
  fs: {
    readFile: (filePath: string, encoding?: BufferEncoding) =>
      ipcRenderer.invoke('fs:readFile', filePath, encoding),
    readFileBinary: (filePath: string) =>
      ipcRenderer.invoke('fs:readFileBinary', filePath),
    writeFile: (filePath: string, content: string, encoding?: BufferEncoding) =>
      ipcRenderer.invoke('fs:writeFile', filePath, content, encoding),
    writeFileBinary: (filePath: string, base64Content: string) =>
      ipcRenderer.invoke('fs:writeFileBinary', filePath, base64Content),
    readDirectory: (dirPath: string) =>
      ipcRenderer.invoke('fs:readDirectory', dirPath),
    createDirectory: (dirPath: string) =>
      ipcRenderer.invoke('fs:createDirectory', dirPath),
    deleteEntry: (entryPath: string) =>
      ipcRenderer.invoke('fs:deleteEntry', entryPath),
    rename: (oldPath: string, newPath: string) =>
      ipcRenderer.invoke('fs:rename', oldPath, newPath),
    copyFile: (srcPath: string, destPath: string) =>
      ipcRenderer.invoke('fs:copyFile', srcPath, destPath),
    exists: (entryPath: string) =>
      ipcRenderer.invoke('fs:exists', entryPath),
    stat: (entryPath: string) =>
      ipcRenderer.invoke('fs:stat', entryPath),
    watchDirectory: (dirPath: string) =>
      ipcRenderer.invoke('fs:watchDirectory', dirPath),
    unwatchDirectory: (dirPath: string) =>
      ipcRenderer.invoke('fs:unwatchDirectory', dirPath),

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
    showOpenDialog: (options) =>
      ipcRenderer.invoke('dialog:showOpenDialog', options),
    showSaveDialog: (options) =>
      ipcRenderer.invoke('dialog:showSaveDialog', options),
    showMessageBox: (options) =>
      ipcRenderer.invoke('dialog:showMessageBox', options),
    showErrorBox: (title: string, content: string) =>
      ipcRenderer.invoke('dialog:showErrorBox', title, content),
    openFile: (options) =>
      ipcRenderer.invoke('dialog:openFile', options),
    openFolder: (options) =>
      ipcRenderer.invoke('dialog:openFolder', options),
    saveFile: (options) =>
      ipcRenderer.invoke('dialog:saveFile', options),
    confirm: (options) =>
      ipcRenderer.invoke('dialog:confirm', options),
  },

  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    isMinimized: () => ipcRenderer.invoke('window:isMinimized'),
    isFullscreen: () => ipcRenderer.invoke('window:isFullscreen'),
    isFocused: () => ipcRenderer.invoke('window:isFocused'),
    getBounds: () => ipcRenderer.invoke('window:getBounds'),
    setBounds: (bounds) => ipcRenderer.invoke('window:setBounds', bounds),
    getState: () => ipcRenderer.invoke('window:getState'),
    setTitle: (title: string) => ipcRenderer.invoke('window:setTitle', title),
    focus: () => ipcRenderer.invoke('window:focus'),
    show: () => ipcRenderer.invoke('window:show'),
    hide: () => ipcRenderer.invoke('window:hide'),

    // Window events
    onMaximized: createEventListener('window-maximized'),
    onFullscreen: createEventListener('window-fullscreen'),
    onFocus: createEventListener('window-focus'),
  },

  // Notification operations
  notification: {
    isSupported: () => ipcRenderer.invoke('notification:isSupported'),
    show: (options) => ipcRenderer.invoke('notification:show', options),
    simple: (title: string, body?: string) =>
      ipcRenderer.invoke('notification:simple', title, body),
    requestPermission: () => ipcRenderer.invoke('notification:requestPermission'),
    setBadgeCount: (count: number) =>
      ipcRenderer.invoke('notification:setBadgeCount', count),
    getBadgeCount: () => ipcRenderer.invoke('notification:getBadgeCount'),

    // Notification events
    onClick: createEventListener('notification:click'),
    onClose: createEventListener('notification:close'),
    onAction: createEventListener('notification:action'),
    onFailed: createEventListener('notification:failed'),
  },

  // App operations
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getName: () => ipcRenderer.invoke('app:getName'),
    isPackaged: () => ipcRenderer.invoke('app:isPackaged'),
    getPath: (name) => ipcRenderer.invoke('app:getPath', name),
    getPaths: () => ipcRenderer.invoke('app:getPaths'),
    quit: () => ipcRenderer.invoke('app:quit'),
    relaunch: () => ipcRenderer.invoke('app:relaunch'),
    getPlatformInfo: () => ipcRenderer.invoke('app:getPlatformInfo'),
    getLocale: () => ipcRenderer.invoke('app:getLocale'),
    getSystemLocale: () => ipcRenderer.invoke('app:getSystemLocale'),
    isDevelopment: () => ipcRenderer.invoke('app:isDevelopment'),
    getResourcePath: (resource: string) =>
      ipcRenderer.invoke('app:getResourcePath', resource),
    getAppMetrics: () => ipcRenderer.invoke('app:getAppMetrics'),
  },

  // Shell operations
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
    openPath: (filePath: string) => ipcRenderer.invoke('shell:openPath', filePath),
    showItemInFolder: (filePath: string) =>
      ipcRenderer.invoke('shell:showItemInFolder', filePath),
    trashItem: (filePath: string) => ipcRenderer.invoke('shell:trashItem', filePath),
    beep: () => ipcRenderer.invoke('shell:beep'),
  },

  // Auto-updater operations
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates'),
    downloadUpdate: () => ipcRenderer.invoke('updater:downloadUpdate'),
    installUpdate: () => ipcRenderer.invoke('updater:installUpdate'),
    getCurrentVersion: () => ipcRenderer.invoke('updater:getCurrentVersion'),

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
contextBridge.exposeInMainWorld('electron', electronAPI);

// Log that preload script has loaded
console.log('Polaris IDE: Electron preload script loaded');
