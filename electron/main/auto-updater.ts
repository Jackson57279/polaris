import { BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

export function setupAutoUpdater(mainWindow: BrowserWindow) {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:status', 'Checking for updates...');
    }
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:updateAvailable', info);
    }
  });

  autoUpdater.on('update-not-available', () => {
    log.info('Update not available');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:status', 'No updates available');
    }
  });

  autoUpdater.on('error', (err) => {
    log.error('Update error:', err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:status', `Error: ${err.message}`);
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    log.info(`Download progress: ${progressObj.percent}%`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:downloadProgress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', () => {
    log.info('Update downloaded');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:updateDownloaded');
    }
  });

  // IPC handlers
  ipcMain.handle('updater:checkForUpdates', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, data: result };
    } catch (error) {
      log.error('Check for updates error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  ipcMain.handle('updater:downloadUpdate', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      log.error('Download update error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  ipcMain.handle('updater:installUpdate', () => {
    autoUpdater.quitAndInstall();
    return { success: true };
  });

  // Check for updates on startup (after 3 seconds)
  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 3000);
}
