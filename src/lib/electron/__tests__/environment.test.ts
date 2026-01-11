import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isElectron, isPWA, isBrowser, getEnvironment, getFeatures } from '../environment';

describe('Environment Detection', () => {
  beforeEach(() => {
    // Clear window.electron
    if (typeof window !== 'undefined') {
      delete (window as any).electron;
    }
  });

  describe('isElectron', () => {
    it('should return true when electron API is present', () => {
      (window as any).electron = { test: true };
      expect(isElectron()).toBe(true);
    });

    it('should return false when electron API is not present', () => {
      expect(isElectron()).toBe(false);
    });
  });

  describe('isPWA', () => {
    it('should return true when in standalone display mode', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn()
        }))
      });

      expect(isPWA()).toBe(true);
    });

    it('should return false when not in standalone display mode', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          media: '',
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn()
        }))
      });

      expect(isPWA()).toBe(false);
    });
  });

  describe('isBrowser', () => {
    it('should return true when not Electron and not PWA', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          media: '',
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn()
        }))
      });

      expect(isBrowser()).toBe(true);
    });

    it('should return false when in Electron', () => {
      (window as any).electron = { test: true };
      expect(isBrowser()).toBe(false);
    });
  });

  describe('getEnvironment', () => {
    it('should return "electron" when in Electron', () => {
      (window as any).electron = { test: true };
      expect(getEnvironment()).toBe('electron');
    });

    it('should return "browser-pwa" when in PWA', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn()
        }))
      });

      expect(getEnvironment()).toBe('browser-pwa');
    });

    it('should return "browser" by default', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          media: '',
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn()
        }))
      });

      expect(getEnvironment()).toBe('browser');
    });
  });

  describe('getFeatures', () => {
    it('should return correct features for Electron environment', () => {
      (window as any).electron = { test: true };
      
      const features = getFeatures();
      
      expect(features.nativeFileSystem).toBe(true);
      expect(features.webFileSystemAPI).toBe(false);
      expect(features.autoUpdates).toBe(true);
      expect(features.nativeNotifications).toBe(true);
      expect(features.systemTray).toBe(true);
      expect(features.nativeMenus).toBe(true);
    });

    it('should return correct features for browser environment', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          media: '',
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn()
        }))
      });

      const features = getFeatures();
      
      expect(features.nativeFileSystem).toBe(false);
      expect(features.autoUpdates).toBe(false);
      expect(features.systemTray).toBe(false);
      expect(features.nativeMenus).toBe(false);
    });
  });
});
