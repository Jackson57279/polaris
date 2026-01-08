/**
 * File System Bridge
 *
 * Unified file system interface that works in both Electron and browser environments.
 * Automatically uses the appropriate implementation based on the runtime environment.
 */

import { isElectron } from './environment';

/**
 * File entry information
 */
export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  lastModified: number;
}

/**
 * File stat information
 */
export interface FileStat {
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  createdAt: number;
  modifiedAt: number;
}

/**
 * File System Bridge Result
 */
export interface FSResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * File System Bridge
 *
 * Provides a unified interface for file system operations
 * that works in both Electron and browser environments.
 */
export class FileSystemBridge {
  private static instance: FileSystemBridge;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): FileSystemBridge {
    if (!FileSystemBridge.instance) {
      FileSystemBridge.instance = new FileSystemBridge();
    }
    return FileSystemBridge.instance;
  }

  /**
   * Check if native file system is available
   */
  isNativeAvailable(): boolean {
    return isElectron();
  }

  /**
   * Check if Web File System Access API is available
   */
  isWebFSAvailable(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  }

  /**
   * Read a file as text
   */
  async readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<FSResult<string>> {
    if (isElectron()) {
      return window.electron.fs.readFile(filePath, encoding);
    }

    // Browser fallback - not supported for arbitrary paths
    return {
      success: false,
      error: 'Native file system not available. Use file picker instead.',
    };
  }

  /**
   * Read a file as binary (base64)
   */
  async readFileBinary(filePath: string): Promise<FSResult<string>> {
    if (isElectron()) {
      return window.electron.fs.readFileBinary(filePath);
    }

    return {
      success: false,
      error: 'Native file system not available.',
    };
  }

  /**
   * Write a file
   */
  async writeFile(
    filePath: string,
    content: string,
    encoding: BufferEncoding = 'utf-8'
  ): Promise<FSResult> {
    if (isElectron()) {
      return window.electron.fs.writeFile(filePath, content, encoding);
    }

    return {
      success: false,
      error: 'Native file system not available.',
    };
  }

  /**
   * Write a binary file (base64 content)
   */
  async writeFileBinary(filePath: string, base64Content: string): Promise<FSResult> {
    if (isElectron()) {
      return window.electron.fs.writeFileBinary(filePath, base64Content);
    }

    return {
      success: false,
      error: 'Native file system not available.',
    };
  }

  /**
   * Read a directory
   */
  async readDirectory(dirPath: string): Promise<FSResult<FileEntry[]>> {
    if (isElectron()) {
      const result = await window.electron.fs.readDirectory(dirPath);
      if (result.success && result.data) {
        return {
          success: true,
          data: result.data.map((entry) => ({
            name: entry.name,
            path: entry.path,
            isDirectory: entry.isDirectory,
            isFile: entry.isFile,
            size: entry.size,
            lastModified: entry.lastModified,
          })),
        };
      }
      return result as FSResult<FileEntry[]>;
    }

    return {
      success: false,
      error: 'Native file system not available.',
    };
  }

  /**
   * Create a directory
   */
  async createDirectory(dirPath: string): Promise<FSResult> {
    if (isElectron()) {
      return window.electron.fs.createDirectory(dirPath);
    }

    return {
      success: false,
      error: 'Native file system not available.',
    };
  }

  /**
   * Delete a file or directory
   */
  async deleteEntry(entryPath: string): Promise<FSResult> {
    if (isElectron()) {
      return window.electron.fs.deleteEntry(entryPath);
    }

    return {
      success: false,
      error: 'Native file system not available.',
    };
  }

  /**
   * Rename/move a file or directory
   */
  async rename(oldPath: string, newPath: string): Promise<FSResult> {
    if (isElectron()) {
      return window.electron.fs.rename(oldPath, newPath);
    }

    return {
      success: false,
      error: 'Native file system not available.',
    };
  }

  /**
   * Copy a file
   */
  async copyFile(srcPath: string, destPath: string): Promise<FSResult> {
    if (isElectron()) {
      return window.electron.fs.copyFile(srcPath, destPath);
    }

    return {
      success: false,
      error: 'Native file system not available.',
    };
  }

  /**
   * Check if a path exists
   */
  async exists(entryPath: string): Promise<FSResult<boolean>> {
    if (isElectron()) {
      return window.electron.fs.exists(entryPath);
    }

    return {
      success: true,
      data: false,
    };
  }

  /**
   * Get file/directory stats
   */
  async stat(entryPath: string): Promise<FSResult<FileStat>> {
    if (isElectron()) {
      const result = await window.electron.fs.stat(entryPath);
      if (result.success && result.data) {
        return {
          success: true,
          data: {
            isFile: result.data.isFile,
            isDirectory: result.data.isDirectory,
            size: result.data.size,
            createdAt: result.data.createdAt,
            modifiedAt: result.data.modifiedAt,
          },
        };
      }
      return result as FSResult<FileStat>;
    }

    return {
      success: false,
      error: 'Native file system not available.',
    };
  }

  /**
   * Watch a directory for changes
   */
  async watchDirectory(dirPath: string): Promise<FSResult> {
    if (isElectron()) {
      return window.electron.fs.watchDirectory(dirPath);
    }

    return {
      success: false,
      error: 'Native file system not available.',
    };
  }

  /**
   * Stop watching a directory
   */
  async unwatchDirectory(dirPath: string): Promise<FSResult> {
    if (isElectron()) {
      return window.electron.fs.unwatchDirectory(dirPath);
    }

    return { success: true };
  }

  /**
   * Open a file picker dialog
   */
  async openFilePicker(options?: {
    title?: string;
    filters?: { name: string; extensions: string[] }[];
    multiple?: boolean;
  }): Promise<FSResult<string[]>> {
    if (isElectron()) {
      const result = await window.electron.dialog.openFile({
        title: options?.title,
        filters: options?.filters,
        multiple: options?.multiple,
      });

      if (result.success && result.data) {
        return {
          success: true,
          data: result.data.filePaths,
        };
      }

      return result as FSResult<string[]>;
    }

    // Browser fallback using File System Access API
    if (this.isWebFSAvailable()) {
      try {
        const handles = await (window as unknown as { showOpenFilePicker: (options?: unknown) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker({
          multiple: options?.multiple ?? false,
        });

        const paths = handles.map((handle) => handle.name);
        return { success: true, data: paths };
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return { success: true, data: [] };
        }
        return { success: false, error: (error as Error).message };
      }
    }

    return {
      success: false,
      error: 'File picker not available.',
    };
  }

  /**
   * Open a folder picker dialog
   */
  async openFolderPicker(options?: {
    title?: string;
  }): Promise<FSResult<string | null>> {
    if (isElectron()) {
      const result = await window.electron.dialog.openFolder({
        title: options?.title,
        multiple: false,
      });

      if (result.success && result.data && result.data.folderPaths.length > 0) {
        return {
          success: true,
          data: result.data.folderPaths[0],
        };
      }

      return { success: true, data: null };
    }

    // Browser fallback using File System Access API
    if (this.isWebFSAvailable()) {
      try {
        const handle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
        return { success: true, data: handle.name };
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return { success: true, data: null };
        }
        return { success: false, error: (error as Error).message };
      }
    }

    return {
      success: false,
      error: 'Folder picker not available.',
    };
  }

  /**
   * Open a save file dialog
   */
  async saveFilePicker(options?: {
    title?: string;
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
  }): Promise<FSResult<string | null>> {
    if (isElectron()) {
      const result = await window.electron.dialog.saveFile({
        title: options?.title,
        defaultPath: options?.defaultPath,
        filters: options?.filters,
      });

      if (result.success && result.data) {
        return {
          success: true,
          data: result.data.filePath || null,
        };
      }

      return result as FSResult<string | null>;
    }

    // Browser fallback using File System Access API
    if (this.isWebFSAvailable()) {
      try {
        const handle = await (window as unknown as { showSaveFilePicker: (options?: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
          suggestedName: options?.defaultPath,
        });
        return { success: true, data: handle.name };
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return { success: true, data: null };
        }
        return { success: false, error: (error as Error).message };
      }
    }

    return {
      success: false,
      error: 'Save picker not available.',
    };
  }

  /**
   * Show item in folder (reveal in Finder/Explorer)
   */
  async showInFolder(filePath: string): Promise<FSResult> {
    if (isElectron()) {
      return window.electron.shell.showItemInFolder(filePath);
    }

    return {
      success: false,
      error: 'Not available in browser.',
    };
  }

  /**
   * Move item to trash
   */
  async trashItem(filePath: string): Promise<FSResult> {
    if (isElectron()) {
      return window.electron.shell.trashItem(filePath);
    }

    return {
      success: false,
      error: 'Not available in browser.',
    };
  }
}

// Export singleton instance
export const fileSystem = FileSystemBridge.getInstance();
