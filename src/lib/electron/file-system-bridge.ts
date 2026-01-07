import { isElectron } from './environment';

export interface FileSystemResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified: number;
}

export class FileSystemBridge {
  async readFile(filePath: string): Promise<string> {
    if (isElectron()) {
      const result = await window.electron.fs.readFile(filePath);
      if (!result.success) {
        throw new Error(result.error || 'Failed to read file');
      }
      return result.data;
    }

    // Fallback to File System Access API (browser)
    throw new Error('File System Access API not yet implemented for browser');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    if (isElectron()) {
      const result = await window.electron.fs.writeFile(filePath, content);
      if (!result.success) {
        throw new Error(result.error || 'Failed to write file');
      }
      return;
    }

    // Fallback to File System Access API (browser)
    throw new Error('File System Access API not yet implemented for browser');
  }

  async readDirectory(dirPath: string): Promise<FileEntry[]> {
    if (isElectron()) {
      const result = await window.electron.fs.readDirectory(dirPath);
      if (!result.success) {
        throw new Error(result.error || 'Failed to read directory');
      }
      return result.data;
    }

    // Fallback to File System Access API (browser)
    throw new Error('File System Access API not yet implemented for browser');
  }

  async createDirectory(dirPath: string): Promise<void> {
    if (isElectron()) {
      const result = await window.electron.fs.createDirectory(dirPath);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create directory');
      }
      return;
    }

    // Fallback to File System Access API (browser)
    throw new Error('File System Access API not yet implemented for browser');
  }

  async deleteEntry(entryPath: string): Promise<void> {
    if (isElectron()) {
      const result = await window.electron.fs.deleteEntry(entryPath);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete entry');
      }
      return;
    }

    // Fallback to File System Access API (browser)
    throw new Error('File System Access API not yet implemented for browser');
  }

  async showOpenDialog(options: any): Promise<any> {
    if (isElectron()) {
      const result = await window.electron.dialog.showOpenDialog(options);
      if (!result.success) {
        throw new Error(result.error || 'Failed to show open dialog');
      }
      return result.data;
    }

    // Fallback to File System Access API (browser)
    if ('showDirectoryPicker' in window) {
      const dirHandle = await (window as any).showDirectoryPicker();
      return { filePaths: [dirHandle.name] };
    }

    throw new Error('File System Access API not supported');
  }
}

export const fileSystemBridge = new FileSystemBridge();
