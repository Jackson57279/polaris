"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAutoUpdater = setupAutoUpdater;
const electron_1 = require("electron");
const electron_updater_1 = require("electron-updater");
const electron_log_1 = __importDefault(require("electron-log"));
function setupAutoUpdater(mainWindow) {
    electron_updater_1.autoUpdater.logger = electron_log_1.default;
    electron_updater_1.autoUpdater.autoDownload = false;
    electron_updater_1.autoUpdater.autoInstallOnAppQuit = true;
    electron_updater_1.autoUpdater.on('checking-for-update', () => {
        electron_log_1.default.info('Checking for updates...');
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('updater:status', 'Checking for updates...');
        }
    });
    electron_updater_1.autoUpdater.on('update-available', (info) => {
        electron_log_1.default.info('Update available:', info);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('updater:updateAvailable', info);
        }
    });
    electron_updater_1.autoUpdater.on('update-not-available', () => {
        electron_log_1.default.info('Update not available');
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('updater:status', 'No updates available');
        }
    });
    electron_updater_1.autoUpdater.on('error', (err) => {
        electron_log_1.default.error('Update error:', err);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('updater:status', `Error: ${err.message}`);
        }
    });
    electron_updater_1.autoUpdater.on('download-progress', (progressObj) => {
        electron_log_1.default.info(`Download progress: ${progressObj.percent}%`);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('updater:downloadProgress', progressObj);
        }
    });
    electron_updater_1.autoUpdater.on('update-downloaded', () => {
        electron_log_1.default.info('Update downloaded');
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('updater:updateDownloaded');
        }
    });
    // IPC handlers
    electron_1.ipcMain.handle('updater:checkForUpdates', async () => {
        try {
            const result = await electron_updater_1.autoUpdater.checkForUpdates();
            return { success: true, data: result };
        }
        catch (error) {
            electron_log_1.default.error('Check for updates error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    });
    electron_1.ipcMain.handle('updater:downloadUpdate', async () => {
        try {
            await electron_updater_1.autoUpdater.downloadUpdate();
            return { success: true };
        }
        catch (error) {
            electron_log_1.default.error('Download update error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    });
    electron_1.ipcMain.handle('updater:installUpdate', () => {
        electron_updater_1.autoUpdater.quitAndInstall();
        return { success: true };
    });
    // Check for updates on startup (after 3 seconds)
    setTimeout(() => {
        electron_updater_1.autoUpdater.checkForUpdates();
    }, 3000);
}
//# sourceMappingURL=auto-updater.js.map