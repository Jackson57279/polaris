/**
 * File System IPC Handlers
 *
 * Provides native file system access to the renderer process
 * Replaces the limited browser File System Access API
 */

import { ipcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import chokidar, { type FSWatcher } from 'chokidar';
import electronLog from 'electron-log';

// Store active file watchers
const watchers = new Map<string, FSWatcher>();

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
 * Validates that a filesystem path is allowed for access.
 *
 * Ensures the provided path does not escape the current working directory via directory traversal and does not start with any configured forbidden path (comparison is case-insensitive).
 *
 * @param filePath - The filesystem path to validate.
 * @returns `true` if the path is considered safe to access, `false` otherwise.
 */
function isPathSafe(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  const normalized = path.normalize(resolved);

  // Check for directory traversal attempts
  if (filePath.includes('..')) {
    // Allow relative paths but ensure they don't escape
    if (!normalized.startsWith(path.resolve('.'))) {
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
 * Register IPC handlers under the `fs:*` namespace to expose controlled native filesystem operations to renderer processes.
 *
 * Handlers perform path safety checks, provide read/write/copy/rename/delete/stat/listing operations, and manage directory watchers that emit `fs:*` events back to renderers.
 */
export function registerFileSystemHandlers(): void {
  // Read file
  ipcMain.handle('fs:readFile', async (event, filePath: string, encoding: BufferEncoding = 'utf-8') => {
    try {
      if (!isPathSafe(filePath)) {
        return { success: false, error: 'Access denied: Invalid path' };
      }

      const content = await fs.readFile(filePath, encoding);
      return { success: true, data: content };
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      electronLog.error('fs:readFile error:', err.message);
      return { success: false, error: err.message, code: err.code };
    }
  });

  // Read file as binary
  ipcMain.handle('fs:readFileBinary', async (event, filePath: string) => {
    try {
      if (!isPathSafe(filePath)) {
        return { success: false, error: 'Access denied: Invalid path' };
      }

      const content = await fs.readFile(filePath);
      return { success: true, data: content.toString('base64') };
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      electronLog.error('fs:readFileBinary error:', err.message);
      return { success: false, error: err.message, code: err.code };
    }
  });

  // Write file
  ipcMain.handle('fs:writeFile', async (event, filePath: string, content: string, encoding: BufferEncoding = 'utf-8') => {
    try {
      if (!isPathSafe(filePath)) {
        return { success: false, error: 'Access denied: Invalid path' };
      }

      // Ensure parent directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, encoding);
      return { success: true };
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      electronLog.error('fs:writeFile error:', err.message);
      return { success: false, error: err.message, code: err.code };
    }
  });

  // Write binary file
  ipcMain.handle('fs:writeFileBinary', async (event, filePath: string, base64Content: string) => {
    try {
      if (!isPathSafe(filePath)) {
        return { success: false, error: 'Access denied: Invalid path' };
      }

      const buffer = Buffer.from(base64Content, 'base64');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, buffer);
      return { success: true };
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      electronLog.error('fs:writeFileBinary error:', err.message);
      return { success: false, error: err.message, code: err.code };
    }
  });

  // Read directory
  ipcMain.handle('fs:readDirectory', async (event, dirPath: string) => {
    try {
      if (!isPathSafe(dirPath)) {
        return { success: false, error: 'Access denied: Invalid path' };
      }

      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const result = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(dirPath, entry.name);
          let size = 0;
          let lastModified = 0;

          try {
            if (entry.isFile()) {
              const stats = await fs.stat(fullPath);
              size = stats.size;
              lastModified = stats.mtimeMs;
            }
          } catch {
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
        })
      );

      // Sort: directories first, then alphabetically
      result.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      return { success: true, data: result };
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      electronLog.error('fs:readDirectory error:', err.message);
      return { success: false, error: err.message, code: err.code };
    }
  });

  // Create directory
  ipcMain.handle('fs:createDirectory', async (event, dirPath: string) => {
    try {
      if (!isPathSafe(dirPath)) {
        return { success: false, error: 'Access denied: Invalid path' };
      }

      await fs.mkdir(dirPath, { recursive: true });
      return { success: true };
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      electronLog.error('fs:createDirectory error:', err.message);
      return { success: false, error: err.message, code: err.code };
    }
  });

  // Delete entry (file or directory)
  ipcMain.handle('fs:deleteEntry', async (event, entryPath: string) => {
    try {
      if (!isPathSafe(entryPath)) {
        return { success: false, error: 'Access denied: Invalid path' };
      }

      const stats = await fs.stat(entryPath);
      if (stats.isDirectory()) {
        await fs.rm(entryPath, { recursive: true, force: true });
      } else {
        await fs.unlink(entryPath);
      }
      return { success: true };
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      electronLog.error('fs:deleteEntry error:', err.message);
      return { success: false, error: err.message, code: err.code };
    }
  });

  // Rename/move entry
  ipcMain.handle('fs:rename', async (event, oldPath: string, newPath: string) => {
    try {
      if (!isPathSafe(oldPath) || !isPathSafe(newPath)) {
        return { success: false, error: 'Access denied: Invalid path' };
      }

      await fs.rename(oldPath, newPath);
      return { success: true };
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      electronLog.error('fs:rename error:', err.message);
      return { success: false, error: err.message, code: err.code };
    }
  });

  // Copy file
  ipcMain.handle('fs:copyFile', async (event, srcPath: string, destPath: string) => {
    try {
      if (!isPathSafe(srcPath) || !isPathSafe(destPath)) {
        return { success: false, error: 'Access denied: Invalid path' };
      }

      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(srcPath, destPath);
      return { success: true };
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      electronLog.error('fs:copyFile error:', err.message);
      return { success: false, error: err.message, code: err.code };
    }
  });

  // Check if path exists
  ipcMain.handle('fs:exists', async (event, entryPath: string) => {
    try {
      if (!isPathSafe(entryPath)) {
        return { success: true, data: false };
      }

      await fs.access(entryPath);
      return { success: true, data: true };
    } catch {
      return { success: true, data: false };
    }
  });

  // Get file/directory stats
  ipcMain.handle('fs:stat', async (event, entryPath: string) => {
    try {
      if (!isPathSafe(entryPath)) {
        return { success: false, error: 'Access denied: Invalid path' };
      }

      const stats = await fs.stat(entryPath);
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
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      electronLog.error('fs:stat error:', err.message);
      return { success: false, error: err.message, code: err.code };
    }
  });

  // Watch directory
  ipcMain.handle('fs:watchDirectory', async (event, dirPath: string) => {
    try {
      if (!isPathSafe(dirPath)) {
        return { success: false, error: 'Access denied: Invalid path' };
      }

      // Check if already watching
      if (watchers.has(dirPath)) {
        return { success: true, message: 'Already watching' };
      }

      const watcher = chokidar.watch(dirPath, {
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
.on('error', (error: unknown) => {
          electronLog.error('File watcher error:', error);
          const errMsg = error instanceof Error ? error.message : String(error);
          event.sender.send('fs:watchError', { error: errMsg, directory: dirPath });
        });

      watchers.set(dirPath, watcher);
      electronLog.info('Started watching directory:', dirPath);

      return { success: true };
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      electronLog.error('fs:watchDirectory error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Unwatch directory
  ipcMain.handle('fs:unwatchDirectory', async (event, dirPath: string) => {
    try {
      const watcher = watchers.get(dirPath);
      if (watcher) {
        await watcher.close();
        watchers.delete(dirPath);
        electronLog.info('Stopped watching directory:', dirPath);
      }
      return { success: true };
    } catch (error) {
      const err = error as Error;
      electronLog.error('fs:unwatchDirectory error:', err.message);
      return { success: false, error: err.message };
    }
  });

  electronLog.info('File system IPC handlers registered');
}

/**
 * Closes and removes all active file system watchers.
 *
 * Ensures each watcher is closed before clearing the internal registry.
 */
export async function cleanupFileWatchers(): Promise<void> {
  electronLog.info('Cleaning up file watchers...');

  for (const [dirPath, watcher] of watchers) {
    await watcher.close();
    electronLog.debug('Closed watcher for:', dirPath);
  }

  watchers.clear();
  electronLog.info('All file watchers cleaned up');
}