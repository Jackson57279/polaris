"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const electron_log_1 = __importDefault(require("electron-log"));
const window_manager_1 = require("./window-manager");
const server_manager_1 = require("./server-manager");
const ipc_1 = require("./ipc");
const auto_updater_1 = require("./auto-updater");
const menu_1 = require("./menu");
electron_log_1.default.initialize();
const isDev = process.env.NODE_ENV === 'development';
let windowManager = null;
let serverManager = null;
async function createApplication() {
    try {
        electron_log_1.default.info('Starting Polaris IDE application...');
        // Start Next.js server
        serverManager = new server_manager_1.ServerManager(isDev);
        const port = await serverManager.start();
        electron_log_1.default.info(`Next.js server started on port ${port}`);
        // Create main window
        windowManager = new window_manager_1.WindowManager(port, isDev);
        const mainWindow = await windowManager.createMainWindow();
        electron_log_1.default.info('Main window created');
        // Register IPC handlers
        (0, ipc_1.registerIpcHandlers)(mainWindow);
        electron_log_1.default.info('IPC handlers registered');
        // Setup application menu
        (0, menu_1.setupMenu)(mainWindow);
        // Setup auto-updater (production only)
        if (!isDev) {
            (0, auto_updater_1.setupAutoUpdater)(mainWindow);
        }
        electron_log_1.default.info('Application started successfully');
    }
    catch (error) {
        electron_log_1.default.error('Failed to start application:', error);
        electron_1.app.quit();
    }
}
// Single instance lock
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_log_1.default.info('Another instance is already running');
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => {
        if (windowManager) {
            const mainWindow = windowManager.getMainWindow();
            if (mainWindow) {
                if (mainWindow.isMinimized())
                    mainWindow.restore();
                mainWindow.focus();
            }
        }
    });
    electron_1.app.whenReady().then(() => {
        // Register protocol in production
        if (!isDev) {
            electron_1.protocol.registerFileProtocol('polaris', (request, callback) => {
                try {
                    // Remove protocol prefix and decode
                    let sanitizedUrl = request.url.replace('polaris://', '');
                    sanitizedUrl = decodeURIComponent(sanitizedUrl);
                    // Remove leading slashes
                    sanitizedUrl = sanitizedUrl.replace(/^\/+/, '');
                    // Define safe base directory
                    const baseDir = path_1.default.resolve(__dirname);
                    // Resolve absolute path
                    const resolvedPath = path_1.default.resolve(baseDir, sanitizedUrl);
                    // Verify path is within base directory
                    if (!resolvedPath.startsWith(baseDir)) {
                        electron_log_1.default.error('Protocol path traversal attempt:', request.url);
                        return callback({ error: -6 }); // FILE_NOT_FOUND
                    }
                    return callback(resolvedPath);
                }
                catch (error) {
                    electron_log_1.default.error('Protocol error:', error);
                    return callback({ error: -2 });
                }
            });
        }
        createApplication();
    });
    electron_1.app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            electron_1.app.quit();
        }
    });
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createApplication();
        }
    });
    electron_1.app.on('before-quit', (event) => {
        electron_log_1.default.info('Application shutting down...');
        if (serverManager) {
            event.preventDefault();
            serverManager.stop()
                .then(() => {
                electron_log_1.default.info('Server stopped successfully');
                electron_1.app.quit();
            })
                .catch((error) => {
                electron_log_1.default.error('Error stopping server:', error);
                electron_1.app.quit();
            });
        }
    });
}
//# sourceMappingURL=index.js.map