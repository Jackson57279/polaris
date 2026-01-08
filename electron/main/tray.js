"use strict";
/**
 * System Tray Manager
 *
 * Manages the system tray icon and context menu
 * Provides quick access to common actions
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrayManager = void 0;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const electron_log_1 = __importDefault(require("electron-log"));
class TrayManager {
    tray = null;
    mainWindow;
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.createTray();
    }
    /**
     * Create the system tray
     */
    createTray() {
        const iconPath = this.getIconPath();
        const icon = electron_1.nativeImage.createFromPath(iconPath);
        // Resize for tray (16x16 on macOS, 16x16 or 32x32 on Windows/Linux)
        const trayIcon = icon.resize({
            width: 16,
            height: 16,
        });
        this.tray = new electron_1.Tray(trayIcon);
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
        electron_log_1.default.info('System tray created');
    }
    /**
     * Update the context menu
     */
    updateContextMenu() {
        if (!this.tray)
            return;
        const contextMenu = electron_1.Menu.buildFromTemplate([
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
                    electron_1.app.quit();
                },
            },
        ]);
        this.tray.setContextMenu(contextMenu);
    }
    /**
     * Show the main window
     */
    showWindow() {
        if (this.mainWindow.isMinimized()) {
            this.mainWindow.restore();
        }
        this.mainWindow.show();
        this.mainWindow.focus();
    }
    /**
     * Get the tray icon path
     */
    getIconPath() {
        const iconDir = path_1.default.join(__dirname, '../resources/icons');
        if (process.platform === 'win32') {
            return path_1.default.join(iconDir, 'icon.ico');
        }
        else if (process.platform === 'darwin') {
            // Use template image for macOS (will be inverted in dark mode)
            return path_1.default.join(iconDir, 'trayTemplate.png');
        }
        else {
            return path_1.default.join(iconDir, 'icon.png');
        }
    }
    /**
     * Update the tray tooltip
     */
    setTooltip(tooltip) {
        this.tray?.setToolTip(tooltip);
    }
    /**
     * Show a balloon notification (Windows only)
     */
    displayBalloon(title, content) {
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
    destroy() {
        if (this.tray) {
            this.tray.destroy();
            this.tray = null;
            electron_log_1.default.info('System tray destroyed');
        }
    }
}
exports.TrayManager = TrayManager;
//# sourceMappingURL=tray.js.map