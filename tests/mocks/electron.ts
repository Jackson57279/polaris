import { vi } from 'vitest';

export const mockElectronAPI = {
  fs: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readDirectory: vi.fn(),
    createDirectory: vi.fn(),
    deleteEntry: vi.fn(),
    watchDirectory: vi.fn(),
    unwatchDirectory: vi.fn(),
    onFileEvent: vi.fn()
  },
  dialog: {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn()
  },
  window: {
    minimize: vi.fn(),
    maximize: vi.fn(),
    close: vi.fn(),
    isMaximized: vi.fn()
  },
  updater: {
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    installUpdate: vi.fn(),
    onUpdateAvailable: vi.fn(),
    onDownloadProgress: vi.fn(),
    onUpdateDownloaded: vi.fn()
  },
  notification: {
    show: vi.fn()
  }
};

// Export a function to set up the mock in tests
export function setupElectronMock() {
  if (typeof window !== 'undefined') {
    (window as any).electron = mockElectronAPI;
  }
}

// Export a function to clear the mock
export function clearElectronMock() {
  if (typeof window !== 'undefined') {
    delete (window as any).electron;
  }
}
