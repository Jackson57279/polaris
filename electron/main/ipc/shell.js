"use strict";
/**
 * Shell IPC Handlers
 *
 * Provides shell operations to the renderer process
 * Includes opening URLs, files, and file locations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerShellHandlers = registerShellHandlers;
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
/**
 * Register IPC handlers on ipcMain for shell-related operations.
 *
 * Registers handlers for: `shell:openExternal`, `shell:openPath`,
 * `shell:showItemInFolder`, `shell:trashItem`, and `shell:beep`.
 * Each handler performs the corresponding Electron shell action and
 * returns a standardized result object: `{ success: true }` on success
 * or `{ success: false, error: string }` on failure.
 */
function registerShellHandlers() {
    // Open external URL in default browser
    electron_1.ipcMain.handle('shell:openExternal', async (event, url) => {
        try {
            // Validate URL
            const parsedUrl = new URL(url);
            const allowedProtocols = ['http:', 'https:', 'mailto:'];
            if (!allowedProtocols.includes(parsedUrl.protocol)) {
                return { success: false, error: `Protocol not allowed: ${parsedUrl.protocol}` };
            }
            await electron_1.shell.openExternal(url);
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('shell:openExternal error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Open a path with the system's default application
    electron_1.ipcMain.handle('shell:openPath', async (event, filePath) => {
        try {
            const errorMessage = await electron_1.shell.openPath(filePath);
            if (errorMessage) {
                return { success: false, error: errorMessage };
            }
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('shell:openPath error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Show item in folder (reveal in Finder/Explorer)
    electron_1.ipcMain.handle('shell:showItemInFolder', async (event, filePath) => {
        try {
            electron_1.shell.showItemInFolder(filePath);
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('shell:showItemInFolder error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Move item to trash
    electron_1.ipcMain.handle('shell:trashItem', async (event, filePath) => {
        try {
            await electron_1.shell.trashItem(filePath);
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('shell:trashItem error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Beep (system sound)
    electron_1.ipcMain.handle('shell:beep', async () => {
        try {
            electron_1.shell.beep();
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('shell:beep error:', err.message);
            return { success: false, error: err.message };
        }
    });
    electron_log_1.default.info('Shell IPC handlers registered');
}
//# sourceMappingURL=shell.js.map