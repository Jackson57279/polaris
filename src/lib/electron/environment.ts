declare global {
  interface Window {
    electron?: any;
  }
}

export function isElectron(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof window.electron !== 'undefined';
}

export function isPWA(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches;
}

export function isBrowser(): boolean {
  return !isElectron() && !isPWA();
}

export type Environment = 'electron' | 'browser-pwa' | 'browser';

export function getEnvironment(): Environment {
  if (isElectron()) return 'electron';
  if (isPWA()) return 'browser-pwa';
  return 'browser';
}

export interface FeatureFlags {
  nativeFileSystem: boolean;
  webFileSystemAPI: boolean;
  autoUpdates: boolean;
  nativeNotifications: boolean;
  systemTray: boolean;
  nativeMenus: boolean;
}

export function getFeatures(): FeatureFlags {
  const env = getEnvironment();

  if (env === 'electron') {
    return {
      nativeFileSystem: true,
      webFileSystemAPI: false,
      autoUpdates: true,
      nativeNotifications: true,
      systemTray: true,
      nativeMenus: true
    };
  }

  return {
    nativeFileSystem: false,
    webFileSystemAPI: 'showDirectoryPicker' in window,
    autoUpdates: false,
    nativeNotifications: 'Notification' in window,
    systemTray: false,
    nativeMenus: false
  };
}
