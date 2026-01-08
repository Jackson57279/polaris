// Native File System API integration for PWA

export interface FileSystemEntry {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
  size?: number;
  lastModified?: number;
}

export class NativeFileSystemManager {
  private static instance: NativeFileSystemManager;
  private directoryHandle: FileSystemDirectoryHandle | null = null;

  private constructor() {}

  static getInstance(): NativeFileSystemManager {
    if (!NativeFileSystemManager.instance) {
      NativeFileSystemManager.instance = new NativeFileSystemManager();
    }
    return NativeFileSystemManager.instance;
  }

  // Check if Native File System API is supported
  isSupported(): boolean {
    return 'showDirectoryPicker' in window;
  }

  // Request directory access
  async requestDirectoryAccess(): Promise<FileSystemDirectoryHandle> {
    if (!this.isSupported()) {
      throw new Error('Native File System API not supported');
    }

    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });
      this.directoryHandle = handle;
      return handle;
    } catch (error) {
      console.error('Failed to access directory:', error);
      throw error;
    }
  }

  // Open file picker
  async openFilePicker(options: {
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
    excludeAcceptAllOption?: boolean;
    multiple?: boolean;
  } = {}): Promise<File[]> {
    if (!this.isSupported()) {
      return this.fallbackFilePicker(options);
    }

    try {
      const handles = await (window as any).showOpenFilePicker({
        ...options,
        multiple: options.multiple ?? true
      });

      const files: File[] = [];
      for (const handle of handles) {
        const file = await handle.getFile();
        files.push(file);
      }
      return files;
    } catch (error) {
      console.error('Failed to open file picker:', error);
      throw error;
    }
  }

  // Save file
  async saveFile(
    directoryHandle: FileSystemDirectoryHandle,
    fileName: string,
    content: string | Blob,
    mimeType = 'text/plain'
  ): Promise<FileSystemFileHandle> {
    try {
      const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      
      await writable.write(content);
      await writable.close();
      return fileHandle;
    } catch (error) {
      console.error('Failed to save file:', error);
      throw error;
    }
  }

  // Read directory
  async readDirectory(
    directoryHandle: FileSystemDirectoryHandle
  ): Promise<FileSystemEntry[]> {
    const entries: FileSystemEntry[] = [];

    const dirHandle = directoryHandle as any;
    for await (const [name, handle] of dirHandle.entries()) {
      const entry: FileSystemEntry = {
        name,
        isDirectory: handle.kind === 'directory',
        isFile: handle.kind === 'file',
      };
      
      if (handle.kind === 'file') {
        try {
          const file = await (handle as FileSystemFileHandle).getFile();
          entry.size = file.size;
          entry.lastModified = file.lastModified;
        } catch {
          // Ignore errors getting file metadata
        }
      }
      
      entries.push(entry);
    }

    return entries.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  // Create directory
  async createDirectory(
    parentHandle: FileSystemDirectoryHandle,
    directoryName: string
  ): Promise<FileSystemDirectoryHandle> {
    return await parentHandle.getDirectoryHandle(directoryName, { create: true });
  }

  // Delete file/directory
  async deleteEntry(
    directoryHandle: FileSystemDirectoryHandle,
    entryName: string
  ): Promise<void> {
    await directoryHandle.removeEntry(entryName, { recursive: true });
  }

  // Import project from local filesystem
  async importProject(): Promise<{
    directoryHandle: FileSystemDirectoryHandle;
    structure: FileSystemEntry[];
  }> {
    const directoryHandle = await this.requestDirectoryAccess();
    const structure = await this.readDirectory(directoryHandle);
    
    return {
      directoryHandle,
      structure
    };
  }

  // Export project to local filesystem
  async exportProject(
    directoryHandle: FileSystemDirectoryHandle,
    projectName: string
  ): Promise<void> {
    const exportHandle = await this.createDirectory(
      directoryHandle, 
      `${projectName}-export-${Date.now()}`
    );

    const files = await this.getAllFiles(directoryHandle);
    
    for (const file of files) {
      const content = await this.readFile(file.handle);
      const relativePath = file.path;
      const pathParts = relativePath.split('/');
      
      let currentDir = exportHandle;
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        currentDir = await this.createDirectory(currentDir, pathParts[i]);
      }
      
      await this.saveFile(currentDir, pathParts[pathParts.length - 1], content);
    }
  }

  // Helper methods
  private async getFileSize(handle: FileSystemFileHandle): Promise<number> {
    const file = await handle.getFile();
    return file.size;
  }

  private async getFileLastModified(handle: FileSystemFileHandle): Promise<number> {
    const file = await handle.getFile();
    return file.lastModified;
  }

  private async getAllFiles(
    directoryHandle: FileSystemDirectoryHandle,
    basePath = ''
  ): Promise<Array<{ handle: FileSystemFileHandle; path: string }>> {
    const files: Array<{ handle: FileSystemFileHandle; path: string }> = [];

    const dirHandle = directoryHandle as any;
    for await (const [name, handle] of dirHandle.entries()) {
      const currentPath = basePath ? `${basePath}/${name}` : name;

      if (handle.kind === 'file') {
        files.push({ handle: handle as FileSystemFileHandle, path: currentPath });
      } else if (handle.kind === 'directory') {
        const subFiles = await this.getAllFiles(
          handle as FileSystemDirectoryHandle,
          currentPath
        );
        files.push(...subFiles);
      }
    }

    return files;
  }

  private async readFile(handle: FileSystemFileHandle): Promise<string> {
    const file = await handle.getFile();
    return await file.text();
  }

  private async fallbackFilePicker(options: any): Promise<File[]> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = options.multiple ?? false;
      
      if (options.types && options.types.length > 0) {
        const acceptValues = options.types
          .flatMap((type: any) => Object.values(type.accept).flat());
        input.accept = acceptValues.join(',');
      } else if (options.accept) {
        input.accept = Object.values(options.accept).flat().join(',');
      }

      const changeHandler = (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (!target.files || target.files.length === 0) {
          reject(new Error('No files selected'));
        } else {
          resolve(Array.from(target.files));
        }
        input.removeEventListener('change', changeHandler);
      };

      input.addEventListener('change', changeHandler);
      input.click();
    });
  }

  // Get current directory handle
  getCurrentDirectoryHandle(): FileSystemDirectoryHandle | null {
    return this.directoryHandle;
  }
}

/**
 * React hook exposing Native File System capabilities and the currently selected directory handle.
 *
 * @returns An object with the following properties:
 * - `isSupported` - `true` when the browser supports the Native File System API (`showDirectoryPicker`), `false` otherwise.
 * - `directoryHandle` - the currently selected `FileSystemDirectoryHandle` or `null` if none selected.
 * - `requestDirectoryAccess()` - requests directory access, stores and returns the obtained `FileSystemDirectoryHandle`.
 * - `openFilePicker(options)` - opens a file picker (or a fallback picker) and returns selected `File` objects.
 * - `saveFile(dir, name, content)` - saves `content` to `name` inside `dir` and returns the created file handle.
 * - `readDirectory(dir)` - reads `dir` and returns an array of file/directory entries.
 * - `createDirectory(parent, name)` - creates (or gets) a subdirectory under `parent` and returns its handle.
 * - `deleteEntry(dir, name)` - deletes the named entry (file or directory) inside `dir`.
 * - `importProject()` - requests directory access and returns `{ directoryHandle, structure }` describing the directory.
 * - `exportProject(dir, name)` - exports the project into a timestamped subdirectory under `dir`.
 */
export function useNativeFileSystem() {
  const [isSupported, setIsSupported] = useState(false);
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);

  useEffect(() => {
    setIsSupported('showDirectoryPicker' in window);
  }, []);

  const manager = NativeFileSystemManager.getInstance();

  return {
    isSupported,
    directoryHandle,
    requestDirectoryAccess: async () => {
      const handle = await manager.requestDirectoryAccess();
      setDirectoryHandle(handle);
      return handle;
    },
    openFilePicker: (options?: any) => manager.openFilePicker(options),
    saveFile: (dir: FileSystemDirectoryHandle, name: string, content: any) => 
      manager.saveFile(dir, name, content),
    readDirectory: (dir: FileSystemDirectoryHandle) => manager.readDirectory(dir),
    createDirectory: (parent: FileSystemDirectoryHandle, name: string) => 
      manager.createDirectory(parent, name),
    deleteEntry: (dir: FileSystemDirectoryHandle, name: string) => 
      manager.deleteEntry(dir, name),
    importProject: () => manager.importProject(),
    exportProject: (dir: FileSystemDirectoryHandle, name: string) => 
      manager.exportProject(dir, name),
  };
}

import { useState, useEffect } from 'react';