/**
 * Vitest test setup for Electron main process tests
 * This file runs before each Electron test file
 */

import { vi, beforeEach, afterEach } from 'vitest';

// Mock Electron modules
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => `/mock/path/${name}`),
    getVersion: vi.fn(() => '1.0.0'),
    getName: vi.fn(() => 'Polaris IDE'),
    isPackaged: false,
    quit: vi.fn(),
    relaunch: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    whenReady: vi.fn().mockResolvedValue(undefined),
    requestSingleInstanceLock: vi.fn(() => true),
    setAsDefaultProtocolClient: vi.fn(() => true),
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadURL: vi.fn().mockResolvedValue(undefined),
    loadFile: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    once: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    close: vi.fn(),
    destroy: vi.fn(),
    focus: vi.fn(),
    blur: vi.fn(),
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    isMaximized: vi.fn(() => false),
    isMinimized: vi.fn(() => false),
    isVisible: vi.fn(() => true),
    isFocused: vi.fn(() => true),
    isDestroyed: vi.fn(() => false),
    webContents: {
      send: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      openDevTools: vi.fn(),
      closeDevTools: vi.fn(),
      executeJavaScript: vi.fn(),
      setWindowOpenHandler: vi.fn(),
    },
    getBounds: vi.fn(() => ({ x: 0, y: 0, width: 1400, height: 900 })),
    setBounds: vi.fn(),
    setTitle: vi.fn(),
    getTitle: vi.fn(() => 'Polaris IDE'),
  })),
  ipcMain: {
    handle: vi.fn(),
    handleOnce: vi.fn(),
    removeHandler: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    removeListener: vi.fn(),
    removeAllListeners: vi.fn(),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    send: vi.fn(),
    sendSync: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    removeListener: vi.fn(),
    removeAllListeners: vi.fn(),
  },
  contextBridge: {
    exposeInMainWorld: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/mock/path/file.txt'] }),
    showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: '/mock/path/save.txt' }),
    showMessageBox: vi.fn().mockResolvedValue({ response: 0 }),
    showErrorBox: vi.fn(),
  },
  shell: {
    openExternal: vi.fn().mockResolvedValue(undefined),
    openPath: vi.fn().mockResolvedValue(''),
    showItemInFolder: vi.fn(),
  },
  Notification: vi.fn().mockImplementation(() => ({
    show: vi.fn(),
    on: vi.fn(),
    close: vi.fn(),
  })),
  Menu: {
    buildFromTemplate: vi.fn(() => ({})),
    setApplicationMenu: vi.fn(),
  },
  Tray: vi.fn().mockImplementation(() => ({
    setToolTip: vi.fn(),
    setContextMenu: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn(),
  })),
  nativeTheme: {
    themeSource: 'system',
    shouldUseDarkColors: true,
    on: vi.fn(),
  },
  protocol: {
    registerSchemesAsPrivileged: vi.fn(),
    registerFileProtocol: vi.fn(),
    registerHttpProtocol: vi.fn(),
  },
  powerMonitor: {
    on: vi.fn(),
    getSystemIdleState: vi.fn(() => 'active'),
    getSystemIdleTime: vi.fn(() => 0),
  },
  screen: {
    getPrimaryDisplay: vi.fn(() => ({
      workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      scaleFactor: 1,
    })),
    getAllDisplays: vi.fn(() => []),
  },
}));

// Mock electron-updater
vi.mock('electron-updater', () => ({
  autoUpdater: {
    logger: null,
    autoDownload: true,
    autoInstallOnAppQuit: true,
    checkForUpdates: vi.fn().mockResolvedValue(null),
    checkForUpdatesAndNotify: vi.fn().mockResolvedValue(null),
    downloadUpdate: vi.fn().mockResolvedValue([]),
    quitAndInstall: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    removeListener: vi.fn(),
    emit: vi.fn(),
  },
}));

// Mock electron-log
vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn(),
    transports: {
      file: { level: 'info' },
      console: { level: 'info' },
    },
  },
}));

// Mock electron-store
vi.mock('electron-store', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn((key: string, defaultValue?: unknown) => defaultValue),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    has: vi.fn(() => false),
    store: {},
  })),
}));

// Mock get-port
vi.mock('get-port', () => ({
  default: vi.fn().mockResolvedValue(3000),
}));

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    stdout: {
      on: vi.fn(),
      pipe: vi.fn(),
    },
    stderr: {
      on: vi.fn(),
      pipe: vi.fn(),
    },
    on: vi.fn(),
    kill: vi.fn(),
    killed: false,
    pid: 12345,
  })),
  exec: vi.fn(),
  execSync: vi.fn(),
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('file content'),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readdir: vi.fn().mockResolvedValue([]),
  mkdir: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({
    isDirectory: () => false,
    isFile: () => true,
    size: 1024,
    mtimeMs: Date.now(),
  }),
  access: vi.fn().mockResolvedValue(undefined),
  copyFile: vi.fn().mockResolvedValue(undefined),
  rename: vi.fn().mockResolvedValue(undefined),
}));

// Mock chokidar
vi.mock('chokidar', () => ({
  watch: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    close: vi.fn().mockResolvedValue(undefined),
    add: vi.fn(),
    unwatch: vi.fn(),
  })),
}));

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Clean up after each test
afterEach(() => {
  vi.restoreAllMocks();
});

// Add custom test utilities
declare global {
  var electronTestUtils: {
    createMockEvent: () => Electron.IpcMainInvokeEvent;
    createMockWindow: () => Electron.BrowserWindow;
  };
}

global.electronTestUtils = {
  createMockEvent: () => ({
    sender: {
      send: vi.fn(),
      id: 1,
    },
    senderFrame: null,
    processId: 1,
    frameId: 1,
  } as unknown as Electron.IpcMainInvokeEvent),

  createMockWindow: () => {
    const { BrowserWindow } = require('electron');
    return new BrowserWindow();
  },
};
