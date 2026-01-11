"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFileSystemHandlers = registerFileSystemHandlers;
const electron_1 = require("electron");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const chokidar_1 = require("chokidar");
const electron_log_1 = __importDefault(require("electron-log"));
const watchers = new Map();
async function isPathSafe(filePath) {
    try {
        // Resolve symlinks and get real path
        const realPath = await promises_1.default.realpath(filePath);
        const normalized = path_1.default.normalize(realPath);
        // Define forbidden directories with proper separators
        if (process.platform === 'win32') {
            const lowerPath = normalized.toLowerCase();
            const windowsForbidden = [
                'c:\\windows',
                'c:\\program files',
                'c:\\programdata',
                path_1.default.join(process.env.APPDATA || '').toLowerCase()
            ];
            return !windowsForbidden.some(forbidden => {
                if (!forbidden)
                    return false;
                return lowerPath === forbidden || lowerPath.startsWith(forbidden + path_1.default.sep);
            });
        }
        // Unix/Linux/macOS forbidden paths
        const forbidden = ['/etc', '/sys', '/proc', '/root', '/boot', '/dev', '/var', '/usr', '/bin', '/sbin'];
        return !forbidden.some(dir => {
            return normalized === dir || normalized.startsWith(dir + path_1.default.sep);
        });
    }
    catch {
        // If realpath fails (e.g., file doesn't exist), fall back to resolve
        const resolved = path_1.default.resolve(filePath);
        const normalized = path_1.default.normalize(resolved);
        if (process.platform === 'win32') {
            const lowerPath = normalized.toLowerCase();
            const windowsForbidden = ['c:\\windows', 'c:\\program files', 'c:\\programdata'];
            return !windowsForbidden.some(forbidden => {
                return lowerPath === forbidden || lowerPath.startsWith(forbidden + path_1.default.sep);
            });
        }
        const forbidden = ['/etc', '/sys', '/proc', '/root', '/boot', '/dev', '/var', '/usr', '/bin', '/sbin'];
        return !forbidden.some(dir => {
            return normalized === dir || normalized.startsWith(dir + path_1.default.sep);
        });
    }
}
function registerFileSystemHandlers() {
    electron_1.ipcMain.handle('fs:readFile', async (_, filePath) => {
        try {
            if (!(await isPathSafe(filePath))) {
                return { success: false, error: 'Access to this path is forbidden' };
            }
            const content = await promises_1.default.readFile(filePath, 'utf-8');
            return { success: true, data: content };
        }
        catch (error) {
            electron_log_1.default.error('fs:readFile error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    });
    electron_1.ipcMain.handle('fs:writeFile', async (_, filePath, content) => {
        try {
            if (!(await isPathSafe(filePath))) {
                return { success: false, error: 'Access to this path is forbidden' };
            }
            // Ensure directory exists
            await promises_1.default.mkdir(path_1.default.dirname(filePath), { recursive: true });
            await promises_1.default.writeFile(filePath, content, 'utf-8');
            return { success: true };
        }
        catch (error) {
            electron_log_1.default.error('fs:writeFile error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    });
    electron_1.ipcMain.handle('fs:readDirectory', async (_, dirPath) => {
        try {
            if (!(await isPathSafe(dirPath))) {
                return { success: false, error: 'Access to this path is forbidden' };
            }
            const entries = await promises_1.default.readdir(dirPath, { withFileTypes: true });
            const items = await Promise.all(entries.map(async (entry) => {
                const fullPath = path_1.default.join(dirPath, entry.name);
                try {
                    const stats = await promises_1.default.stat(fullPath);
                    return {
                        name: entry.name,
                        path: fullPath,
                        type: entry.isDirectory() ? 'directory' : 'file',
                        size: stats.size,
                        modified: stats.mtime.getTime()
                    };
                }
                catch (entryError) {
                    // Return entry with error flag if stat fails
                    const message = entryError instanceof Error ? entryError.message : 'Unknown error';
                    electron_log_1.default.warn(`Failed to stat ${fullPath}:`, message);
                    return {
                        name: entry.name,
                        path: fullPath,
                        type: entry.isDirectory() ? 'directory' : 'file',
                        error: message
                    };
                }
            }));
            // Filter out null entries if any
            const validItems = items.filter(item => item !== null);
            return { success: true, data: validItems };
        }
        catch (error) {
            electron_log_1.default.error('fs:readDirectory error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    });
    electron_1.ipcMain.handle('fs:createDirectory', async (_, dirPath) => {
        try {
            if (!(await isPathSafe(dirPath))) {
                return { success: false, error: 'Access to this path is forbidden' };
            }
            await promises_1.default.mkdir(dirPath, { recursive: true });
            return { success: true };
        }
        catch (error) {
            electron_log_1.default.error('fs:createDirectory error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    });
    electron_1.ipcMain.handle('fs:deleteEntry', async (_, entryPath) => {
        try {
            if (!(await isPathSafe(entryPath))) {
                return { success: false, error: 'Access to this path is forbidden' };
            }
            const stats = await promises_1.default.stat(entryPath);
            if (stats.isDirectory()) {
                await promises_1.default.rm(entryPath, { recursive: true });
            }
            else {
                await promises_1.default.unlink(entryPath);
            }
            return { success: true };
        }
        catch (error) {
            electron_log_1.default.error('fs:deleteEntry error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    });
    electron_1.ipcMain.handle('fs:watchDirectory', async (event, dirPath) => {
        try {
            if (!(await isPathSafe(dirPath))) {
                return { success: false, error: 'Access to this path is forbidden' };
            }
            if (watchers.has(dirPath)) {
                return { success: true };
            }
            const watcher = (0, chokidar_1.watch)(dirPath, {
                persistent: true,
                ignoreInitial: true,
                depth: 1
            });
            watcher
                .on('add', (filePath) => {
                if (event.sender && !event.sender.isDestroyed()) {
                    event.sender.send('fs:fileEvent', { type: 'add', path: filePath });
                }
                else {
                    watcher.close();
                    watchers.delete(dirPath);
                }
            })
                .on('change', (filePath) => {
                if (event.sender && !event.sender.isDestroyed()) {
                    event.sender.send('fs:fileEvent', { type: 'change', path: filePath });
                }
                else {
                    watcher.close();
                    watchers.delete(dirPath);
                }
            })
                .on('unlink', (filePath) => {
                if (event.sender && !event.sender.isDestroyed()) {
                    event.sender.send('fs:fileEvent', { type: 'delete', path: filePath });
                }
                else {
                    watcher.close();
                    watchers.delete(dirPath);
                }
            })
                .on('addDir', (filePath) => {
                if (event.sender && !event.sender.isDestroyed()) {
                    event.sender.send('fs:fileEvent', { type: 'addDir', path: filePath });
                }
                else {
                    watcher.close();
                    watchers.delete(dirPath);
                }
            })
                .on('unlinkDir', (filePath) => {
                if (event.sender && !event.sender.isDestroyed()) {
                    event.sender.send('fs:fileEvent', { type: 'deleteDir', path: filePath });
                }
                else {
                    watcher.close();
                    watchers.delete(dirPath);
                }
            });
            watchers.set(dirPath, watcher);
            return { success: true };
        }
        catch (error) {
            electron_log_1.default.error('fs:watchDirectory error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    });
    electron_1.ipcMain.handle('fs:unwatchDirectory', async (_, dirPath) => {
        try {
            const watcher = watchers.get(dirPath);
            if (watcher) {
                await watcher.close();
                watchers.delete(dirPath);
            }
            return { success: true };
        }
        catch (error) {
            electron_log_1.default.error('fs:unwatchDirectory error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    });
}
//# sourceMappingURL=file-system.js.map