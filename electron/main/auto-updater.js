"use strict";
/**
 * Auto Updater Manager
 *
 * Manages automatic updates using electron-updater
 * Handles checking, downloading, and installing updates
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoUpdaterManager = void 0;
exports.registerUpdaterHandlers = registerUpdaterHandlers;
const electron_updater_1 = require("electron-updater");
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
class AutoUpdaterManager {
    window;
    isChecking = false;
    constructor(window) {
        this.window = window;
        this.configure();
        this.setupEventHandlers();
    }
    /**
     * Configure the auto-updater
     */
    configure() {
        // Set up logging
        electron_updater_1.autoUpdater.logger = electron_log_1.default;
        electron_updater_1.autoUpdater.logger.transports.file.level = 'info';
        // Configuration
        electron_updater_1.autoUpdater.autoDownload = false; // Don't auto-download, let user decide
        electron_updater_1.autoUpdater.autoInstallOnAppQuit = true; // Install on quit if downloaded
        electron_updater_1.autoUpdater.autoRunAppAfterInstall = true; // Restart after install
        // For development testing (comment out in production)
        // autoUpdater.forceDevUpdateConfig = true;
        electron_log_1.default.info('Auto-updater configured');
    }
    /**
     * Set up event handlers for update events
     */
    setupEventHandlers() {
        // Checking for updates
        electron_updater_1.autoUpdater.on('checking-for-update', () => {
            electron_log_1.default.info('Checking for updates...');
            this.sendToWindow('updater:status', 'Checking for updates...');
        });
        // Update available
        electron_updater_1.autoUpdater.on('update-available', (info) => {
            electron_log_1.default.info('Update available:', info.version);
            this.sendToWindow('updater:updateAvailable', {
                version: info.version,
                releaseDate: info.releaseDate,
                releaseNotes: info.releaseNotes,
            });
        });
        // No update available
        electron_updater_1.autoUpdater.on('update-not-available', (info) => {
            electron_log_1.default.info('No update available. Current version:', info.version);
            this.sendToWindow('updater:upToDate', {
                version: info.version,
            });
        });
        // Download progress
        electron_updater_1.autoUpdater.on('download-progress', (progress) => {
            electron_log_1.default.debug(`Download progress: ${progress.percent.toFixed(2)}%`);
            this.sendToWindow('updater:downloadProgress', {
                percent: progress.percent,
                bytesPerSecond: progress.bytesPerSecond,
                total: progress.total,
                transferred: progress.transferred,
            });
        });
        // Update downloaded
        electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
            electron_log_1.default.info('Update downloaded:', info.version);
            this.sendToWindow('updater:updateDownloaded', {
                version: info.version,
                releaseDate: info.releaseDate,
                releaseNotes: info.releaseNotes,
            });
        });
        // Error
        electron_updater_1.autoUpdater.on('error', (error) => {
            electron_log_1.default.error('Auto-updater error:', error);
            this.sendToWindow('updater:error', {
                message: error.message,
                stack: error.stack,
            });
        });
    }
    /**
     * Send a message to the renderer window
     */
    sendToWindow(channel, data) {
        if (this.window && !this.window.isDestroyed()) {
            this.window.webContents.send(channel, data);
        }
    }
    /**
     * Check for updates
     */
    async checkForUpdates() {
        if (this.isChecking) {
            electron_log_1.default.warn('Already checking for updates');
            return null;
        }
        this.isChecking = true;
        electron_log_1.default.info('Starting update check...');
        try {
            const result = await electron_updater_1.autoUpdater.checkForUpdates();
            return result?.updateInfo ?? null;
        }
        catch (error) {
            electron_log_1.default.error('Failed to check for updates:', error);
            throw error;
        }
        finally {
            this.isChecking = false;
        }
    }
    /**
     * Download the update
     */
    async downloadUpdate() {
        electron_log_1.default.info('Starting update download...');
        try {
            return await electron_updater_1.autoUpdater.downloadUpdate();
        }
        catch (error) {
            electron_log_1.default.error('Failed to download update:', error);
            throw error;
        }
    }
    /**
     * Quit and install the update
     */
    quitAndInstall(isSilent = false, isForceRunAfter = true) {
        electron_log_1.default.info('Quitting and installing update...');
        electron_updater_1.autoUpdater.quitAndInstall(isSilent, isForceRunAfter);
    }
    /**
     * Get the current app version
     */
    getCurrentVersion() {
        return electron_updater_1.autoUpdater.currentVersion.version;
    }
    /**
     * Set the feed URL (for custom update servers)
     */
    setFeedURL(url) {
        electron_updater_1.autoUpdater.setFeedURL({
            provider: 'generic',
            url,
        });
    }
}
exports.AutoUpdaterManager = AutoUpdaterManager;
/**
 * Register IPC handlers that expose auto-update operations to renderer processes.
 * 
 * Registers handlers for 'updater:checkForUpdates', 'updater:downloadUpdate',
 * 'updater:installUpdate', and 'updater:getCurrentVersion' and forwards calls to the provided updater manager.
 * 
 * @param {Object} updaterManager - Instance that performs update operations (e.g., AutoUpdaterManager); used to check, download, install updates, and obtain current version.
 */
function registerUpdaterHandlers(updaterManager) {
    // Check for updates
    electron_1.ipcMain.handle('updater:checkForUpdates', async () => {
        try {
            const updateInfo = await updaterManager.checkForUpdates();
            return { success: true, data: updateInfo };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
    // Download update
    electron_1.ipcMain.handle('updater:downloadUpdate', async () => {
        try {
            const downloadedPaths = await updaterManager.downloadUpdate();
            return { success: true, data: downloadedPaths };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
    // Install update
    electron_1.ipcMain.handle('updater:installUpdate', () => {
        updaterManager.quitAndInstall();
    });
    // Get current version
    electron_1.ipcMain.handle('updater:getCurrentVersion', () => {
        return updaterManager.getCurrentVersion();
    });
    electron_log_1.default.info('Auto-updater IPC handlers registered');
}
//# sourceMappingURL=auto-updater.js.map