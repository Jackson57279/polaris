/**
 * App IPC Handlers
 *
 * Provides app-level operations to the renderer process
 * Includes version info, paths, and app lifecycle controls
 */

import { ipcMain, app } from 'electron';
import path from 'path';
import electronLog from 'electron-log';

/**
 * Register IPC handlers on the main process to expose common app-level operations to renderers.
 *
 * Installs handlers for version/name/packaged status, common paths, lifecycle controls (quit/relaunch),
 * platform and locale information, development mode check, resource path resolution, Windows AppUserModelID,
 * GPU information, and app metrics. Handlers return a standardized `{ success: boolean, data?: any, error?: string }` payload.
 */
export function registerAppHandlers(): void {
  // Get app version
  ipcMain.handle('app:getVersion', async () => {
    return { success: true, data: app.getVersion() };
  });

  // Get app name
  ipcMain.handle('app:getName', async () => {
    return { success: true, data: app.getName() };
  });

  // Check if app is packaged
  ipcMain.handle('app:isPackaged', async () => {
    return { success: true, data: app.isPackaged };
  });

  // Get app path
  ipcMain.handle('app:getPath', async (event, name: Parameters<typeof app.getPath>[0]) => {
    try {
      const appPath = app.getPath(name);
      return { success: true, data: appPath };
    } catch (error) {
      const err = error as Error;
      electronLog.error('app:getPath error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Get app paths (common paths)
  ipcMain.handle('app:getPaths', async () => {
    try {
      return {
        success: true,
        data: {
          userData: app.getPath('userData'),
          home: app.getPath('home'),
          temp: app.getPath('temp'),
          documents: app.getPath('documents'),
          downloads: app.getPath('downloads'),
          desktop: app.getPath('desktop'),
          exe: app.getPath('exe'),
          appData: app.getPath('appData'),
        },
      };
    } catch (error) {
      const err = error as Error;
      electronLog.error('app:getPaths error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Quit the app
  ipcMain.handle('app:quit', async () => {
    try {
      app.quit();
      return { success: true };
    } catch (error) {
      const err = error as Error;
      electronLog.error('app:quit error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Relaunch the app
  ipcMain.handle('app:relaunch', async () => {
    try {
      app.relaunch();
      app.quit();
      return { success: true };
    } catch (error) {
      const err = error as Error;
      electronLog.error('app:relaunch error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Get platform info
  ipcMain.handle('app:getPlatformInfo', async () => {
    return {
      success: true,
      data: {
        platform: process.platform,
        arch: process.arch,
        electronVersion: process.versions.electron,
        chromeVersion: process.versions.chrome,
        nodeVersion: process.versions.node,
      },
    };
  });

  // Get locale
  ipcMain.handle('app:getLocale', async () => {
    return { success: true, data: app.getLocale() };
  });

  // Get system locale
  ipcMain.handle('app:getSystemLocale', async () => {
    return { success: true, data: app.getSystemLocale() };
  });

  // Check if running in development mode
  ipcMain.handle('app:isDevelopment', async () => {
    return { success: true, data: process.env.NODE_ENV === 'development' };
  });

  // Get resource path
  ipcMain.handle('app:getResourcePath', async (event, resource: string) => {
    try {
      const resourcePath = app.isPackaged
        ? path.join(process.resourcesPath, resource)
        : path.join(__dirname, '../..', resource);

      return { success: true, data: resourcePath };
    } catch (error) {
      const err = error as Error;
      electronLog.error('app:getResourcePath error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Set app user model id (Windows)
  ipcMain.handle('app:setAppUserModelId', async (event, id: string) => {
    try {
      if (process.platform === 'win32') {
        app.setAppUserModelId(id);
      }
      return { success: true };
    } catch (error) {
      const err = error as Error;
      electronLog.error('app:setAppUserModelId error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Get GPU info
  ipcMain.handle('app:getGPUInfo', async (event, infoType: 'basic' | 'complete' = 'basic') => {
    try {
      const gpuInfo = await app.getGPUInfo(infoType);
      return { success: true, data: gpuInfo };
    } catch (error) {
      const err = error as Error;
      electronLog.error('app:getGPUInfo error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Get app metrics
  ipcMain.handle('app:getAppMetrics', async () => {
    try {
      const metrics = app.getAppMetrics();
      return { success: true, data: metrics };
    } catch (error) {
      const err = error as Error;
      electronLog.error('app:getAppMetrics error:', err.message);
      return { success: false, error: err.message };
    }
  });

  electronLog.info('App IPC handlers registered');
}