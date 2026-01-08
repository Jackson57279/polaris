/**
 * Environment Detection
 *
 * Utilities for detecting the current runtime environment
 * Supports Electron, PWA, and browser modes
 */

/**
 * Runtime environment types
 */
export type Environment = 'electron' | 'browser-pwa' | 'browser';

/**
 * Check if code is running on the server (SSR)
 */
export function isServer(): boolean {
  return typeof window === 'undefined';
}

/**
 * Check if running in Electron environment
 */
export function isElectron(): boolean {
  if (isServer()) {
    return process.env.IS_ELECTRON === 'true';
  }

  // Check for window.electron API exposed by preload script
  return typeof window !== 'undefined' && window.electron !== undefined;
}

/**
 * Check if running as an installed PWA
 */
export function isPWA(): boolean {
  if (isServer()) {
    return false;
  }

  // Check display-mode: standalone (installed PWA)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  // iOS Safari adds navigator.standalone
  const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  return isStandalone || isIosStandalone;
}

/**
 * Check if running in a regular browser
 */
export function isBrowser(): boolean {
  const env = getEnvironment();
  return env === 'browser' || env === 'browser-pwa';
}

/**
 * Get the current runtime environment
 */
export function getEnvironment(): Environment {
  if (isServer()) {
    return process.env.IS_ELECTRON === 'true' ? 'electron' : 'browser';
  }

  if (isElectron()) {
    return 'electron';
  }

  if (isPWA()) {
    return 'browser-pwa';
  }

  return 'browser';
}

/**
 * Get platform information
 */
export function getPlatform(): 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'unknown' {
  if (isServer()) {
    const platform = process.platform;
    if (platform === 'win32') return 'windows';
    if (platform === 'darwin') return 'macos';
    if (platform === 'linux') return 'linux';
    return 'unknown';
  }

  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes('win')) return 'windows';
  if (userAgent.includes('mac')) return 'macos';
  if (userAgent.includes('linux')) return 'linux';
  if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
  if (userAgent.includes('android')) return 'android';

  return 'unknown';
}

/**
 * Feature flags based on environment
 */
export interface FeatureFlags {
  // Native file system access (unrestricted)
  nativeFileSystem: boolean;

  // Web File System Access API (limited browser support)
  webFileSystemAPI: boolean;

  // Auto-updates
  autoUpdates: boolean;

  // System notifications
  systemNotifications: boolean;

  // System tray
  systemTray: boolean;

  // Native menus
  nativeMenus: boolean;

  // Deep linking (protocol handler)
  deepLinking: boolean;

  // Service worker (offline support)
  serviceWorker: boolean;

  // PWA install prompt
  pwaInstall: boolean;

  // Multi-window support
  multiWindow: boolean;

  // Keyboard shortcuts (global)
  globalShortcuts: boolean;
}

/**
 * Get feature flags for the current environment
 */
export function getFeatureFlags(): FeatureFlags {
  const env = getEnvironment();

  if (env === 'electron') {
    return {
      nativeFileSystem: true,
      webFileSystemAPI: false,
      autoUpdates: true,
      systemNotifications: true,
      systemTray: true,
      nativeMenus: true,
      deepLinking: true,
      serviceWorker: false, // Not needed in Electron
      pwaInstall: false,
      multiWindow: true,
      globalShortcuts: true,
    };
  }

  // Browser / PWA
  const hasFileSystemAccess = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  const hasServiceWorker = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  const hasNotifications = typeof Notification !== 'undefined';

  return {
    nativeFileSystem: false,
    webFileSystemAPI: hasFileSystemAccess,
    autoUpdates: false, // PWA updates handled by service worker
    systemNotifications: hasNotifications,
    systemTray: false,
    nativeMenus: false,
    deepLinking: env === 'browser-pwa', // PWA can handle protocols
    serviceWorker: hasServiceWorker,
    pwaInstall: env === 'browser',
    multiWindow: false,
    globalShortcuts: false,
  };
}

/**
 * Convenience export for feature flags
 * Use this for reactive checks in components
 */
export const features = {
  get nativeFileSystem() {
    return getFeatureFlags().nativeFileSystem;
  },
  get webFileSystemAPI() {
    return getFeatureFlags().webFileSystemAPI;
  },
  get autoUpdates() {
    return getFeatureFlags().autoUpdates;
  },
  get systemNotifications() {
    return getFeatureFlags().systemNotifications;
  },
  get systemTray() {
    return getFeatureFlags().systemTray;
  },
  get nativeMenus() {
    return getFeatureFlags().nativeMenus;
  },
  get deepLinking() {
    return getFeatureFlags().deepLinking;
  },
  get serviceWorker() {
    return getFeatureFlags().serviceWorker;
  },
  get pwaInstall() {
    return getFeatureFlags().pwaInstall;
  },
  get multiWindow() {
    return getFeatureFlags().multiWindow;
  },
  get globalShortcuts() {
    return getFeatureFlags().globalShortcuts;
  },
};

/**
 * Environment context for React components
 */
export interface EnvironmentContext {
  environment: Environment;
  platform: ReturnType<typeof getPlatform>;
  features: FeatureFlags;
  isElectron: boolean;
  isPWA: boolean;
  isBrowser: boolean;
}

/**
 * Get the complete environment context
 */
export function getEnvironmentContext(): EnvironmentContext {
  return {
    environment: getEnvironment(),
    platform: getPlatform(),
    features: getFeatureFlags(),
    isElectron: isElectron(),
    isPWA: isPWA(),
    isBrowser: isBrowser(),
  };
}
