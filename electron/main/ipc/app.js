"use strict";
/**
 * App IPC Handlers
 *
 * Provides app-level operations to the renderer process
 * Includes version info, paths, and app lifecycle controls
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAppHandlers = registerAppHandlers;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const electron_log_1 = __importDefault(require("electron-log"));
/**
 * Register IPC handlers exposing app-level information and controls to renderer processes.
 *
 * Installs channels (version, name, packaging state, common paths, lifecycle controls, platform/locale info, resource resolution, AppUserModelId, GPU info, and app metrics) that respond with a standardized `{ success: true, data }` or `{ success: false, error }` payload; errors are logged and returned.
 */
function registerAppHandlers() {
    // Get app version
    electron_1.ipcMain.handle('app:getVersion', async () => {
        return { success: true, data: electron_1.app.getVersion() };
    });
    // Get app name
    electron_1.ipcMain.handle('app:getName', async () => {
        return { success: true, data: electron_1.app.getName() };
    });
    // Check if app is packaged
    electron_1.ipcMain.handle('app:isPackaged', async () => {
        return { success: true, data: electron_1.app.isPackaged };
    });
    // Get app path
    electron_1.ipcMain.handle('app:getPath', async (event, name) => {
        try {
            const appPath = electron_1.app.getPath(name);
            return { success: true, data: appPath };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('app:getPath error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Get app paths (common paths)
    electron_1.ipcMain.handle('app:getPaths', async () => {
        try {
            return {
                success: true,
                data: {
                    userData: electron_1.app.getPath('userData'),
                    home: electron_1.app.getPath('home'),
                    temp: electron_1.app.getPath('temp'),
                    documents: electron_1.app.getPath('documents'),
                    downloads: electron_1.app.getPath('downloads'),
                    desktop: electron_1.app.getPath('desktop'),
                    exe: electron_1.app.getPath('exe'),
                    appData: electron_1.app.getPath('appData'),
                },
            };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('app:getPaths error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Quit the app
    electron_1.ipcMain.handle('app:quit', async () => {
        try {
            electron_1.app.quit();
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('app:quit error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Relaunch the app
    electron_1.ipcMain.handle('app:relaunch', async () => {
        try {
            electron_1.app.relaunch();
            electron_1.app.quit();
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('app:relaunch error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Get platform info
    electron_1.ipcMain.handle('app:getPlatformInfo', async () => {
        return {
            success: true,
            data: {
                platform: process.platform,
                arch: process.arch,
                electronVersion: process.versions.electron,
                chromeVersion: process.versions.chrome,
                nodeVersion: process.versions.node,
            },
        };
    });
    // Get locale
    electron_1.ipcMain.handle('app:getLocale', async () => {
        return { success: true, data: electron_1.app.getLocale() };
    });
    // Get system locale
    electron_1.ipcMain.handle('app:getSystemLocale', async () => {
        return { success: true, data: electron_1.app.getSystemLocale() };
    });
    // Check if running in development mode
    electron_1.ipcMain.handle('app:isDevelopment', async () => {
        return { success: true, data: process.env.NODE_ENV === 'development' };
    });
    // Get resource path
    electron_1.ipcMain.handle('app:getResourcePath', async (event, resource) => {
        try {
            const resourcePath = electron_1.app.isPackaged
                ? path_1.default.join(process.resourcesPath, resource)
                : path_1.default.join(__dirname, '../..', resource);
            return { success: true, data: resourcePath };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('app:getResourcePath error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Set app user model id (Windows)
    electron_1.ipcMain.handle('app:setAppUserModelId', async (event, id) => {
        try {
            if (process.platform === 'win32') {
                electron_1.app.setAppUserModelId(id);
            }
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('app:setAppUserModelId error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Get GPU info
    electron_1.ipcMain.handle('app:getGPUInfo', async (event, infoType = 'basic') => {
        try {
            const gpuInfo = await electron_1.app.getGPUInfo(infoType);
            return { success: true, data: gpuInfo };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('app:getGPUInfo error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Get app metrics
    electron_1.ipcMain.handle('app:getAppMetrics', async () => {
        try {
            const metrics = electron_1.app.getAppMetrics();
            return { success: true, data: metrics };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('app:getAppMetrics error:', err.message);
            return { success: false, error: err.message };
        }
    });
    electron_log_1.default.info('App IPC handlers registered');
}
//# sourceMappingURL=app.js.map