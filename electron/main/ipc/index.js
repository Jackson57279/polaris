"use strict";
/**
 * IPC Handler Registration
 *
 * Central registration point for all IPC handlers
 * Organizes handlers by domain (file system, dialog, window, etc.)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerShellHandlers = exports.registerAppHandlers = exports.registerNotificationHandlers = exports.registerWindowHandlers = exports.registerDialogHandlers = exports.registerFileSystemHandlers = void 0;
exports.registerAllIpcHandlers = registerAllIpcHandlers;
const file_system_1 = require("./file-system");
Object.defineProperty(exports, "registerFileSystemHandlers", { enumerable: true, get: function () { return file_system_1.registerFileSystemHandlers; } });
const dialog_1 = require("./dialog");
Object.defineProperty(exports, "registerDialogHandlers", { enumerable: true, get: function () { return dialog_1.registerDialogHandlers; } });
const window_1 = require("./window");
Object.defineProperty(exports, "registerWindowHandlers", { enumerable: true, get: function () { return window_1.registerWindowHandlers; } });
const notification_1 = require("./notification");
Object.defineProperty(exports, "registerNotificationHandlers", { enumerable: true, get: function () { return notification_1.registerNotificationHandlers; } });
const app_1 = require("./app");
Object.defineProperty(exports, "registerAppHandlers", { enumerable: true, get: function () { return app_1.registerAppHandlers; } });
const shell_1 = require("./shell");
Object.defineProperty(exports, "registerShellHandlers", { enumerable: true, get: function () { return shell_1.registerShellHandlers; } });
const electron_log_1 = __importDefault(require("electron-log"));
/**
 * Register all IPC handlers
 *
 * This should be called once during app initialization
 */
function registerAllIpcHandlers() {
    electron_log_1.default.info('Registering IPC handlers...');
    // File system operations
    (0, file_system_1.registerFileSystemHandlers)();
    // Native dialogs
    (0, dialog_1.registerDialogHandlers)();
    // Window controls
    (0, window_1.registerWindowHandlers)();
    // System notifications
    (0, notification_1.registerNotificationHandlers)();
    // App operations
    (0, app_1.registerAppHandlers)();
    // Shell operations
    (0, shell_1.registerShellHandlers)();
    electron_log_1.default.info('All IPC handlers registered');
}
//# sourceMappingURL=index.js.map