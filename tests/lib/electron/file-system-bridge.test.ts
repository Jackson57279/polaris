/**
 * File System Bridge Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('FileSystemBridge', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  describe('Electron Environment', () => {
    beforeEach(() => {
      (global as any).window = {
        electron: {
          fileSystem: {
            readFile: vi.fn().mockResolvedValue('file content'),
            writeFile: vi.fn().mockResolvedValue(undefined),
            exists: vi.fn().mockResolvedValue(true),
            mkdir: vi.fn().mockResolvedValue(undefined),
            readDir: vi.fn().mockResolvedValue(['file1.txt', 'file2.txt']),
            stat: vi.fn().mockResolvedValue({
              size: 1024,
              isFile: true,
              isDirectory: false,
            }),
            delete: vi.fn().mockResolvedValue(undefined),
            rename: vi.fn().mockResolvedValue(undefined),
            copy: vi.fn().mockResolvedValue(undefined),
          },
        },
      };
    });

    it('should read file via IPC', async () => {
      const electron = (global as any).window.electron;
      const content = await electron.fileSystem.readFile('/test/file.txt');

      expect(content).toBe('file content');
      expect(electron.fileSystem.readFile).toHaveBeenCalledWith('/test/file.txt');
    });

    it('should write file via IPC', async () => {
      const electron = (global as any).window.electron;
      await electron.fileSystem.writeFile('/test/file.txt', 'new content');

      expect(electron.fileSystem.writeFile).toHaveBeenCalledWith(
        '/test/file.txt',
        'new content'
      );
    });

    it('should check file existence via IPC', async () => {
      const electron = (global as any).window.electron;
      const exists = await electron.fileSystem.exists('/test/file.txt');

      expect(exists).toBe(true);
      expect(electron.fileSystem.exists).toHaveBeenCalledWith('/test/file.txt');
    });

    it('should create directory via IPC', async () => {
      const electron = (global as any).window.electron;
      await electron.fileSystem.mkdir('/test/new-dir');

      expect(electron.fileSystem.mkdir).toHaveBeenCalledWith('/test/new-dir');
    });

    it('should read directory via IPC', async () => {
      const electron = (global as any).window.electron;
      const entries = await electron.fileSystem.readDir('/test/dir');

      expect(entries).toEqual(['file1.txt', 'file2.txt']);
      expect(electron.fileSystem.readDir).toHaveBeenCalledWith('/test/dir');
    });

    it('should get file stats via IPC', async () => {
      const electron = (global as any).window.electron;
      const stats = await electron.fileSystem.stat('/test/file.txt');

      expect(stats.size).toBe(1024);
      expect(stats.isFile).toBe(true);
      expect(electron.fileSystem.stat).toHaveBeenCalledWith('/test/file.txt');
    });

    it('should delete file via IPC', async () => {
      const electron = (global as any).window.electron;
      await electron.fileSystem.delete('/test/file.txt');

      expect(electron.fileSystem.delete).toHaveBeenCalledWith('/test/file.txt');
    });

    it('should rename file via IPC', async () => {
      const electron = (global as any).window.electron;
      await electron.fileSystem.rename('/test/old.txt', '/test/new.txt');

      expect(electron.fileSystem.rename).toHaveBeenCalledWith(
        '/test/old.txt',
        '/test/new.txt'
      );
    });

    it('should copy file via IPC', async () => {
      const electron = (global as any).window.electron;
      await electron.fileSystem.copy('/test/src.txt', '/test/dest.txt');

      expect(electron.fileSystem.copy).toHaveBeenCalledWith(
        '/test/src.txt',
        '/test/dest.txt'
      );
    });
  });

  describe('Browser Environment', () => {
    beforeEach(() => {
      (global as any).window = {};
    });

    it('should throw error when accessing file system without Electron', async () => {
      const isElectron = () => !!(global as any).window?.electron;

      const readFile = async (path: string) => {
        if (!isElectron()) {
          throw new Error('Native file system not available in browser');
        }
        return (global as any).window.electron.fileSystem.readFile(path);
      };

      await expect(readFile('/test/file.txt')).rejects.toThrow(
        'Native file system not available in browser'
      );
    });

    it('should provide fallback for browser environment', () => {
      const createBrowserFallback = () => ({
        readFile: () => Promise.reject(new Error('Not supported in browser')),
        writeFile: () => Promise.reject(new Error('Not supported in browser')),
        exists: () => Promise.resolve(false),
        isAvailable: () => false,
      });

      const fallback = createBrowserFallback();

      expect(fallback.isAvailable()).toBe(false);
    });
  });

  describe('FileSystemBridge Factory', () => {
    it('should return Electron bridge when in Electron', () => {
      const createBridge = (isElectron: boolean) => {
        if (isElectron) {
          return {
            type: 'electron',
            isNative: true,
          };
        }
        return {
          type: 'browser',
          isNative: false,
        };
      };

      const bridge = createBridge(true);
      expect(bridge.type).toBe('electron');
      expect(bridge.isNative).toBe(true);
    });

    it('should return browser bridge when not in Electron', () => {
      const createBridge = (isElectron: boolean) => {
        if (isElectron) {
          return {
            type: 'electron',
            isNative: true,
          };
        }
        return {
          type: 'browser',
          isNative: false,
        };
      };

      const bridge = createBridge(false);
      expect(bridge.type).toBe('browser');
      expect(bridge.isNative).toBe(false);
    });
  });
});

describe('File Watcher', () => {
  it('should start watching a directory in Electron', async () => {
    const mockWatch = vi.fn(() => () => {});

    (global as any).window = {
      electron: {
        fileSystem: {
          watch: mockWatch,
        },
      },
    };

    const electron = (global as any).window.electron;
    const unwatch = electron.fileSystem.watch('/test/dir', () => {});

    expect(mockWatch).toHaveBeenCalledWith('/test/dir', expect.any(Function));
    expect(typeof unwatch).toBe('function');
  });

  it('should provide noop watcher in browser', () => {
    (global as any).window = {};

    const createBrowserWatcher = () => ({
      watch: (path: string, callback: any) => {
        console.warn('File watching not available in browser');
        return () => {}; // noop unwatch
      },
    });

    const watcher = createBrowserWatcher();
    const unwatch = watcher.watch('/test/dir', () => {});

    expect(typeof unwatch).toBe('function');
  });
});
