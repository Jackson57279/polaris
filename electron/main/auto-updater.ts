import { BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

export function setupAutoUpdater(mainWindow: BrowserWindow) {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
    mainWindow.webContents.send('updater:status', 'Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
    mainWindow.webContents.send('updater:updateAvailable', info);
  });

  autoUpdater.on('update-not-available', () => {
    log.info('Update not available');
    mainWindow.webContents.send('updater:status', 'No updates available');
  });

  autoUpdater.on('error', (err) => {
    log.error('Update error:', err);
    mainWindow.webContents.send('updater:status', `Error: ${err.message}`);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    log.info(`Download progress: ${progressObj.percent}%`);
    mainWindow.webContents.send('updater:downloadProgress', progressObj);
  });

  autoUpdater.on('update-downloaded', () => {
    log.info('Update downloaded');
    mainWindow.webContents.send('updater:updateDownloaded');
  });

  // IPC handlers
  ipcMain.handle('updater:checkForUpdates', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, data: result };
    } catch (error: any) {
      log.error('Check for updates error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('updater:downloadUpdate', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error: any) {
      log.error('Download update error:', error);
      return { success: false, error: error.message };
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
