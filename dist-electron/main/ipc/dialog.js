"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDialogHandlers = registerDialogHandlers;
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
function registerDialogHandlers(mainWindow) {
    electron_1.ipcMain.handle('dialog:showOpenDialog', async (_, options) => {
        try {
            const result = await electron_1.dialog.showOpenDialog(mainWindow, options);
            return { success: true, data: result };
        }
        catch (error) {
            electron_log_1.default.error('dialog:showOpenDialog error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    });
    electron_1.ipcMain.handle('dialog:showSaveDialog', async (_, options) => {
        try {
            const result = await electron_1.dialog.showSaveDialog(mainWindow, options);
            return { success: true, data: result };
        }
        catch (error) {
            electron_log_1.default.error('dialog:showSaveDialog error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    });
}
//# sourceMappingURL=dialog.js.map