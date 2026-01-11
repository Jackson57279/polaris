"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerNotificationHandlers = registerNotificationHandlers;
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
function registerNotificationHandlers() {
    electron_1.ipcMain.handle('notification:show', async (_, options) => {
        try {
            // Check if notifications are supported
            if (!electron_1.Notification.isSupported()) {
                electron_log_1.default.warn('Notifications are not supported on this platform');
                return { success: false, error: 'Notifications not supported' };
            }
            const notification = new electron_1.Notification({
                title: options.title,
                body: options.body
            });
            notification.show();
            return { success: true };
        }
        catch (error) {
            electron_log_1.default.error('notification:show error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    });
}
//# sourceMappingURL=notification.js.map