/**
 * IPC Client
 *
 * Type-safe client for communicating with the Electron main process.
 * Provides wrappers for common IPC operations with proper error handling.
 */

import { isElectron } from './environment';

/**
 * Determine whether the Electron IPC API is available.
 *
 * @returns `true` if running in Electron and `window.electron` is present, `false` otherwise.
 */
export function isIpcAvailable(): boolean {
  return isElectron() && typeof window !== 'undefined' && window.electron !== undefined;
}

/**
 * Retrieve the Electron API object exposed on `window.electron`.
 *
 * @returns The Electron API object available on `window.electron`
 * @throws Error if the Electron API is not available
 */
export function getElectronApi() {
  if (!isIpcAvailable()) {
    throw new Error('Electron API is not available');
  }
  return window.electron;
}

/**
 * Invokes an IPC call and returns its `data` payload, or `null` when IPC is unavailable or the call fails.
 *
 * @param fn - A function that performs the IPC call and resolves to an object with `success`, optional `data`, and optional `error` fields.
 * @returns `T` containing the successful call's `data` field, or `null` if IPC is unavailable, the call reported failure, or an error occurred during invocation.
 */
export async function safeInvoke<T>(
  fn: () => Promise<{ success: boolean; data?: T; error?: string }>
): Promise<T | null> {
  if (!isIpcAvailable()) {
    return null;
  }

  try {
    const result = await fn();
    if (result.success && result.data !== undefined) {
      return result.data;
    }
    if (!result.success && result.error) {
      console.error('IPC error:', result.error);
    }
    return null;
  } catch (error) {
    console.error('IPC invoke error:', error);
    return null;
  }
}

/**
 * Window Controls API
 */
export const windowControls = {
  minimize: async () => {
    if (!isIpcAvailable()) return;
    await window.electron.window.minimize();
  },

  maximize: async () => {
    if (!isIpcAvailable()) return;
    await window.electron.window.maximize();
  },

  close: async () => {
    if (!isIpcAvailable()) return;
    await window.electron.window.close();
  },

  toggleFullscreen: async () => {
    if (!isIpcAvailable()) return;
    await window.electron.window.toggleFullscreen();
  },

  isMaximized: async (): Promise<boolean> => {
    if (!isIpcAvailable()) return false;
    const result = await window.electron.window.isMaximized();
    return result.data ?? false;
  },

  setTitle: async (title: string) => {
    if (!isIpcAvailable()) {
      document.title = title;
      return;
    }
    await window.electron.window.setTitle(title);
  },
};

/**
 * App Info API
 */
export const appInfo = {
  getVersion: async (): Promise<string | null> => {
    return safeInvoke(() => window.electron.app.getVersion());
  },

  getName: async (): Promise<string | null> => {
    return safeInvoke(() => window.electron.app.getName());
  },

  getPlatformInfo: async () => {
    return safeInvoke(() => window.electron.app.getPlatformInfo());
  },

  isPackaged: async (): Promise<boolean> => {
    if (!isIpcAvailable()) return false;
    const result = await window.electron.app.isPackaged();
    return result.data ?? false;
  },

  isDevelopment: async (): Promise<boolean> => {
    if (!isIpcAvailable()) return process.env.NODE_ENV === 'development';
    const result = await window.electron.app.isDevelopment();
    return result.data ?? false;
  },
};

/**
 * Notifications API
 */
export const notifications = {
  show: async (title: string, body?: string): Promise<boolean> => {
    if (!isIpcAvailable()) {
      // Fallback to browser notifications
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
        return true;
      }
      return false;
    }

    const result = await window.electron.notification.simple(title, body);
    return result.success;
  },

  requestPermission: async (): Promise<'granted' | 'denied' | 'default'> => {
    if (!isIpcAvailable()) {
      if ('Notification' in window) {
        return Notification.requestPermission();
      }
      return 'denied';
    }

    const result = await window.electron.notification.requestPermission();
    return result.data ?? 'denied';
  },
};

/**
 * Shell API
 */
export const shell = {
  openExternal: async (url: string): Promise<boolean> => {
    if (!isIpcAvailable()) {
      window.open(url, '_blank');
      return true;
    }

    const result = await window.electron.shell.openExternal(url);
    return result.success;
  },

  showItemInFolder: async (path: string): Promise<boolean> => {
    if (!isIpcAvailable()) return false;

    const result = await window.electron.shell.showItemInFolder(path);
    return result.success;
  },
};

/**
 * Auto-updater API
 */
export const updater = {
  checkForUpdates: async () => {
    if (!isIpcAvailable()) return null;
    return safeInvoke(() => window.electron.updater.checkForUpdates());
  },

  downloadUpdate: async (): Promise<boolean> => {
    if (!isIpcAvailable()) return false;

    const result = await window.electron.updater.downloadUpdate();
    return result.success;
  },

  installUpdate: async () => {
    if (!isIpcAvailable()) return;
    await window.electron.updater.installUpdate();
  },

  getCurrentVersion: async (): Promise<string | null> => {
    return safeInvoke(() => window.electron.updater.getCurrentVersion());
  },

  // Event subscriptions
  onUpdateAvailable: (callback: (info: { version: string }) => void) => {
    if (!isIpcAvailable()) return () => {};
    return window.electron.updater.onUpdateAvailable(callback);
  },

  onDownloadProgress: (callback: (progress: { percent: number }) => void) => {
    if (!isIpcAvailable()) return () => {};
    return window.electron.updater.onDownloadProgress(callback);
  },

  onUpdateDownloaded: (callback: (info: { version: string }) => void) => {
    if (!isIpcAvailable()) return () => {};
    return window.electron.updater.onUpdateDownloaded(callback);
  },

  onError: (callback: (error: { message: string }) => void) => {
    if (!isIpcAvailable()) return () => {};
    return window.electron.updater.onError(callback);
  },
};

/**
 * Menu event subscriptions
 */
export const menuEvents = {
  onNewProject: (callback: () => void) => {
    if (!isIpcAvailable()) return () => {};
    return window.electron.menu.onNewProject(callback);
  },

  onOpenProject: (callback: () => void) => {
    if (!isIpcAvailable()) return () => {};
    return window.electron.menu.onOpenProject(callback);
  },

  onNewFile: (callback: () => void) => {
    if (!isIpcAvailable()) return () => {};
    return window.electron.menu.onNewFile(callback);
  },

  onSave: (callback: () => void) => {
    if (!isIpcAvailable()) return () => {};
    return window.electron.menu.onSave(callback);
  },

  onSaveAll: (callback: () => void) => {
    if (!isIpcAvailable()) return () => {};
    return window.electron.menu.onSaveAll(callback);
  },

  onFind: (callback: () => void) => {
    if (!isIpcAvailable()) return () => {};
    return window.electron.menu.onFind(callback);
  },

  onReplace: (callback: () => void) => {
    if (!isIpcAvailable()) return () => {};
    return window.electron.menu.onReplace(callback);
  },

  onToggleFileExplorer: (callback: () => void) => {
    if (!isIpcAvailable()) return () => {};
    return window.electron.menu.onToggleFileExplorer(callback);
  },

  onToggleTerminal: (callback: () => void) => {
    if (!isIpcAvailable()) return () => {};
    return window.electron.menu.onToggleTerminal(callback);
  },

  onTogglePreview: (callback: () => void) => {
    if (!isIpcAvailable()) return () => {};
    return window.electron.menu.onTogglePreview(callback);
  },

  onToggleAIChat: (callback: () => void) => {
    if (!isIpcAvailable()) return () => {};
    return window.electron.menu.onToggleAIChat(callback);
  },

  onPreferences: (callback: () => void) => {
    if (!isIpcAvailable()) return () => {};
    return window.electron.menu.onPreferences(callback);
  },

  onCheckForUpdates: (callback: () => void) => {
    if (!isIpcAvailable()) return () => {};
    return window.electron.menu.onCheckForUpdates(callback);
  },

  onAbout: (callback: () => void) => {
    if (!isIpcAvailable()) return () => {};
    return window.electron.menu.onAbout(callback);
  },
};

/**
 * Protocol event subscriptions
 */
export const protocolEvents = {
  onOpenProject: (callback: (projectId: string) => void) => {
    if (!isIpcAvailable()) return () => {};
    return window.electron.protocol.onOpenProject(callback);
  },

  onImportGitHub: (callback: (repo: string) => void) => {
    if (!isIpcAvailable()) return () => {};
    return window.electron.protocol.onImportGitHub(callback);
  },

  onNewProject: (callback: () => void) => {
    if (!isIpcAvailable()) return () => {};
    return window.electron.protocol.onNewProject(callback);
  },

  onAuthCallback: (callback: (token: string) => void) => {
    if (!isIpcAvailable()) return () => {};
    return window.electron.protocol.onAuthCallback(callback);
  },
};