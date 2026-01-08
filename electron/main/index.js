"use strict";
/**
 * Electron Main Process Entry Point
 *
 * This is the heart of the Electron application. It manages:
 * - Application lifecycle
 * - Window creation and management
 * - Next.js server lifecycle
 * - IPC handler registration
 * - Protocol handling
 * - Auto-updates
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoUpdaterManager = exports.serverManager = exports.windowManager = void 0;
exports.initialize = initialize;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const window_manager_1 = require("./window-manager");
const server_manager_1 = require("./server-manager");
const ipc_1 = require("./ipc");
const auto_updater_1 = require("./auto-updater");
const menu_1 = require("./menu");
const electron_log_1 = __importDefault(require("electron-log"));
// Configure logging
electron_log_1.default.transports.file.level = 'info';
electron_log_1.default.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : 'info';
// Global references to prevent garbage collection
let windowManager = null;
exports.windowManager = windowManager;
let serverManager = null;
exports.serverManager = serverManager;
let autoUpdaterManager = null;
exports.autoUpdaterManager = autoUpdaterManager;
let trayManager = null;
/**
 * Ensure single instance of the application
 */
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_log_1.default.warn('Another instance is already running. Quitting...');
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Focus the main window if a second instance is attempted
        const mainWindow = windowManager?.getMainWindow();
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }
            mainWindow.focus();
        }
        // Handle protocol URLs from second instance
        const url = commandLine.find((arg) => arg.startsWith('polaris://'));
        if (url) {
            handleProtocolUrl(url);
        }
    });
}
/**
 * Handle protocol URLs (polaris://)
 */
function handleProtocolUrl(url) {
    electron_log_1.default.info('Handling protocol URL:', url);
    const mainWindow = windowManager?.getMainWindow();
    if (mainWindow) {
        mainWindow.webContents.send('protocol-url', url);
    }
}
/**
 * Register the polaris:// protocol
 */
function registerProtocol() {
    if (process.defaultApp) {
        if (process.argv.length >= 2) {
            electron_1.app.setAsDefaultProtocolClient('polaris', process.execPath, [
                path_1.default.resolve(process.argv[1]),
            ]);
        }
    }
    else {
        electron_1.app.setAsDefaultProtocolClient('polaris');
    }
}
/**
 * Initialize the application
 */
async function initialize() {
    electron_log_1.default.info('Initializing Polaris IDE...');
    electron_log_1.default.info('App version:', electron_1.app.getVersion());
    electron_log_1.default.info('Electron version:', process.versions.electron);
    electron_log_1.default.info('Chrome version:', process.versions.chrome);
    electron_log_1.default.info('Node version:', process.versions.node);
    electron_log_1.default.info('Is packaged:', electron_1.app.isPackaged);
    // Register custom protocol
    registerProtocol();
    // Start the Next.js server
    exports.serverManager = serverManager = new server_manager_1.ServerManager();
    const serverPort = await serverManager.start();
    electron_log_1.default.info(`Next.js server started on port ${serverPort}`);
    // Create the main window
    exports.windowManager = windowManager = new window_manager_1.WindowManager(serverPort);
    const mainWindow = windowManager.createMainWindow();
    // Register IPC handlers
    (0, ipc_1.registerAllIpcHandlers)();
    // Set up application menu
    (0, menu_1.createApplicationMenu)(mainWindow);
    // Initialize auto-updater (production only)
    if (electron_1.app.isPackaged) {
        exports.autoUpdaterManager = autoUpdaterManager = new auto_updater_1.AutoUpdaterManager(mainWindow);
        (0, auto_updater_1.registerUpdaterHandlers)(autoUpdaterManager);
    }
    // Initialize system tray (optional)
    // trayManager = new TrayManager(mainWindow);
    electron_log_1.default.info('Polaris IDE initialized successfully');
}
/**
 * Application ready event
 */
electron_1.app.whenReady().then(async () => {
    electron_log_1.default.info('App ready event received');
    try {
        await initialize();
    }
    catch (error) {
        electron_log_1.default.error('Failed to initialize application:', error);
        electron_1.app.quit();
    }
    // macOS: Re-create window when dock icon is clicked
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            windowManager?.createMainWindow();
        }
    });
});
/**
 * Window all closed event
 */
electron_1.app.on('window-all-closed', () => {
    // On macOS, keep the app running unless explicitly quit
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
/**
 * Before quit - cleanup
 */
electron_1.app.on('before-quit', async () => {
    electron_log_1.default.info('Application quitting...');
    // Stop the Next.js server
    if (serverManager) {
        await serverManager.stop();
    }
    // Clean up tray
    if (trayManager !== null) {
        trayManager.destroy();
    }
});
/**
 * Handle certificate errors (development only)
 */
electron_1.app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (!electron_1.app.isPackaged) {
        // In development, allow localhost with self-signed certs
        event.preventDefault();
        callback(true);
    }
    else {
        callback(false);
    }
});
/**
 * Prevent new window creation (security)
 */
electron_1.app.on('web-contents-created', (event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
        // Open external links in the default browser
        if (url.startsWith('https://') || url.startsWith('http://')) {
            electron_1.shell.openExternal(url);
        }
        return { action: 'deny' };
    });
    // Prevent navigation to external sites
    contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        const serverPort = serverManager?.getPort() || 3000;
        // Only allow navigation to localhost (our server)
        if (parsedUrl.origin !== `http://localhost:${serverPort}`) {
            event.preventDefault();
            electron_log_1.default.warn('Blocked navigation to:', navigationUrl);
        }
    });
});
/**
 * Handle open-url event (macOS protocol handler)
 */
electron_1.app.on('open-url', (event, url) => {
    event.preventDefault();
    handleProtocolUrl(url);
});
/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
    electron_log_1.default.error('Unhandled Promise Rejection:', reason);
});
/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
    electron_log_1.default.error('Uncaught Exception:', error);
    // Don't exit immediately in production - show error dialog
    if (electron_1.app.isPackaged) {
        const { dialog } = require('electron');
        dialog.showErrorBox('An error occurred', error.message);
    }
});
//# sourceMappingURL=index.js.map