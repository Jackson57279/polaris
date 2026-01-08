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
 * Determines whether the current runtime is a server (SSR) environment.
 *
 * @returns `true` if running outside a browser (no `window`), `false` otherwise.
 */
export function isServer(): boolean {
  return typeof window === 'undefined';
}

/**
 * Determines whether the current runtime is Electron.
 *
 * On server (non-browser) contexts this checks `process.env.IS_ELECTRON === 'true'`. On the client it detects a preload-exposed `window.electron`.
 *
 * @returns `true` if running in an Electron environment, `false` otherwise.
 */
export function isElectron(): boolean {
  if (isServer()) {
    return process.env.IS_ELECTRON === 'true';
  }

  // Check for window.electron API exposed by preload script
  return typeof window !== 'undefined' && window.electron !== undefined;
}

/**
 * Determines whether the current execution context is an installed Progressive Web App (PWA).
 *
 * Returns `false` when executed in a non-browser (server) environment.
 *
 * @returns `true` if the app is running as an installed/standalone PWA (including iOS standalone), `false` otherwise.
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
 * Determine whether the current runtime is a browser environment (including PWAs).
 *
 * @returns `true` if running in a browser or browser PWA environment, `false` otherwise.
 */
export function isBrowser(): boolean {
  const env = getEnvironment();
  return env === 'browser' || env === 'browser-pwa';
}

/**
 * Determine the current runtime environment.
 *
 * Checks server-side and client-side indicators to identify whether the app
 * is running in Electron, a browser PWA, or a regular browser.
 *
 * @returns The detected Environment: `'electron'`, `'browser-pwa'`, or `'browser'`.
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
 * Identify the current operating platform for the runtime environment.
 *
 * @returns One of 'windows', 'macos', 'linux', 'ios', 'android', or 'unknown' indicating the detected platform
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
 * Compute feature flags that describe which platform capabilities are available
 * for the current runtime environment.
 *
 * The returned flags reflect the detected environment (Electron, browser, or PWA)
 * and runtime capabilities when applicable.
 *
 * @returns An object with boolean feature flags: `nativeFileSystem`, `webFileSystemAPI`,
 * `autoUpdates`, `systemNotifications`, `systemTray`, `nativeMenus`, `deepLinking`,
 * `serviceWorker`, `pwaInstall`, `multiWindow`, and `globalShortcuts`.
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
 * Assemble a consolidated EnvironmentContext containing the detected environment, platform, feature flags, and convenience booleans.
 *
 * @returns The assembled EnvironmentContext with properties: `environment`, `platform`, `features`, `isElectron`, `isPWA`, and `isBrowser`.
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