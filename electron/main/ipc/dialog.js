"use strict";
/**
 * Dialog IPC Handlers
 *
 * Provides native dialog access to the renderer process
 * Includes file/folder pickers, message boxes, and error dialogs
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDialogHandlers = registerDialogHandlers;
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
/**
 * Get the focused window for dialog parent
 */
function getFocusedWindow() {
    return electron_1.BrowserWindow.getFocusedWindow() || electron_1.BrowserWindow.getAllWindows()[0] || undefined;
}
/**
 * Register dialog IPC handlers
 */
function registerDialogHandlers() {
    // Show open dialog (file/folder picker)
    electron_1.ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
        try {
            const window = getFocusedWindow();
            const result = window
                ? await electron_1.dialog.showOpenDialog(window, options)
                : await electron_1.dialog.showOpenDialog(options);
            return {
                success: true,
                data: {
                    canceled: result.canceled,
                    filePaths: result.filePaths,
                },
            };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('dialog:showOpenDialog error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Show save dialog
    electron_1.ipcMain.handle('dialog:showSaveDialog', async (event, options) => {
        try {
            const window = getFocusedWindow();
            const result = window
                ? await electron_1.dialog.showSaveDialog(window, options)
                : await electron_1.dialog.showSaveDialog(options);
            return {
                success: true,
                data: {
                    canceled: result.canceled,
                    filePath: result.filePath,
                },
            };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('dialog:showSaveDialog error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Show message box
    electron_1.ipcMain.handle('dialog:showMessageBox', async (event, options) => {
        try {
            const window = getFocusedWindow();
            const result = window
                ? await electron_1.dialog.showMessageBox(window, options)
                : await electron_1.dialog.showMessageBox(options);
            return {
                success: true,
                data: {
                    response: result.response,
                    checkboxChecked: result.checkboxChecked,
                },
            };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('dialog:showMessageBox error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Show error box (synchronous, blocking)
    electron_1.ipcMain.handle('dialog:showErrorBox', async (event, title, content) => {
        try {
            electron_1.dialog.showErrorBox(title, content);
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('dialog:showErrorBox error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Show open file dialog (convenience wrapper)
    electron_1.ipcMain.handle('dialog:openFile', async (event, options) => {
        try {
            const window = getFocusedWindow();
            const dialogOptions = {
                title: options?.title || 'Open File',
                defaultPath: options?.defaultPath,
                filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
                properties: options?.multiple
                    ? ['openFile', 'multiSelections']
                    : ['openFile'],
            };
            const result = window
                ? await electron_1.dialog.showOpenDialog(window, dialogOptions)
                : await electron_1.dialog.showOpenDialog(dialogOptions);
            return {
                success: true,
                data: {
                    canceled: result.canceled,
                    filePaths: result.filePaths,
                },
            };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('dialog:openFile error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Show open folder dialog (convenience wrapper)
    electron_1.ipcMain.handle('dialog:openFolder', async (event, options) => {
        try {
            const window = getFocusedWindow();
            const dialogOptions = {
                title: options?.title || 'Open Folder',
                defaultPath: options?.defaultPath,
                properties: options?.multiple
                    ? ['openDirectory', 'multiSelections']
                    : ['openDirectory'],
            };
            const result = window
                ? await electron_1.dialog.showOpenDialog(window, dialogOptions)
                : await electron_1.dialog.showOpenDialog(dialogOptions);
            return {
                success: true,
                data: {
                    canceled: result.canceled,
                    folderPaths: result.filePaths,
                },
            };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('dialog:openFolder error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Show save file dialog (convenience wrapper)
    electron_1.ipcMain.handle('dialog:saveFile', async (event, options) => {
        try {
            const window = getFocusedWindow();
            const dialogOptions = {
                title: options?.title || 'Save File',
                defaultPath: options?.defaultPath,
                filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
            };
            const result = window
                ? await electron_1.dialog.showSaveDialog(window, dialogOptions)
                : await electron_1.dialog.showSaveDialog(dialogOptions);
            return {
                success: true,
                data: {
                    canceled: result.canceled,
                    filePath: result.filePath,
                },
            };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('dialog:saveFile error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Show confirmation dialog
    electron_1.ipcMain.handle('dialog:confirm', async (event, options) => {
        try {
            const window = getFocusedWindow();
            const dialogOptions = {
                type: 'question',
                title: options.title,
                message: options.message,
                detail: options.detail,
                buttons: [
                    options.cancelLabel || 'Cancel',
                    options.confirmLabel || 'OK',
                ],
                defaultId: 1,
                cancelId: 0,
            };
            const result = window
                ? await electron_1.dialog.showMessageBox(window, dialogOptions)
                : await electron_1.dialog.showMessageBox(dialogOptions);
            return {
                success: true,
                data: {
                    confirmed: result.response === 1,
                },
            };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('dialog:confirm error:', err.message);
            return { success: false, error: err.message };
        }
    });
    electron_log_1.default.info('Dialog IPC handlers registered');
}
//# sourceMappingURL=dialog.js.map