/**
 * Window IPC Handlers
 *
 * Provides window control access to the renderer process
 * Includes minimize, maximize, close, and state queries
 */

import { ipcMain, BrowserWindow } from 'electron';
import electronLog from 'electron-log';

/**
 * Get the focused window or first available window
 */
function getWindow(): BrowserWindow | null {
  return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null;
}

/**
 * Register window IPC handlers
 */
export function registerWindowHandlers(): void {
  // Minimize window
  ipcMain.handle('window:minimize', async () => {
    try {
      const window = getWindow();
      if (window) {
        window.minimize();
      }
      return { success: true };
    } catch (error) {
      const err = error as Error;
      electronLog.error('window:minimize error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Maximize/unmaximize window
  ipcMain.handle('window:maximize', async () => {
    try {
      const window = getWindow();
      if (window) {
        if (window.isMaximized()) {
          window.unmaximize();
        } else {
          window.maximize();
        }
      }
      return { success: true };
    } catch (error) {
      const err = error as Error;
      electronLog.error('window:maximize error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Close window
  ipcMain.handle('window:close', async () => {
    try {
      const window = getWindow();
      if (window) {
        window.close();
      }
      return { success: true };
    } catch (error) {
      const err = error as Error;
      electronLog.error('window:close error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Toggle fullscreen
  ipcMain.handle('window:toggleFullscreen', async () => {
    try {
      const window = getWindow();
      if (window) {
        window.setFullScreen(!window.isFullScreen());
      }
      return { success: true };
    } catch (error) {
      const err = error as Error;
      electronLog.error('window:toggleFullscreen error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Check if window is maximized
  ipcMain.handle('window:isMaximized', async () => {
    try {
      const window = getWindow();
      return { success: true, data: window?.isMaximized() ?? false };
    } catch (error) {
      const err = error as Error;
      electronLog.error('window:isMaximized error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Check if window is minimized
  ipcMain.handle('window:isMinimized', async () => {
    try {
      const window = getWindow();
      return { success: true, data: window?.isMinimized() ?? false };
    } catch (error) {
      const err = error as Error;
      electronLog.error('window:isMinimized error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Check if window is fullscreen
  ipcMain.handle('window:isFullscreen', async () => {
    try {
      const window = getWindow();
      return { success: true, data: window?.isFullScreen() ?? false };
    } catch (error) {
      const err = error as Error;
      electronLog.error('window:isFullscreen error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Check if window is focused
  ipcMain.handle('window:isFocused', async () => {
    try {
      const window = getWindow();
      return { success: true, data: window?.isFocused() ?? false };
    } catch (error) {
      const err = error as Error;
      electronLog.error('window:isFocused error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Get window bounds
  ipcMain.handle('window:getBounds', async () => {
    try {
      const window = getWindow();
      if (window) {
        const bounds = window.getBounds();
        return { success: true, data: bounds };
      }
      return { success: false, error: 'No window available' };
    } catch (error) {
      const err = error as Error;
      electronLog.error('window:getBounds error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Set window bounds
  ipcMain.handle(
    'window:setBounds',
    async (event, bounds: { x?: number; y?: number; width?: number; height?: number }) => {
      try {
        const window = getWindow();
        if (window) {
          window.setBounds(bounds);
        }
        return { success: true };
      } catch (error) {
        const err = error as Error;
        electronLog.error('window:setBounds error:', err.message);
        return { success: false, error: err.message };
      }
    }
  );

  // Get window state
  ipcMain.handle('window:getState', async () => {
    try {
      const window = getWindow();
      if (window) {
        return {
          success: true,
          data: {
            isMaximized: window.isMaximized(),
            isMinimized: window.isMinimized(),
            isFullscreen: window.isFullScreen(),
            isFocused: window.isFocused(),
            isVisible: window.isVisible(),
            bounds: window.getBounds(),
          },
        };
      }
      return { success: false, error: 'No window available' };
    } catch (error) {
      const err = error as Error;
      electronLog.error('window:getState error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Set window title
  ipcMain.handle('window:setTitle', async (event, title: string) => {
    try {
      const window = getWindow();
      if (window) {
        window.setTitle(title);
      }
      return { success: true };
    } catch (error) {
      const err = error as Error;
      electronLog.error('window:setTitle error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Focus window
  ipcMain.handle('window:focus', async () => {
    try {
      const window = getWindow();
      if (window) {
        if (window.isMinimized()) {
          window.restore();
        }
        window.focus();
      }
      return { success: true };
    } catch (error) {
      const err = error as Error;
      electronLog.error('window:focus error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Show window
  ipcMain.handle('window:show', async () => {
    try {
      const window = getWindow();
      if (window) {
        window.show();
      }
      return { success: true };
    } catch (error) {
      const err = error as Error;
      electronLog.error('window:show error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Hide window
  ipcMain.handle('window:hide', async () => {
    try {
      const window = getWindow();
      if (window) {
        window.hide();
      }
      return { success: true };
    } catch (error) {
      const err = error as Error;
      electronLog.error('window:hide error:', err.message);
      return { success: false, error: err.message };
    }
  });

  electronLog.info('Window IPC handlers registered');
}
