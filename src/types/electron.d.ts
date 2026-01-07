export interface FileSystemResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified: number;
}

export interface FileEvent {
  type: 'add' | 'change' | 'delete' | 'addDir' | 'deleteDir';
  path: string;
}

export interface DialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles'>;
}

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes?: string;
}

export interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export interface ElectronAPI {
  fs: {
    readFile: (filePath: string) => Promise<FileSystemResult<string>>;
    writeFile: (filePath: string, content: string) => Promise<FileSystemResult>;
    readDirectory: (dirPath: string) => Promise<FileSystemResult<FileEntry[]>>;
    createDirectory: (dirPath: string) => Promise<FileSystemResult>;
    deleteEntry: (entryPath: string) => Promise<FileSystemResult>;
    watchDirectory: (dirPath: string) => Promise<FileSystemResult>;
    unwatchDirectory: (dirPath: string) => Promise<FileSystemResult>;
    onFileEvent: (callback: (event: FileEvent) => void) => () => void;
  };
  dialog: {
    showOpenDialog: (options: DialogOptions) => Promise<FileSystemResult<any>>;
    showSaveDialog: (options: DialogOptions) => Promise<FileSystemResult<any>>;
  };
  window: {
    minimize: () => Promise<FileSystemResult>;
    maximize: () => Promise<FileSystemResult>;
    close: () => Promise<FileSystemResult>;
    isMaximized: () => Promise<FileSystemResult<boolean>>;
  };
  updater: {
    checkForUpdates: () => Promise<FileSystemResult>;
    downloadUpdate: () => Promise<FileSystemResult>;
    installUpdate: () => Promise<FileSystemResult>;
    onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
    onDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void;
    onUpdateDownloaded: (callback: () => void) => () => void;
  };
  notification: {
    show: (options: { title: string; body: string }) => Promise<FileSystemResult>;
  };
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {};
