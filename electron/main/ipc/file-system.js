"use strict";
/**
 * File System IPC Handlers
 *
 * Provides native file system access to the renderer process
 * Replaces the limited browser File System Access API
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFileSystemHandlers = registerFileSystemHandlers;
exports.cleanupFileWatchers = cleanupFileWatchers;
const electron_1 = require("electron");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const chokidar_1 = __importDefault(require("chokidar"));
const electron_log_1 = __importDefault(require("electron-log"));
// Store active file watchers
const watchers = new Map();
// Forbidden paths that should never be accessed
const FORBIDDEN_PATHS = [
    '/etc',
    '/sys',
    '/proc',
    '/dev',
    '/boot',
    '/root',
    'C:\\Windows',
    'C:\\Program Files',
    'C:\\Program Files (x86)',
];
/**
 * Determine whether a given file system path is allowed for access.
 *
 * Validates that the provided path does not perform directory traversal that escapes the current directory and does not reside under any configured forbidden root paths.
 *
 * @param {string} filePath - The file or directory path to validate; may be relative or absolute.
 * @returns {boolean} `true` if the path is considered safe to access, `false` otherwise.
 */
function isPathSafe(filePath) {
    const resolved = path_1.default.resolve(filePath);
    const normalized = path_1.default.normalize(resolved);
    // Check for directory traversal attempts
    if (filePath.includes('..')) {
        // Allow relative paths but ensure they don't escape
        if (!normalized.startsWith(path_1.default.resolve('.'))) {
            return false;
        }
    }
    // Check against forbidden paths
    for (const forbidden of FORBIDDEN_PATHS) {
        if (normalized.toLowerCase().startsWith(forbidden.toLowerCase())) {
            return false;
        }
    }
    return true;
}
/**
 * Register IPC handlers that expose native-like file system operations to renderer processes.
 *
 * The handlers perform path safety validation and return structured results in the form
 * `{ success: boolean, data?: any, error?: string, code?: any }`. Exposed operations include:
 * reading and writing files (text and base64), reading directory contents, creating and deleting
 * entries, renaming and copying files, existence checks, retrieving file/directory stats, and
 * watching/unwatching directories. Directory watchers forward events to the renderer:
 * `fs:fileAdded`, `fs:fileChanged`, `fs:fileDeleted`, `fs:directoryAdded`, `fs:directoryDeleted`,
 * and report errors via `fs:watchError`.
 */
function registerFileSystemHandlers() {
    // Read file
    electron_1.ipcMain.handle('fs:readFile', async (event, filePath, encoding = 'utf-8') => {
        try {
            if (!isPathSafe(filePath)) {
                return { success: false, error: 'Access denied: Invalid path' };
            }
            const content = await promises_1.default.readFile(filePath, encoding);
            return { success: true, data: content };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('fs:readFile error:', err.message);
            return { success: false, error: err.message, code: err.code };
        }
    });
    // Read file as binary
    electron_1.ipcMain.handle('fs:readFileBinary', async (event, filePath) => {
        try {
            if (!isPathSafe(filePath)) {
                return { success: false, error: 'Access denied: Invalid path' };
            }
            const content = await promises_1.default.readFile(filePath);
            return { success: true, data: content.toString('base64') };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('fs:readFileBinary error:', err.message);
            return { success: false, error: err.message, code: err.code };
        }
    });
    // Write file
    electron_1.ipcMain.handle('fs:writeFile', async (event, filePath, content, encoding = 'utf-8') => {
        try {
            if (!isPathSafe(filePath)) {
                return { success: false, error: 'Access denied: Invalid path' };
            }
            // Ensure parent directory exists
            await promises_1.default.mkdir(path_1.default.dirname(filePath), { recursive: true });
            await promises_1.default.writeFile(filePath, content, encoding);
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('fs:writeFile error:', err.message);
            return { success: false, error: err.message, code: err.code };
        }
    });
    // Write binary file
    electron_1.ipcMain.handle('fs:writeFileBinary', async (event, filePath, base64Content) => {
        try {
            if (!isPathSafe(filePath)) {
                return { success: false, error: 'Access denied: Invalid path' };
            }
            const buffer = Buffer.from(base64Content, 'base64');
            await promises_1.default.mkdir(path_1.default.dirname(filePath), { recursive: true });
            await promises_1.default.writeFile(filePath, buffer);
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('fs:writeFileBinary error:', err.message);
            return { success: false, error: err.message, code: err.code };
        }
    });
    // Read directory
    electron_1.ipcMain.handle('fs:readDirectory', async (event, dirPath) => {
        try {
            if (!isPathSafe(dirPath)) {
                return { success: false, error: 'Access denied: Invalid path' };
            }
            const entries = await promises_1.default.readdir(dirPath, { withFileTypes: true });
            const result = await Promise.all(entries.map(async (entry) => {
                const fullPath = path_1.default.join(dirPath, entry.name);
                let size = 0;
                let lastModified = 0;
                try {
                    if (entry.isFile()) {
                        const stats = await promises_1.default.stat(fullPath);
                        size = stats.size;
                        lastModified = stats.mtimeMs;
                    }
                }
                catch {
                    // Ignore stat errors
                }
                return {
                    name: entry.name,
                    path: fullPath,
                    isDirectory: entry.isDirectory(),
                    isFile: entry.isFile(),
                    isSymbolicLink: entry.isSymbolicLink(),
                    size,
                    lastModified,
                };
            }));
            // Sort: directories first, then alphabetically
            result.sort((a, b) => {
                if (a.isDirectory && !b.isDirectory)
                    return -1;
                if (!a.isDirectory && b.isDirectory)
                    return 1;
                return a.name.localeCompare(b.name);
            });
            return { success: true, data: result };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('fs:readDirectory error:', err.message);
            return { success: false, error: err.message, code: err.code };
        }
    });
    // Create directory
    electron_1.ipcMain.handle('fs:createDirectory', async (event, dirPath) => {
        try {
            if (!isPathSafe(dirPath)) {
                return { success: false, error: 'Access denied: Invalid path' };
            }
            await promises_1.default.mkdir(dirPath, { recursive: true });
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('fs:createDirectory error:', err.message);
            return { success: false, error: err.message, code: err.code };
        }
    });
    // Delete entry (file or directory)
    electron_1.ipcMain.handle('fs:deleteEntry', async (event, entryPath) => {
        try {
            if (!isPathSafe(entryPath)) {
                return { success: false, error: 'Access denied: Invalid path' };
            }
            const stats = await promises_1.default.stat(entryPath);
            if (stats.isDirectory()) {
                await promises_1.default.rm(entryPath, { recursive: true, force: true });
            }
            else {
                await promises_1.default.unlink(entryPath);
            }
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('fs:deleteEntry error:', err.message);
            return { success: false, error: err.message, code: err.code };
        }
    });
    // Rename/move entry
    electron_1.ipcMain.handle('fs:rename', async (event, oldPath, newPath) => {
        try {
            if (!isPathSafe(oldPath) || !isPathSafe(newPath)) {
                return { success: false, error: 'Access denied: Invalid path' };
            }
            await promises_1.default.rename(oldPath, newPath);
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('fs:rename error:', err.message);
            return { success: false, error: err.message, code: err.code };
        }
    });
    // Copy file
    electron_1.ipcMain.handle('fs:copyFile', async (event, srcPath, destPath) => {
        try {
            if (!isPathSafe(srcPath) || !isPathSafe(destPath)) {
                return { success: false, error: 'Access denied: Invalid path' };
            }
            await promises_1.default.mkdir(path_1.default.dirname(destPath), { recursive: true });
            await promises_1.default.copyFile(srcPath, destPath);
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('fs:copyFile error:', err.message);
            return { success: false, error: err.message, code: err.code };
        }
    });
    // Check if path exists
    electron_1.ipcMain.handle('fs:exists', async (event, entryPath) => {
        try {
            if (!isPathSafe(entryPath)) {
                return { success: true, data: false };
            }
            await promises_1.default.access(entryPath);
            return { success: true, data: true };
        }
        catch {
            return { success: true, data: false };
        }
    });
    // Get file/directory stats
    electron_1.ipcMain.handle('fs:stat', async (event, entryPath) => {
        try {
            if (!isPathSafe(entryPath)) {
                return { success: false, error: 'Access denied: Invalid path' };
            }
            const stats = await promises_1.default.stat(entryPath);
            return {
                success: true,
                data: {
                    isFile: stats.isFile(),
                    isDirectory: stats.isDirectory(),
                    isSymbolicLink: stats.isSymbolicLink(),
                    size: stats.size,
                    createdAt: stats.birthtimeMs,
                    modifiedAt: stats.mtimeMs,
                    accessedAt: stats.atimeMs,
                },
            };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('fs:stat error:', err.message);
            return { success: false, error: err.message, code: err.code };
        }
    });
    // Watch directory
    electron_1.ipcMain.handle('fs:watchDirectory', async (event, dirPath) => {
        try {
            if (!isPathSafe(dirPath)) {
                return { success: false, error: 'Access denied: Invalid path' };
            }
            // Check if already watching
            if (watchers.has(dirPath)) {
                return { success: true, message: 'Already watching' };
            }
            const watcher = chokidar_1.default.watch(dirPath, {
                ignored: /(^|[\/\\])\../, // Ignore dotfiles
                persistent: true,
                ignoreInitial: true,
                depth: 10,
            });
            watcher
                .on('add', (filePath) => {
                event.sender.send('fs:fileAdded', { path: filePath, directory: dirPath });
            })
                .on('change', (filePath) => {
                event.sender.send('fs:fileChanged', { path: filePath, directory: dirPath });
            })
                .on('unlink', (filePath) => {
                event.sender.send('fs:fileDeleted', { path: filePath, directory: dirPath });
            })
                .on('addDir', (filePath) => {
                event.sender.send('fs:directoryAdded', { path: filePath, directory: dirPath });
            })
                .on('unlinkDir', (filePath) => {
                event.sender.send('fs:directoryDeleted', { path: filePath, directory: dirPath });
            })
                .on('error', (error) => {
                electron_log_1.default.error('File watcher error:', error);
                const errMsg = error instanceof Error ? error.message : String(error);
                event.sender.send('fs:watchError', { error: errMsg, directory: dirPath });
            });
            watchers.set(dirPath, watcher);
            electron_log_1.default.info('Started watching directory:', dirPath);
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('fs:watchDirectory error:', err.message);
            return { success: false, error: err.message };
        }
    });
    // Unwatch directory
    electron_1.ipcMain.handle('fs:unwatchDirectory', async (event, dirPath) => {
        try {
            const watcher = watchers.get(dirPath);
            if (watcher) {
                await watcher.close();
                watchers.delete(dirPath);
                electron_log_1.default.info('Stopped watching directory:', dirPath);
            }
            return { success: true };
        }
        catch (error) {
            const err = error;
            electron_log_1.default.error('fs:unwatchDirectory error:', err.message);
            return { success: false, error: err.message };
        }
    });
    electron_log_1.default.info('File system IPC handlers registered');
}
/**
 * Close and remove all active file system watchers.
 *
 * Awaits each watcher's close operation and clears the internal watcher registry.
 * Intended to be called during application shutdown to ensure watchers are cleaned up.
 */
async function cleanupFileWatchers() {
    electron_log_1.default.info('Cleaning up file watchers...');
    for (const [dirPath, watcher] of watchers) {
        await watcher.close();
        electron_log_1.default.debug('Closed watcher for:', dirPath);
    }
    watchers.clear();
    electron_log_1.default.info('All file watchers cleaned up');
}
//# sourceMappingURL=file-system.js.map