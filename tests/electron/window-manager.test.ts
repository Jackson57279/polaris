/**
 * Window Manager Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WindowManager, WindowConfig } from '../../electron/main/window-manager';
import { BrowserWindow, screen, app } from 'electron';

// The electron mock is loaded from tests/electron-setup.ts

describe('WindowManager', () => {
  let windowManager: WindowManager;
  const mockConfig: WindowConfig = {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hiddenInset',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    windowManager = new WindowManager(mockConfig);
  });

  afterEach(() => {
    windowManager.closeAll();
  });

  describe('createWindow', () => {
    it('should create a BrowserWindow', async () => {
      const window = await windowManager.createWindow('http://localhost:3000');
      expect(window).toBeDefined();
      expect(BrowserWindow).toHaveBeenCalled();
    });

    it('should use provided URL', async () => {
      const url = 'http://localhost:4000';
      const window = await windowManager.createWindow(url);
      expect(window.loadURL).toHaveBeenCalledWith(url);
    });

    it('should track created windows', async () => {
      const window1 = await windowManager.createWindow('http://localhost:3000');
      const window2 = await windowManager.createWindow('http://localhost:3000');

      const allWindows = windowManager.getAllWindows();
      expect(allWindows.length).toBe(2);
    });
  });

  describe('getMainWindow', () => {
    it('should return null when no windows exist', () => {
      expect(windowManager.getMainWindow()).toBeNull();
    });

    it('should return the first created window', async () => {
      const window = await windowManager.createWindow('http://localhost:3000');
      expect(windowManager.getMainWindow()).toBe(window);
    });
  });

  describe('closeAll', () => {
    it('should close all windows', async () => {
      await windowManager.createWindow('http://localhost:3000');
      await windowManager.createWindow('http://localhost:3000');

      windowManager.closeAll();

      // Windows should be closed (destroyed)
      const windows = windowManager.getAllWindows();
      expect(windows.every((w) => w.isDestroyed())).toBe(true);
    });
  });

  describe('window configuration', () => {
    it('should apply security settings', async () => {
      const window = await windowManager.createWindow('http://localhost:3000');

      // Verify BrowserWindow was called with security options
      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          webPreferences: expect.objectContaining({
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
          }),
        })
      );
    });

    it('should respect frame setting', async () => {
      const window = await windowManager.createWindow('http://localhost:3000');

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          frame: false,
        })
      );
    });
  });
});
