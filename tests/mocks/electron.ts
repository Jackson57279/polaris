/**
 * Mock Electron APIs for renderer process (browser) tests
 * These mocks simulate the window.electron API exposed by the preload script
 */

import { vi } from 'vitest';

export interface MockFileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  lastModified: number;
}

export interface MockElectronAPI {
  fs: {
    readFile: ReturnType<typeof vi.fn>;
    writeFile: ReturnType<typeof vi.fn>;
    readDirectory: ReturnType<typeof vi.fn>;
    createDirectory: ReturnType<typeof vi.fn>;
    deleteEntry: ReturnType<typeof vi.fn>;
    watchDirectory: ReturnType<typeof vi.fn>;
    unwatchDirectory: ReturnType<typeof vi.fn>;
    onFileAdded: ReturnType<typeof vi.fn>;
    onFileChanged: ReturnType<typeof vi.fn>;
    onFileDeleted: ReturnType<typeof vi.fn>;
    onDirectoryAdded: ReturnType<typeof vi.fn>;
    onDirectoryDeleted: ReturnType<typeof vi.fn>;
  };
  dialog: {
    showOpenDialog: ReturnType<typeof vi.fn>;
    showSaveDialog: ReturnType<typeof vi.fn>;
  };
  notification: {
    show: ReturnType<typeof vi.fn>;
  };
  window: {
    minimize: ReturnType<typeof vi.fn>;
    maximize: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    isMaximized: ReturnType<typeof vi.fn>;
  };
  app: {
    getVersion: ReturnType<typeof vi.fn>;
    quit: ReturnType<typeof vi.fn>;
    relaunch: ReturnType<typeof vi.fn>;
  };
  updater: {
    checkForUpdates: ReturnType<typeof vi.fn>;
    downloadUpdate: ReturnType<typeof vi.fn>;
    installUpdate: ReturnType<typeof vi.fn>;
    onUpdateAvailable: ReturnType<typeof vi.fn>;
    onDownloadProgress: ReturnType<typeof vi.fn>;
    onUpdateDownloaded: ReturnType<typeof vi.fn>;
    onUpdateError: ReturnType<typeof vi.fn>;
  };
  shell: {
    openExternal: ReturnType<typeof vi.fn>;
    openPath: ReturnType<typeof vi.fn>;
    showItemInFolder: ReturnType<typeof vi.fn>;
  };
}

/**
 * Create a fresh mock of the Electron API
 * Call this in beforeEach to get clean mocks for each test
 */
export function createMockElectronAPI(): MockElectronAPI {
  return {
    fs: {
      readFile: vi.fn().mockResolvedValue({ success: true, data: 'file content' }),
      writeFile: vi.fn().mockResolvedValue({ success: true }),
      readDirectory: vi.fn().mockResolvedValue({
        success: true,
        data: [
          { name: 'file.txt', path: '/path/file.txt', isDirectory: false, isFile: true, size: 100, lastModified: Date.now() },
          { name: 'folder', path: '/path/folder', isDirectory: true, isFile: false, size: 0, lastModified: Date.now() },
        ],
      }),
      createDirectory: vi.fn().mockResolvedValue({ success: true }),
      deleteEntry: vi.fn().mockResolvedValue({ success: true }),
      watchDirectory: vi.fn().mockResolvedValue({ success: true }),
      unwatchDirectory: vi.fn().mockResolvedValue({ success: true }),
      onFileAdded: vi.fn(),
      onFileChanged: vi.fn(),
      onFileDeleted: vi.fn(),
      onDirectoryAdded: vi.fn(),
      onDirectoryDeleted: vi.fn(),
    },
    dialog: {
      showOpenDialog: vi.fn().mockResolvedValue({
        canceled: false,
        filePaths: ['/selected/path/file.txt'],
      }),
      showSaveDialog: vi.fn().mockResolvedValue({
        canceled: false,
        filePath: '/selected/path/save.txt',
      }),
    },
    notification: {
      show: vi.fn().mockResolvedValue(undefined),
    },
    window: {
      minimize: vi.fn().mockResolvedValue(undefined),
      maximize: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      isMaximized: vi.fn().mockResolvedValue(false),
    },
    app: {
      getVersion: vi.fn().mockResolvedValue('1.0.0'),
      quit: vi.fn().mockResolvedValue(undefined),
      relaunch: vi.fn().mockResolvedValue(undefined),
    },
    updater: {
      checkForUpdates: vi.fn().mockResolvedValue({
        updateInfo: { version: '1.0.1' },
        cancellationToken: {},
      }),
      downloadUpdate: vi.fn().mockResolvedValue(['/path/to/update']),
      installUpdate: vi.fn().mockResolvedValue(undefined),
      onUpdateAvailable: vi.fn(),
      onDownloadProgress: vi.fn(),
      onUpdateDownloaded: vi.fn(),
      onUpdateError: vi.fn(),
    },
    shell: {
      openExternal: vi.fn().mockResolvedValue(undefined),
      openPath: vi.fn().mockResolvedValue(''),
      showItemInFolder: vi.fn(),
    },
  };
}

// Default mock instance
export const mockElectronAPI = createMockElectronAPI();

/**
 * Install mock Electron API on the window object
 * Call this in test setup to make window.electron available
 */
export function installMockElectronAPI(customMock?: Partial<MockElectronAPI>): void {
  const api = customMock ? { ...mockElectronAPI, ...customMock } : mockElectronAPI;

  Object.defineProperty(global, 'window', {
    value: {
      ...global.window,
      electron: api,
    },
    writable: true,
  });
}

/**
 * Remove mock Electron API from window object
 * Call this to simulate browser environment
 */
export function removeMockElectronAPI(): void {
  if (typeof global.window !== 'undefined') {
    // @ts-expect-error - intentionally deleting for test
    delete global.window.electron;
  }
}

/**
 * Create a mock file system with predefined structure
 */
export function createMockFileSystem(files: Record<string, string>): void {
  mockElectronAPI.fs.readFile.mockImplementation(async (path: string) => {
    if (path in files) {
      return { success: true, data: files[path] };
    }
    return { success: false, error: 'ENOENT: no such file or directory' };
  });

  mockElectronAPI.fs.writeFile.mockImplementation(async (path: string, content: string) => {
    files[path] = content;
    return { success: true };
  });
}

/**
 * Simulate file system events
 */
export const fileSystemEvents = {
  triggerFileAdded: (path: string) => {
    const callbacks = mockElectronAPI.fs.onFileAdded.mock.calls;
    callbacks.forEach(([callback]) => callback(path));
  },

  triggerFileChanged: (path: string) => {
    const callbacks = mockElectronAPI.fs.onFileChanged.mock.calls;
    callbacks.forEach(([callback]) => callback(path));
  },

  triggerFileDeleted: (path: string) => {
    const callbacks = mockElectronAPI.fs.onFileDeleted.mock.calls;
    callbacks.forEach(([callback]) => callback(path));
  },
};

/**
 * Simulate auto-updater events
 */
export const updaterEvents = {
  triggerUpdateAvailable: (info: { version: string }) => {
    const callbacks = mockElectronAPI.updater.onUpdateAvailable.mock.calls;
    callbacks.forEach(([callback]) => callback(info));
  },

  triggerDownloadProgress: (progress: { percent: number; bytesPerSecond: number; total: number; transferred: number }) => {
    const callbacks = mockElectronAPI.updater.onDownloadProgress.mock.calls;
    callbacks.forEach(([callback]) => callback(progress));
  },

  triggerUpdateDownloaded: (info: { version: string }) => {
    const callbacks = mockElectronAPI.updater.onUpdateDownloaded.mock.calls;
    callbacks.forEach(([callback]) => callback(info));
  },

  triggerUpdateError: (error: Error) => {
    const callbacks = mockElectronAPI.updater.onUpdateError.mock.calls;
    callbacks.forEach(([callback]) => callback(error));
  },
};
