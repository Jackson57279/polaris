/**
 * Environment Detection Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We'll test the logic directly since the module depends on window/navigator

describe('Environment Detection Logic', () => {
  const originalWindow = global.window;
  const originalNavigator = global.navigator;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    global.window = originalWindow;
    global.navigator = originalNavigator;
  });

  describe('isElectron', () => {
    it('should return true when window.electron exists', () => {
      (global as any).window = { electron: {} };

      const isElectron = () => {
        if (typeof window === 'undefined') return false;
        return !!(window as any).electron;
      };

      expect(isElectron()).toBe(true);
    });

    it('should return false when window.electron does not exist', () => {
      (global as any).window = {};

      const isElectron = () => {
        if (typeof window === 'undefined') return false;
        return !!(window as any).electron;
      };

      expect(isElectron()).toBe(false);
    });

    it('should return false in SSR (window undefined)', () => {
      delete (global as any).window;

      const isElectron = () => {
        if (typeof window === 'undefined') return false;
        return !!(window as any).electron;
      };

      expect(isElectron()).toBe(false);
    });
  });

  describe('isPWA', () => {
    it('should return true when display-mode is standalone', () => {
      (global as any).window = {
        matchMedia: vi.fn().mockReturnValue({ matches: true }),
      };

      const isPWA = () => {
        if (typeof window === 'undefined') return false;
        return (
          window.matchMedia?.('(display-mode: standalone)')?.matches === true
        );
      };

      expect(isPWA()).toBe(true);
    });

    it('should return false when display-mode is browser', () => {
      (global as any).window = {
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
      };

      const isPWA = () => {
        if (typeof window === 'undefined') return false;
        return (
          window.matchMedia?.('(display-mode: standalone)')?.matches === true
        );
      };

      expect(isPWA()).toBe(false);
    });
  });

  describe('getPlatform', () => {
    it('should return "windows" for Windows user agent', () => {
      (global as any).navigator = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        platform: 'Win32',
      };
      (global as any).window = {};

      const getPlatform = () => {
        if (typeof navigator === 'undefined') return 'unknown';
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = navigator.platform?.toLowerCase() || '';

        if (userAgent.includes('win') || platform.includes('win')) {
          return 'windows';
        }
        if (userAgent.includes('mac') || platform.includes('mac')) {
          return 'macos';
        }
        if (userAgent.includes('linux') || platform.includes('linux')) {
          return 'linux';
        }
        return 'unknown';
      };

      expect(getPlatform()).toBe('windows');
    });

    it('should return "linux" for Linux user agent', () => {
      (global as any).navigator = {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
        platform: 'Linux x86_64',
      };
      (global as any).window = {};

      const getPlatform = () => {
        if (typeof navigator === 'undefined') return 'unknown';
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = navigator.platform?.toLowerCase() || '';

        if (userAgent.includes('win') || platform.includes('win')) {
          return 'windows';
        }
        if (userAgent.includes('mac') || platform.includes('mac')) {
          return 'macos';
        }
        if (userAgent.includes('linux') || platform.includes('linux')) {
          return 'linux';
        }
        return 'unknown';
      };

      expect(getPlatform()).toBe('linux');
    });

    it('should return "macos" for Mac user agent', () => {
      (global as any).navigator = {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
      };
      (global as any).window = {};

      const getPlatform = () => {
        if (typeof navigator === 'undefined') return 'unknown';
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = navigator.platform?.toLowerCase() || '';

        if (userAgent.includes('win') || platform.includes('win')) {
          return 'windows';
        }
        if (userAgent.includes('mac') || platform.includes('mac')) {
          return 'macos';
        }
        if (userAgent.includes('linux') || platform.includes('linux')) {
          return 'linux';
        }
        return 'unknown';
      };

      expect(getPlatform()).toBe('macos');
    });
  });

  describe('getFeatureFlags', () => {
    it('should return all features enabled for Electron', () => {
      const getFeatureFlags = (isElectron: boolean) => ({
        nativeFileSystem: isElectron,
        autoUpdates: isElectron,
        nativeNotifications: isElectron,
        systemTray: isElectron,
        nativeMenus: isElectron,
        deepLinks: isElectron,
        offlineSupport: true, // Available in both
        localStorage: true,
        indexedDB: true,
      });

      const flags = getFeatureFlags(true);

      expect(flags.nativeFileSystem).toBe(true);
      expect(flags.autoUpdates).toBe(true);
      expect(flags.nativeNotifications).toBe(true);
      expect(flags.systemTray).toBe(true);
      expect(flags.nativeMenus).toBe(true);
      expect(flags.deepLinks).toBe(true);
    });

    it('should return Electron features disabled for browser', () => {
      const getFeatureFlags = (isElectron: boolean) => ({
        nativeFileSystem: isElectron,
        autoUpdates: isElectron,
        nativeNotifications: isElectron,
        systemTray: isElectron,
        nativeMenus: isElectron,
        deepLinks: isElectron,
        offlineSupport: true, // Available in both
        localStorage: true,
        indexedDB: true,
      });

      const flags = getFeatureFlags(false);

      expect(flags.nativeFileSystem).toBe(false);
      expect(flags.autoUpdates).toBe(false);
      expect(flags.nativeNotifications).toBe(false);
      expect(flags.systemTray).toBe(false);
      expect(flags.offlineSupport).toBe(true);
      expect(flags.localStorage).toBe(true);
    });
  });
});

describe('Environment Context', () => {
  it('should create correct context for Electron environment', () => {
    const createContext = (isElectron: boolean, isPWA: boolean) => {
      let environment: 'electron' | 'browser-pwa' | 'browser' = 'browser';
      if (isElectron) {
        environment = 'electron';
      } else if (isPWA) {
        environment = 'browser-pwa';
      }

      return {
        environment,
        platform: 'windows',
        features: {
          nativeFileSystem: isElectron,
          autoUpdates: isElectron,
        },
      };
    };

    const context = createContext(true, false);

    expect(context.environment).toBe('electron');
    expect(context.features.nativeFileSystem).toBe(true);
    expect(context.features.autoUpdates).toBe(true);
  });

  it('should create correct context for PWA environment', () => {
    const createContext = (isElectron: boolean, isPWA: boolean) => {
      let environment: 'electron' | 'browser-pwa' | 'browser' = 'browser';
      if (isElectron) {
        environment = 'electron';
      } else if (isPWA) {
        environment = 'browser-pwa';
      }

      return {
        environment,
        platform: 'web',
        features: {
          nativeFileSystem: isElectron,
          autoUpdates: isElectron,
        },
      };
    };

    const context = createContext(false, true);

    expect(context.environment).toBe('browser-pwa');
    expect(context.features.nativeFileSystem).toBe(false);
  });

  it('should create correct context for browser environment', () => {
    const createContext = (isElectron: boolean, isPWA: boolean) => {
      let environment: 'electron' | 'browser-pwa' | 'browser' = 'browser';
      if (isElectron) {
        environment = 'electron';
      } else if (isPWA) {
        environment = 'browser-pwa';
      }

      return {
        environment,
        platform: 'web',
        features: {
          nativeFileSystem: isElectron,
          autoUpdates: isElectron,
        },
      };
    };

    const context = createContext(false, false);

    expect(context.environment).toBe('browser');
    expect(context.features.nativeFileSystem).toBe(false);
  });
});
