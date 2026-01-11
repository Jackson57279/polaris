"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerExternalUrlHandlers = registerExternalUrlHandlers;
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
function registerExternalUrlHandlers() {
    electron_1.ipcMain.handle('external:openUrl', async (_, url) => {
        try {
            // Validate URL
            const parsedUrl = new URL(url);
            // Only allow http and https protocols for security
            if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
                electron_log_1.default.warn('Blocked opening URL with invalid protocol:', url);
                return { success: false, error: 'Invalid protocol' };
            }
            electron_log_1.default.info('Opening external URL:', url);
            await electron_1.shell.openExternal(url);
            return { success: true };
        }
        catch (error) {
            electron_log_1.default.error('external:openUrl error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    });
}
//# sourceMappingURL=external-url.js.map