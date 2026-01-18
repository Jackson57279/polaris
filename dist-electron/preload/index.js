"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electronAPI = {
    fs: {
        readFile: (filePath) => electron_1.ipcRenderer.invoke('fs:readFile', filePath),
        writeFile: (filePath, content) => electron_1.ipcRenderer.invoke('fs:writeFile', filePath, content),
        readDirectory: (dirPath) => electron_1.ipcRenderer.invoke('fs:readDirectory', dirPath),
        createDirectory: (dirPath) => electron_1.ipcRenderer.invoke('fs:createDirectory', dirPath),
        deleteEntry: (entryPath) => electron_1.ipcRenderer.invoke('fs:deleteEntry', entryPath),
        watchDirectory: (dirPath) => electron_1.ipcRenderer.invoke('fs:watchDirectory', dirPath),
        unwatchDirectory: (dirPath) => electron_1.ipcRenderer.invoke('fs:unwatchDirectory', dirPath),
        onFileEvent: (callback) => {
            const subscription = (_, data) => callback(data);
            electron_1.ipcRenderer.on('fs:fileEvent', subscription);
            return () => electron_1.ipcRenderer.removeListener('fs:fileEvent', subscription);
        }
    },
    dialog: {
        showOpenDialog: (options) => electron_1.ipcRenderer.invoke('dialog:showOpenDialog', options),
        showSaveDialog: (options) => electron_1.ipcRenderer.invoke('dialog:showSaveDialog', options)
    },
    window: {
        minimize: () => electron_1.ipcRenderer.invoke('window:minimize'),
        maximize: () => electron_1.ipcRenderer.invoke('window:maximize'),
        close: () => electron_1.ipcRenderer.invoke('window:close'),
        isMaximized: () => electron_1.ipcRenderer.invoke('window:isMaximized'),
        setTitle: (title) => electron_1.ipcRenderer.invoke('window:setTitle', title)
    },
    updater: {
        checkForUpdates: () => electron_1.ipcRenderer.invoke('updater:checkForUpdates'),
        downloadUpdate: () => electron_1.ipcRenderer.invoke('updater:downloadUpdate'),
        installUpdate: () => electron_1.ipcRenderer.invoke('updater:installUpdate'),
        onUpdateAvailable: (callback) => {
            const subscription = (_, info) => callback(info);
            electron_1.ipcRenderer.on('updater:updateAvailable', subscription);
            return () => electron_1.ipcRenderer.removeListener('updater:updateAvailable', subscription);
        },
        onDownloadProgress: (callback) => {
            const subscription = (_, progress) => callback(progress);
            electron_1.ipcRenderer.on('updater:downloadProgress', subscription);
            return () => electron_1.ipcRenderer.removeListener('updater:downloadProgress', subscription);
        },
        onUpdateDownloaded: (callback) => {
            const subscription = () => callback();
            electron_1.ipcRenderer.on('updater:updateDownloaded', subscription);
            return () => electron_1.ipcRenderer.removeListener('updater:updateDownloaded', subscription);
        }
    },
    notification: {
        show: (options) => electron_1.ipcRenderer.invoke('notification:show', options)
    },
    menu: {
        onNewProject: (callback) => {
            const subscription = () => callback();
            electron_1.ipcRenderer.on('menu:new-project', subscription);
            return () => electron_1.ipcRenderer.removeListener('menu:new-project', subscription);
        }
    },
    external: {
        openUrl: (url) => electron_1.ipcRenderer.invoke('external:openUrl', url)
    }
};
electron_1.contextBridge.exposeInMainWorld('electron', electronAPI);
//# sourceMappingURL=index.js.map