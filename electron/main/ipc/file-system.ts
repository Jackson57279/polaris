import { ipcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { watch, FSWatcher } from 'chokidar';
import log from 'electron-log';

interface FileSystemResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

const watchers = new Map<string, FSWatcher>();

function isPathSafe(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  const forbidden = ['/etc', '/sys', '/proc', '/root'];
  
  if (process.platform === 'win32') {
    const windowsForbidden = ['C:\\Windows', 'C:\\Program Files'];
    return !windowsForbidden.some(dir => 
      resolved.toLowerCase().startsWith(dir.toLowerCase())
    );
  }
  
  return !forbidden.some(dir => resolved.startsWith(dir));
}

export function registerFileSystemHandlers() {
  ipcMain.handle('fs:readFile', async (_, filePath: string): Promise<FileSystemResult<string>> => {
    try {
      if (!isPathSafe(filePath)) {
        return { success: false, error: 'Access to this path is forbidden' };
      }

      const content = await fs.readFile(filePath, 'utf-8');
      return { success: true, data: content };
    } catch (error: any) {
      log.error('fs:readFile error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string): Promise<FileSystemResult> => {
    try {
      if (!isPathSafe(filePath)) {
        return { success: false, error: 'Access to this path is forbidden' };
      }

      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      return { success: true };
    } catch (error: any) {
      log.error('fs:writeFile error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fs:readDirectory', async (_, dirPath: string): Promise<FileSystemResult<any[]>> => {
    try {
      if (!isPathSafe(dirPath)) {
        return { success: false, error: 'Access to this path is forbidden' };
      }

      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const items = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(dirPath, entry.name);
          const stats = await fs.stat(fullPath);
          return {
            name: entry.name,
            path: fullPath,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime.getTime()
          };
        })
      );

      return { success: true, data: items };
    } catch (error: any) {
      log.error('fs:readDirectory error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fs:createDirectory', async (_, dirPath: string): Promise<FileSystemResult> => {
    try {
      if (!isPathSafe(dirPath)) {
        return { success: false, error: 'Access to this path is forbidden' };
      }

      await fs.mkdir(dirPath, { recursive: true });
      return { success: true };
    } catch (error: any) {
      log.error('fs:createDirectory error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fs:deleteEntry', async (_, entryPath: string): Promise<FileSystemResult> => {
    try {
      if (!isPathSafe(entryPath)) {
        return { success: false, error: 'Access to this path is forbidden' };
      }

      const stats = await fs.stat(entryPath);
      if (stats.isDirectory()) {
        await fs.rm(entryPath, { recursive: true });
      } else {
        await fs.unlink(entryPath);
      }
      return { success: true };
    } catch (error: any) {
      log.error('fs:deleteEntry error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fs:watchDirectory', async (event, dirPath: string): Promise<FileSystemResult> => {
    try {
      if (!isPathSafe(dirPath)) {
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
          event.sender.send('fs:fileEvent', { type: 'add', path: filePath });
        })
        .on('change', (filePath) => {
          event.sender.send('fs:fileEvent', { type: 'change', path: filePath });
        })
        .on('unlink', (filePath) => {
          event.sender.send('fs:fileEvent', { type: 'delete', path: filePath });
        })
        .on('addDir', (filePath) => {
          event.sender.send('fs:fileEvent', { type: 'addDir', path: filePath });
        })
        .on('unlinkDir', (filePath) => {
          event.sender.send('fs:fileEvent', { type: 'deleteDir', path: filePath });
        });

      watchers.set(dirPath, watcher);
      return { success: true };
    } catch (error: any) {
      log.error('fs:watchDirectory error:', error);
      return { success: false, error: error.message };
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
    } catch (error: any) {
      log.error('fs:unwatchDirectory error:', error);
      return { success: false, error: error.message };
    }
  });
}
