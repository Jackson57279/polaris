/**
 * System Tray Manager
 *
 * Manages the system tray icon and context menu
 * Provides quick access to common actions
 */

import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron';
import path from 'path';
import electronLog from 'electron-log';

export class TrayManager {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.createTray();
  }

  /**
   * Create the system tray
   */
  private createTray(): void {
    const iconPath = this.getIconPath();
    const icon = nativeImage.createFromPath(iconPath);

    // Resize for tray (16x16 on macOS, 16x16 or 32x32 on Windows/Linux)
    const trayIcon = icon.resize({
      width: 16,
      height: 16,
    });

    this.tray = new Tray(trayIcon);
    this.tray.setToolTip('Polaris IDE');

    // Create context menu
    this.updateContextMenu();

    // Handle click events
    this.tray.on('click', () => {
      this.showWindow();
    });

    this.tray.on('double-click', () => {
      this.showWindow();
    });

    electronLog.info('System tray created');
  }

  /**
   * Update the context menu
   */
  private updateContextMenu(): void {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Polaris IDE',
        click: () => {
          this.showWindow();
        },
      },
      { type: 'separator' },
      {
        label: 'New Project',
        click: () => {
          this.showWindow();
          this.mainWindow.webContents.send('menu:newProject');
        },
      },
      {
        label: 'Open Project...',
        click: () => {
          this.showWindow();
          this.mainWindow.webContents.send('menu:openProject');
        },
      },
      { type: 'separator' },
      {
        label: 'Check for Updates',
        click: () => {
          this.mainWindow.webContents.send('menu:checkForUpdates');
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  /**
   * Show the main window
   */
  private showWindow(): void {
    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore();
    }
    this.mainWindow.show();
    this.mainWindow.focus();
  }

  /**
   * Get the tray icon path
   */
  private getIconPath(): string {
    const iconDir = path.join(__dirname, '../resources/icons');

    if (process.platform === 'win32') {
      return path.join(iconDir, 'icon.ico');
    } else if (process.platform === 'darwin') {
      // Use template image for macOS (will be inverted in dark mode)
      return path.join(iconDir, 'trayTemplate.png');
    } else {
      return path.join(iconDir, 'icon.png');
    }
  }

  /**
   * Update the tray tooltip
   */
  setTooltip(tooltip: string): void {
    this.tray?.setToolTip(tooltip);
  }

  /**
   * Show a balloon notification (Windows only)
   */
  displayBalloon(title: string, content: string): void {
    if (process.platform === 'win32' && this.tray) {
      this.tray.displayBalloon({
        title,
        content,
        iconType: 'info',
      });
    }
  }

  /**
   * Destroy the tray
   */
  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
      electronLog.info('System tray destroyed');
    }
  }
}
