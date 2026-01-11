import { ipcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { watch, FSWatcher } from 'chokidar';
import log from 'electron-log';

interface FileSystemResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const watchers = new Map<string, FSWatcher>();

async function isPathSafe(filePath: string): Promise<boolean> {
  try {
    // Resolve symlinks and get real path
    const realPath = await fs.realpath(filePath);
    const normalized = path.normalize(realPath);
    
    // Define forbidden directories with proper separators
    if (process.platform === 'win32') {
      const lowerPath = normalized.toLowerCase();
      const windowsForbidden = [
        'c:\\windows',
        'c:\\program files',
        'c:\\programdata',
        path.join(process.env.APPDATA || '').toLowerCase()
      ];
      return !windowsForbidden.some(forbidden => {
        if (!forbidden) return false;
        return lowerPath === forbidden || lowerPath.startsWith(forbidden + path.sep);
      });
    }
    
    // Unix/Linux/macOS forbidden paths
    const forbidden = ['/etc', '/sys', '/proc', '/root', '/boot', '/dev', '/var', '/usr', '/bin', '/sbin'];
    return !forbidden.some(dir => {
      return normalized === dir || normalized.startsWith(dir + path.sep);
    });
  } catch {
    // If realpath fails (e.g., file doesn't exist), fall back to resolve
    const resolved = path.resolve(filePath);
    const normalized = path.normalize(resolved);
    
    if (process.platform === 'win32') {
      const lowerPath = normalized.toLowerCase();
      const windowsForbidden = ['c:\\windows', 'c:\\program files', 'c:\\programdata'];
      return !windowsForbidden.some(forbidden => {
        return lowerPath === forbidden || lowerPath.startsWith(forbidden + path.sep);
      });
    }
    
    const forbidden = ['/etc', '/sys', '/proc', '/root', '/boot', '/dev', '/var', '/usr', '/bin', '/sbin'];
    return !forbidden.some(dir => {
      return normalized === dir || normalized.startsWith(dir + path.sep);
    });
  }
}

export function registerFileSystemHandlers() {
  ipcMain.handle('fs:readFile', async (_, filePath: string): Promise<FileSystemResult<string>> => {
    try {
      if (!(await isPathSafe(filePath))) {
        return { success: false, error: 'Access to this path is forbidden' };
      }

      const content = await fs.readFile(filePath, 'utf-8');
      return { success: true, data: content };
    } catch (error) {
      log.error('fs:readFile error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string): Promise<FileSystemResult> => {
    try {
      if (!(await isPathSafe(filePath))) {
        return { success: false, error: 'Access to this path is forbidden' };
      }

      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      return { success: true };
    } catch (error) {
      log.error('fs:writeFile error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  ipcMain.handle('fs:readDirectory', async (_, dirPath: string): Promise<FileSystemResult<unknown[]>> => {
    try {
      if (!(await isPathSafe(dirPath))) {
        return { success: false, error: 'Access to this path is forbidden' };
      }

      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const items = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(dirPath, entry.name);
          try {
            const stats = await fs.stat(fullPath);
            return {
              name: entry.name,
              path: fullPath,
              type: entry.isDirectory() ? 'directory' : 'file',
              size: stats.size,
              modified: stats.mtime.getTime()
            };
          } catch (entryError) {
            // Return entry with error flag if stat fails
            const message = entryError instanceof Error ? entryError.message : 'Unknown error';
            log.warn(`Failed to stat ${fullPath}:`, message);
            return {
              name: entry.name,
              path: fullPath,
              type: entry.isDirectory() ? 'directory' : 'file',
              error: message
            };
          }
        })
      );

      // Filter out null entries if any
      const validItems = items.filter(item => item !== null);

      return { success: true, data: validItems };
    } catch (error) {
      log.error('fs:readDirectory error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  ipcMain.handle('fs:createDirectory', async (_, dirPath: string): Promise<FileSystemResult> => {
    try {
      if (!(await isPathSafe(dirPath))) {
        return { success: false, error: 'Access to this path is forbidden' };
      }

      await fs.mkdir(dirPath, { recursive: true });
      return { success: true };
    } catch (error) {
      log.error('fs:createDirectory error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  ipcMain.handle('fs:deleteEntry', async (_, entryPath: string): Promise<FileSystemResult> => {
    try {
      if (!(await isPathSafe(entryPath))) {
        return { success: false, error: 'Access to this path is forbidden' };
      }

      const stats = await fs.stat(entryPath);
      if (stats.isDirectory()) {
        await fs.rm(entryPath, { recursive: true });
      } else {
        await fs.unlink(entryPath);
      }
      return { success: true };
    } catch (error) {
      log.error('fs:deleteEntry error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  ipcMain.handle('fs:watchDirectory', async (event, dirPath: string): Promise<FileSystemResult> => {
    try {
      if (!(await isPathSafe(dirPath))) {
        return { success: false, error: 'Access to this path is forbidden' };
      }

      if (watchers.has(dirPath)) {
        return { success: true };
      }

      const watcher = watch(dirPath, {
        persistent: true,
        ignoreInitial: true,
        depth: 1
      });

      watcher
        .on('add', (filePath) => {
          if (event.sender && !event.sender.isDestroyed()) {
            event.sender.send('fs:fileEvent', { type: 'add', path: filePath });
          } else {
            watcher.close();
            watchers.delete(dirPath);
          }
        })
        .on('change', (filePath) => {
          if (event.sender && !event.sender.isDestroyed()) {
            event.sender.send('fs:fileEvent', { type: 'change', path: filePath });
          } else {
            watcher.close();
            watchers.delete(dirPath);
          }
        })
        .on('unlink', (filePath) => {
          if (event.sender && !event.sender.isDestroyed()) {
            event.sender.send('fs:fileEvent', { type: 'delete', path: filePath });
          } else {
            watcher.close();
            watchers.delete(dirPath);
          }
        })
        .on('addDir', (filePath) => {
          if (event.sender && !event.sender.isDestroyed()) {
            event.sender.send('fs:fileEvent', { type: 'addDir', path: filePath });
          } else {
            watcher.close();
            watchers.delete(dirPath);
          }
        })
        .on('unlinkDir', (filePath) => {
          if (event.sender && !event.sender.isDestroyed()) {
            event.sender.send('fs:fileEvent', { type: 'deleteDir', path: filePath });
          } else {
            watcher.close();
            watchers.delete(dirPath);
          }
        });

      watchers.set(dirPath, watcher);
      return { success: true };
    } catch (error) {
      log.error('fs:watchDirectory error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  ipcMain.handle('fs:unwatchDirectory', async (_, dirPath: string): Promise<FileSystemResult> => {
    try {
      const watcher = watchers.get(dirPath);
      if (watcher) {
        await watcher.close();
        watchers.delete(dirPath);
      }
      return { success: true };
    } catch (error) {
      log.error('fs:unwatchDirectory error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });
}
