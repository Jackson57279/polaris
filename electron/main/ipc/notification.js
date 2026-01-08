"use strict";
/**
 * Notification IPC Handlers
 *
 * Provides native notification access to the renderer process
 * Uses Electron's Notification API for system notifications
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerNotificationHandlers = registerNotificationHandlers;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const electron_log_1 = __importDefault(require("electron-log"));
/**
 * Get the default notification icon
 */
function getDefaultIcon() {
    const iconPath = path_1.default.join(__dirname, '../resources/icons/icon.png');
    try {
        return electron_1.nativeImage.createFromPath(iconPath);
    }
    catch {
        return undefined;
    }
}
/**
 * Register notification IPC handlers
 */
function registerNotificationHandlers() {
    // Check if notifications are supported
    electron_1.ipcMain.handle('notification:isSupported', async () => {
        return { success: true, data: electron_1.Notification.isSupported() };
    });
    // Show a notification
    electron_1.ipcMain.handle('notification:show', async (event, options) => {
        try {
            if (!electron_1.Notification.isSupported()) {
                return { success: false, error: 'Notifications not supported' };
            }
            const notification = new electron_1.Notification({
                title: options.title,
                body: options.body,
                icon: options.icon ? electron_1.nativeImage.createFromPath(options.icon) : getDefaultIcon(),
                silent: options.silent,
                urgency: options.urgency,
                actions: options.actions,
                closeButtonText: options.closeButtonText,
                timeoutType: options.timeoutType,
            });
            // Set up event listeners
            notification.on('click', () => {
                event.sender.send('notification:click', { title: options.title });
            });
            notification.on('close', () => {
                event.sender.send('notification:close', { title: options.title });
            });
            notification.on('action', (actionEvent, index) => {
                event.sender.send('notification:action', {
                    title: options.title,
                    actionIndex: index,
                });
            });
            notification.on('failed', (failEvent, error) => {
                event.sender.send('notification:failed', {
                    title: options.title,
                    error,
                });
            });
            notification.show();
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('notification:show error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Show a simple notification
    electron_1.ipcMain.handle('notification:simple', async (event, title, body) => {
        try {
            if (!electron_1.Notification.isSupported()) {
                return { success: false, error: 'Notifications not supported' };
            }
            const notification = new electron_1.Notification({
                title,
                body,
                icon: getDefaultIcon(),
            });
            notification.show();
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('notification:simple error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Request notification permission (for consistency with browser API)
    electron_1.ipcMain.handle('notification:requestPermission', async () => {
        // Electron notifications don't require permission like browser notifications
        // But we check if they're supported
        return {
            success: true,
            data: electron_1.Notification.isSupported() ? 'granted' : 'denied',
        };
    });
    // Set app badge count (macOS/Linux)
    electron_1.ipcMain.handle('notification:setBadgeCount', async (event, count) => {
        try {
            if (process.platform === 'darwin' || process.platform === 'linux') {
                electron_1.app.setBadgeCount(count);
            }
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('notification:setBadgeCount error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Get app badge count
    electron_1.ipcMain.handle('notification:getBadgeCount', async () => {
        try {
            const count = electron_1.app.getBadgeCount();
            return { success: true, data: count };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('notification:getBadgeCount error:', err.message);
            return { success: false, error: err.message };
        }
    });
    electron_log_1.default.info('Notification IPC handlers registered');
}
//# sourceMappingURL=notification.js.map