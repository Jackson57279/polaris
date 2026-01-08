"use strict";
/**
 * Window IPC Handlers
 *
 * Provides window control access to the renderer process
 * Includes minimize, maximize, close, and state queries
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWindowHandlers = registerWindowHandlers;
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
/**
 * Get the focused window or first available window
 */
function getWindow() {
    return electron_1.BrowserWindow.getFocusedWindow() || electron_1.BrowserWindow.getAllWindows()[0] || null;
}
/**
 * Register window IPC handlers
 */
function registerWindowHandlers() {
    // Minimize window
    electron_1.ipcMain.handle('window:minimize', async () => {
        try {
            const window = getWindow();
            if (window) {
                window.minimize();
            }
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('window:minimize error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Maximize/unmaximize window
    electron_1.ipcMain.handle('window:maximize', async () => {
        try {
            const window = getWindow();
            if (window) {
                if (window.isMaximized()) {
                    window.unmaximize();
                }
                else {
                    window.maximize();
                }
            }
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('window:maximize error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Close window
    electron_1.ipcMain.handle('window:close', async () => {
        try {
            const window = getWindow();
            if (window) {
                window.close();
            }
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('window:close error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Toggle fullscreen
    electron_1.ipcMain.handle('window:toggleFullscreen', async () => {
        try {
            const window = getWindow();
            if (window) {
                window.setFullScreen(!window.isFullScreen());
            }
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('window:toggleFullscreen error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Check if window is maximized
    electron_1.ipcMain.handle('window:isMaximized', async () => {
        try {
            const window = getWindow();
            return { success: true, data: window?.isMaximized() ?? false };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('window:isMaximized error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Check if window is minimized
    electron_1.ipcMain.handle('window:isMinimized', async () => {
        try {
            const window = getWindow();
            return { success: true, data: window?.isMinimized() ?? false };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('window:isMinimized error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Check if window is fullscreen
    electron_1.ipcMain.handle('window:isFullscreen', async () => {
        try {
            const window = getWindow();
            return { success: true, data: window?.isFullScreen() ?? false };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('window:isFullscreen error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Check if window is focused
    electron_1.ipcMain.handle('window:isFocused', async () => {
        try {
            const window = getWindow();
            return { success: true, data: window?.isFocused() ?? false };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('window:isFocused error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Get window bounds
    electron_1.ipcMain.handle('window:getBounds', async () => {
        try {
            const window = getWindow();
            if (window) {
                const bounds = window.getBounds();
                return { success: true, data: bounds };
            }
            return { success: false, error: 'No window available' };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('window:getBounds error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Set window bounds
    electron_1.ipcMain.handle('window:setBounds', async (event, bounds) => {
        try {
            const window = getWindow();
            if (window) {
                window.setBounds(bounds);
            }
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('window:setBounds error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Get window state
    electron_1.ipcMain.handle('window:getState', async () => {
        try {
            const window = getWindow();
            if (window) {
                return {
                    success: true,
                    data: {
                        isMaximized: window.isMaximized(),
                        isMinimized: window.isMinimized(),
                        isFullscreen: window.isFullScreen(),
                        isFocused: window.isFocused(),
                        isVisible: window.isVisible(),
                        bounds: window.getBounds(),
                    },
                };
            }
            return { success: false, error: 'No window available' };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('window:getState error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Set window title
    electron_1.ipcMain.handle('window:setTitle', async (event, title) => {
        try {
            const window = getWindow();
            if (window) {
                window.setTitle(title);
            }
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('window:setTitle error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Focus window
    electron_1.ipcMain.handle('window:focus', async () => {
        try {
            const window = getWindow();
            if (window) {
                if (window.isMinimized()) {
                    window.restore();
                }
                window.focus();
            }
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('window:focus error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Show window
    electron_1.ipcMain.handle('window:show', async () => {
        try {
            const window = getWindow();
            if (window) {
                window.show();
            }
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('window:show error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Hide window
    electron_1.ipcMain.handle('window:hide', async () => {
        try {
            const window = getWindow();
            if (window) {
                window.hide();
            }
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('window:hide error:', err.message);
            return { success: false, error: err.message };
        }
    });
    electron_log_1.default.info('Window IPC handlers registered');
}
//# sourceMappingURL=window.js.map