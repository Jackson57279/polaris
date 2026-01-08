/**
 * Auto Updater Manager
 *
 * Manages automatic updates using electron-updater
 * Handles checking, downloading, and installing updates
 */

import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import { BrowserWindow, ipcMain } from 'electron';
import electronLog from 'electron-log';

export class AutoUpdaterManager {
  private window: BrowserWindow;
  private isChecking: boolean = false;

  constructor(window: BrowserWindow) {
    this.window = window;
    this.configure();
    this.setupEventHandlers();
  }

  /**
   * Configure the auto-updater
   */
  private configure(): void {
    // Set up logging
    autoUpdater.logger = electronLog;
    (autoUpdater.logger as typeof electronLog).transports.file.level = 'info';

    // Configuration
    autoUpdater.autoDownload = false; // Don't auto-download, let user decide
    autoUpdater.autoInstallOnAppQuit = true; // Install on quit if downloaded
    autoUpdater.autoRunAppAfterInstall = true; // Restart after install

    // For development testing (comment out in production)
    // autoUpdater.forceDevUpdateConfig = true;

    electronLog.info('Auto-updater configured');
  }

  /**
   * Set up event handlers for update events
   */
  private setupEventHandlers(): void {
    // Checking for updates
    autoUpdater.on('checking-for-update', () => {
      electronLog.info('Checking for updates...');
      this.sendToWindow('updater:status', 'Checking for updates...');
    });

    // Update available
    autoUpdater.on('update-available', (info: UpdateInfo) => {
      electronLog.info('Update available:', info.version);
      this.sendToWindow('updater:updateAvailable', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });
    });

    // No update available
    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      electronLog.info('No update available. Current version:', info.version);
      this.sendToWindow('updater:upToDate', {
        version: info.version,
      });
    });

    // Download progress
    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      electronLog.debug(`Download progress: ${progress.percent.toFixed(2)}%`);
      this.sendToWindow('updater:downloadProgress', {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        total: progress.total,
        transferred: progress.transferred,
      });
    });

    // Update downloaded
    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      electronLog.info('Update downloaded:', info.version);
      this.sendToWindow('updater:updateDownloaded', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });
    });

    // Error
    autoUpdater.on('error', (error: Error) => {
      electronLog.error('Auto-updater error:', error);
      this.sendToWindow('updater:error', {
        message: error.message,
        stack: error.stack,
      });
    });
  }

  /**
   * Send a message to the renderer window
   */
  private sendToWindow(channel: string, data: unknown): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(channel, data);
    }
  }

  /**
   * Check for updates
   */
  async checkForUpdates(): Promise<UpdateInfo | null> {
    if (this.isChecking) {
      electronLog.warn('Already checking for updates');
      return null;
    }

    this.isChecking = true;
    electronLog.info('Starting update check...');

    try {
      const result = await autoUpdater.checkForUpdates();
      return result?.updateInfo ?? null;
    } catch (error) {
      electronLog.error('Failed to check for updates:', error);
      throw error;
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Download the update
   */
  async downloadUpdate(): Promise<string[]> {
    electronLog.info('Starting update download...');

    try {
      return await autoUpdater.downloadUpdate();
    } catch (error) {
      electronLog.error('Failed to download update:', error);
      throw error;
    }
  }

  /**
   * Quit and install the update
   */
  quitAndInstall(isSilent: boolean = false, isForceRunAfter: boolean = true): void {
    electronLog.info('Quitting and installing update...');
    autoUpdater.quitAndInstall(isSilent, isForceRunAfter);
  }

  /**
   * Get the current app version
   */
  getCurrentVersion(): string {
    return autoUpdater.currentVersion.version;
  }

  /**
   * Set the feed URL (for custom update servers)
   */
  setFeedURL(url: string): void {
    autoUpdater.setFeedURL({
      provider: 'generic',
      url,
    });
  }
}

/**
 * Registers IPC handlers on ipcMain to expose auto-updater operations to the renderer.
 *
 * Handlers registered:
 * - `updater:checkForUpdates` — invokes `checkForUpdates` and returns an object `{ success: true, data }` on success or `{ success: false, error }` on failure.
 * - `updater:downloadUpdate` — invokes `downloadUpdate` and returns an object `{ success: true, data }` on success or `{ success: false, error }` on failure.
 * - `updater:installUpdate` — invokes `quitAndInstall` to trigger installation.
 * - `updater:getCurrentVersion` — returns the current version string.
 *
 * @param updaterManager - The AutoUpdaterManager instance used to perform update actions
 */
export function registerUpdaterHandlers(updaterManager: AutoUpdaterManager): void {
  // Check for updates
  ipcMain.handle('updater:checkForUpdates', async () => {
    try {
      const updateInfo = await updaterManager.checkForUpdates();
      return { success: true, data: updateInfo };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Download update
  ipcMain.handle('updater:downloadUpdate', async () => {
    try {
      const downloadedPaths = await updaterManager.downloadUpdate();
      return { success: true, data: downloadedPaths };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Install update
  ipcMain.handle('updater:installUpdate', () => {
    updaterManager.quitAndInstall();
  });

  // Get current version
  ipcMain.handle('updater:getCurrentVersion', () => {
    return updaterManager.getCurrentVersion();
  });

  electronLog.info('Auto-updater IPC handlers registered');
}