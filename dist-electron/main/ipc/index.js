"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ipcMain = void 0;
exports.registerIpcHandlers = registerIpcHandlers;
const electron_1 = require("electron");
Object.defineProperty(exports, "ipcMain", { enumerable: true, get: function () { return electron_1.ipcMain; } });
const file_system_1 = require("./file-system");
const dialog_1 = require("./dialog");
const window_1 = require("./window");
const notification_1 = require("./notification");
const external_url_1 = require("./external-url");
function registerIpcHandlers(mainWindow) {
    (0, file_system_1.registerFileSystemHandlers)();
    (0, dialog_1.registerDialogHandlers)(mainWindow);
    (0, window_1.registerWindowHandlers)(mainWindow);
    (0, notification_1.registerNotificationHandlers)();
    (0, external_url_1.registerExternalUrlHandlers)();
}
//# sourceMappingURL=index.js.map