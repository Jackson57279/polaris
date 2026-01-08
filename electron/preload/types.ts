/**
 * TypeScript Definitions for Electron API
 *
 * These types define the shape of the window.electron API
 * exposed by the preload script to the renderer process.
 */

// Generic IPC response type
export interface IpcResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// File system entry type
export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  isSymbolicLink: boolean;
  size: number;
  lastModified: number;
}

// File stat type
export interface FileStat {
  isFile: boolean;
  isDirectory: boolean;
  isSymbolicLink: boolean;
  size: number;
  createdAt: number;
  modifiedAt: number;
  accessedAt: number;
}

// Window bounds type
export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Window state type
export interface WindowState {
  isMaximized: boolean;
  isMinimized: boolean;
  isFullscreen: boolean;
  isFocused: boolean;
  isVisible: boolean;
  bounds: WindowBounds;
}

// Platform info type
export interface PlatformInfo {
  platform: NodeJS.Platform;
  arch: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
}

// App paths type
export interface AppPaths {
  userData: string;
  home: string;
  temp: string;
  documents: string;
  downloads: string;
  desktop: string;
  exe: string;
  appData: string;
}

// Update info type
export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string | null;
}

// Download progress type
export interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

// Notification options type
export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  silent?: boolean;
  urgency?: 'normal' | 'critical' | 'low';
  actions?: Array<{ type: 'button'; text: string }>;
  closeButtonText?: string;
  timeoutType?: 'default' | 'never';
}

// Dialog filter type
export interface DialogFilter {
  name: string;
  extensions: string[];
}

// Open dialog options
export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: DialogFilter[];
  properties?: Array<
    | 'openFile'
    | 'openDirectory'
    | 'multiSelections'
    | 'showHiddenFiles'
    | 'createDirectory'
    | 'promptToCreate'
    | 'noResolveAliases'
    | 'treatPackageAsDirectory'
  >;
  message?: string;
}

// Save dialog options
export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: DialogFilter[];
  message?: string;
  nameFieldLabel?: string;
  showsTagField?: boolean;
}

// Message box options
export interface MessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning';
  buttons?: string[];
  defaultId?: number;
  title?: string;
  message: string;
  detail?: string;
  checkboxLabel?: string;
  checkboxChecked?: boolean;
  cancelId?: number;
  noLink?: boolean;
}

// Event listener return type (unsubscribe function)
export type UnsubscribeFunction = () => void;

// Event listener type
export type EventListener<T = unknown> = (callback: (data: T) => void) => UnsubscribeFunction;

/**
 * The complete Electron API interface
 */
export interface ElectronAPI {
  // File system operations
  fs: {
    readFile: (filePath: string, encoding?: BufferEncoding) => Promise<IpcResponse<string>>;
    readFileBinary: (filePath: string) => Promise<IpcResponse<string>>;
    writeFile: (filePath: string, content: string, encoding?: BufferEncoding) => Promise<IpcResponse>;
    writeFileBinary: (filePath: string, base64Content: string) => Promise<IpcResponse>;
    readDirectory: (dirPath: string) => Promise<IpcResponse<FileEntry[]>>;
    createDirectory: (dirPath: string) => Promise<IpcResponse>;
    deleteEntry: (entryPath: string) => Promise<IpcResponse>;
    rename: (oldPath: string, newPath: string) => Promise<IpcResponse>;
    copyFile: (srcPath: string, destPath: string) => Promise<IpcResponse>;
    exists: (entryPath: string) => Promise<IpcResponse<boolean>>;
    stat: (entryPath: string) => Promise<IpcResponse<FileStat>>;
    watchDirectory: (dirPath: string) => Promise<IpcResponse>;
    unwatchDirectory: (dirPath: string) => Promise<IpcResponse>;

    // File system events
    onFileAdded: EventListener<{ path: string; directory: string }>;
    onFileChanged: EventListener<{ path: string; directory: string }>;
    onFileDeleted: EventListener<{ path: string; directory: string }>;
    onDirectoryAdded: EventListener<{ path: string; directory: string }>;
    onDirectoryDeleted: EventListener<{ path: string; directory: string }>;
    onWatchError: EventListener<{ error: string; directory: string }>;
  };

  // Dialog operations
  dialog: {
    showOpenDialog: (options: OpenDialogOptions) => Promise<IpcResponse<{ canceled: boolean; filePaths: string[] }>>;
    showSaveDialog: (options: SaveDialogOptions) => Promise<IpcResponse<{ canceled: boolean; filePath?: string }>>;
    showMessageBox: (options: MessageBoxOptions) => Promise<IpcResponse<{ response: number; checkboxChecked: boolean }>>;
    showErrorBox: (title: string, content: string) => Promise<IpcResponse>;
    openFile: (options?: {
      title?: string;
      defaultPath?: string;
      filters?: DialogFilter[];
      multiple?: boolean;
    }) => Promise<IpcResponse<{ canceled: boolean; filePaths: string[] }>>;
    openFolder: (options?: {
      title?: string;
      defaultPath?: string;
      multiple?: boolean;
    }) => Promise<IpcResponse<{ canceled: boolean; folderPaths: string[] }>>;
    saveFile: (options?: {
      title?: string;
      defaultPath?: string;
      filters?: DialogFilter[];
    }) => Promise<IpcResponse<{ canceled: boolean; filePath?: string }>>;
    confirm: (options: {
      title: string;
      message: string;
      detail?: string;
      confirmLabel?: string;
      cancelLabel?: string;
    }) => Promise<IpcResponse<{ confirmed: boolean }>>;
  };

  // Window controls
  window: {
    minimize: () => Promise<IpcResponse>;
    maximize: () => Promise<IpcResponse>;
    close: () => Promise<IpcResponse>;
    toggleFullscreen: () => Promise<IpcResponse>;
    isMaximized: () => Promise<IpcResponse<boolean>>;
    isMinimized: () => Promise<IpcResponse<boolean>>;
    isFullscreen: () => Promise<IpcResponse<boolean>>;
    isFocused: () => Promise<IpcResponse<boolean>>;
    getBounds: () => Promise<IpcResponse<WindowBounds>>;
    setBounds: (bounds: Partial<WindowBounds>) => Promise<IpcResponse>;
    getState: () => Promise<IpcResponse<WindowState>>;
    setTitle: (title: string) => Promise<IpcResponse>;
    focus: () => Promise<IpcResponse>;
    show: () => Promise<IpcResponse>;
    hide: () => Promise<IpcResponse>;

    // Window events
    onMaximized: EventListener<boolean>;
    onFullscreen: EventListener<boolean>;
    onFocus: EventListener<boolean>;
  };

  // Notification operations
  notification: {
    isSupported: () => Promise<IpcResponse<boolean>>;
    show: (options: NotificationOptions) => Promise<IpcResponse>;
    simple: (title: string, body?: string) => Promise<IpcResponse>;
    requestPermission: () => Promise<IpcResponse<'granted' | 'denied'>>;
    setBadgeCount: (count: number) => Promise<IpcResponse>;
    getBadgeCount: () => Promise<IpcResponse<number>>;

    // Notification events
    onClick: EventListener<{ title: string }>;
    onClose: EventListener<{ title: string }>;
    onAction: EventListener<{ title: string; actionIndex: number }>;
    onFailed: EventListener<{ title: string; error: string }>;
  };

  // App operations
  app: {
    getVersion: () => Promise<IpcResponse<string>>;
    getName: () => Promise<IpcResponse<string>>;
    isPackaged: () => Promise<IpcResponse<boolean>>;
    getPath: (name: string) => Promise<IpcResponse<string>>;
    getPaths: () => Promise<IpcResponse<AppPaths>>;
    quit: () => Promise<IpcResponse>;
    relaunch: () => Promise<IpcResponse>;
    getPlatformInfo: () => Promise<IpcResponse<PlatformInfo>>;
    getLocale: () => Promise<IpcResponse<string>>;
    getSystemLocale: () => Promise<IpcResponse<string>>;
    isDevelopment: () => Promise<IpcResponse<boolean>>;
    getResourcePath: (resource: string) => Promise<IpcResponse<string>>;
    getAppMetrics: () => Promise<IpcResponse<Electron.ProcessMetric[]>>;
  };

  // Shell operations
  shell: {
    openExternal: (url: string) => Promise<IpcResponse>;
    openPath: (filePath: string) => Promise<IpcResponse>;
    showItemInFolder: (filePath: string) => Promise<IpcResponse>;
    trashItem: (filePath: string) => Promise<IpcResponse>;
    beep: () => Promise<IpcResponse>;
  };

  // Auto-updater operations
  updater: {
    checkForUpdates: () => Promise<IpcResponse<UpdateInfo | null>>;
    downloadUpdate: () => Promise<IpcResponse<string[]>>;
    installUpdate: () => Promise<IpcResponse>;
    getCurrentVersion: () => Promise<IpcResponse<string>>;

    // Updater events
    onStatus: EventListener<string>;
    onUpdateAvailable: EventListener<UpdateInfo>;
    onUpToDate: EventListener<{ version: string }>;
    onDownloadProgress: EventListener<DownloadProgress>;
    onUpdateDownloaded: EventListener<UpdateInfo>;
    onError: EventListener<{ message: string; stack?: string }>;
  };

  // Menu events
  menu: {
    onNewProject: EventListener<void>;
    onOpenProject: EventListener<void>;
    onNewFile: EventListener<void>;
    onSave: EventListener<void>;
    onSaveAll: EventListener<void>;
    onImportGitHub: EventListener<void>;
    onExportGitHub: EventListener<void>;
    onFind: EventListener<void>;
    onReplace: EventListener<void>;
    onToggleFileExplorer: EventListener<void>;
    onToggleTerminal: EventListener<void>;
    onTogglePreview: EventListener<void>;
    onToggleAIChat: EventListener<void>;
    onPreferences: EventListener<void>;
    onCheckForUpdates: EventListener<void>;
    onAbout: EventListener<void>;
  };

  // Protocol events
  protocol: {
    onOpenProject: EventListener<string>;
    onImportGitHub: EventListener<string>;
    onNewProject: EventListener<void>;
    onAuthCallback: EventListener<string>;
    onUnknown: EventListener<{ action: string; params: Record<string, string> }>;
  };
}

/**
 * Augment the global Window interface
 */
declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
