"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWindowHandlers = registerWindowHandlers;
const electron_1 = require("electron");
function registerWindowHandlers(mainWindow) {
    electron_1.ipcMain.handle('window:minimize', () => {
        mainWindow.minimize();
        return { success: true };
    });
    electron_1.ipcMain.handle('window:maximize', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        }
        else {
            mainWindow.maximize();
        }
        return { success: true };
    });
    electron_1.ipcMain.handle('window:close', () => {
        mainWindow.close();
        return { success: true };
    });
    electron_1.ipcMain.handle('window:isMaximized', () => {
        return { success: true, data: mainWindow.isMaximized() };
    });
}
//# sourceMappingURL=window.js.map