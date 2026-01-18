import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

const electronAPI = {
  fs: {
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
    readDirectory: (dirPath: string) => ipcRenderer.invoke('fs:readDirectory', dirPath),
    createDirectory: (dirPath: string) => ipcRenderer.invoke('fs:createDirectory', dirPath),
    deleteEntry: (entryPath: string) => ipcRenderer.invoke('fs:deleteEntry', entryPath),
    watchDirectory: (dirPath: string) => ipcRenderer.invoke('fs:watchDirectory', dirPath),
    unwatchDirectory: (dirPath: string) => ipcRenderer.invoke('fs:unwatchDirectory', dirPath),
    onFileEvent: (callback: (event: unknown) => void) => {
      const subscription = (_: IpcRendererEvent, data: unknown) => callback(data);
      ipcRenderer.on('fs:fileEvent', subscription);
      return () => ipcRenderer.removeListener('fs:fileEvent', subscription);
    }
  },
  dialog: {
    showOpenDialog: (options: unknown) => ipcRenderer.invoke('dialog:showOpenDialog', options),
    showSaveDialog: (options: unknown) => ipcRenderer.invoke('dialog:showSaveDialog', options)
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    setTitle: (title: string) => ipcRenderer.invoke('window:setTitle', title)
  },
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates'),
    downloadUpdate: () => ipcRenderer.invoke('updater:downloadUpdate'),
    installUpdate: () => ipcRenderer.invoke('updater:installUpdate'),
    onUpdateAvailable: (callback: (info: unknown) => void) => {
      const subscription = (_: IpcRendererEvent, info: unknown) => callback(info);
      ipcRenderer.on('updater:updateAvailable', subscription);
      return () => ipcRenderer.removeListener('updater:updateAvailable', subscription);
    },
    onDownloadProgress: (callback: (progress: unknown) => void) => {
      const subscription = (_: IpcRendererEvent, progress: unknown) => callback(progress);
      ipcRenderer.on('updater:downloadProgress', subscription);
      return () => ipcRenderer.removeListener('updater:downloadProgress', subscription);
    },
    onUpdateDownloaded: (callback: () => void) => {
      const subscription = () => callback();
      ipcRenderer.on('updater:updateDownloaded', subscription);
      return () => ipcRenderer.removeListener('updater:updateDownloaded', subscription);
    }
  },
  notification: {
    show: (options: { title: string; body: string }) => ipcRenderer.invoke('notification:show', options)
  },
  menu: {
    onNewProject: (callback: () => void) => {
      const subscription = () => callback();
      ipcRenderer.on('menu:new-project', subscription);
      return () => ipcRenderer.removeListener('menu:new-project', subscription);
    }
  },
  external: {
    openUrl: (url: string) => ipcRenderer.invoke('external:openUrl', url)
  }
};

contextBridge.exposeInMainWorld('electron', electronAPI);

export type ElectronAPI = typeof electronAPI;
