/**
 * File Operations E2E Tests
 *
 * Tests for native file system operations in Electron.
 */

import { test, expect } from '@playwright/test';
import { ElectronAppHelper } from './helpers/electron-app';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

let app: ElectronAppHelper;
let testDir: string;

test.describe('File System Operations', () => {
  test.beforeAll(async () => {
    app = new ElectronAppHelper();
    await app.launch();

    // Create a temporary test directory
    testDir = path.join(os.tmpdir(), `polaris-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  test.afterAll(async () => {
    await app.close();

    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('should read a file', async () => {
    const window = await app.getMainWindow();

    // Create a test file
    const testFile = path.join(testDir, 'test-read.txt');
    const testContent = 'Hello, Polaris IDE!';
    await fs.writeFile(testFile, testContent, 'utf-8');

    // Read via Electron IPC
    const content = await window.evaluate(async (filePath) => {
      return await (window as any).electron.fileSystem.readFile(filePath);
    }, testFile);

    expect(content).toBe(testContent);
  });

  test('should write a file', async () => {
    const window = await app.getMainWindow();

    const testFile = path.join(testDir, 'test-write.txt');
    const testContent = 'Written from Electron!';

    // Write via Electron IPC
    await window.evaluate(
      async ({ filePath, content }) => {
        await (window as any).electron.fileSystem.writeFile(filePath, content);
      },
      { filePath: testFile, content: testContent }
    );

    // Verify file was written
    const actualContent = await fs.readFile(testFile, 'utf-8');
    expect(actualContent).toBe(testContent);
  });

  test('should check if file exists', async () => {
    const window = await app.getMainWindow();

    const existingFile = path.join(testDir, 'existing.txt');
    const nonExistingFile = path.join(testDir, 'non-existing.txt');

    await fs.writeFile(existingFile, 'exists', 'utf-8');

    const exists = await window.evaluate(async (filePath) => {
      return await (window as any).electron.fileSystem.exists(filePath);
    }, existingFile);

    const notExists = await window.evaluate(async (filePath) => {
      return await (window as any).electron.fileSystem.exists(filePath);
    }, nonExistingFile);

    expect(exists).toBe(true);
    expect(notExists).toBe(false);
  });

  test('should create a directory', async () => {
    const window = await app.getMainWindow();

    const newDir = path.join(testDir, 'new-directory');

    await window.evaluate(async (dirPath) => {
      await (window as any).electron.fileSystem.mkdir(dirPath);
    }, newDir);

    const stat = await fs.stat(newDir);
    expect(stat.isDirectory()).toBe(true);
  });

  test('should read directory contents', async () => {
    const window = await app.getMainWindow();

    // Create some files in test directory
    await fs.writeFile(path.join(testDir, 'file1.txt'), 'content1');
    await fs.writeFile(path.join(testDir, 'file2.txt'), 'content2');

    const entries = await window.evaluate(async (dirPath) => {
      return await (window as any).electron.fileSystem.readDir(dirPath);
    }, testDir);

    expect(entries).toContain('file1.txt');
    expect(entries).toContain('file2.txt');
  });

  test('should delete a file', async () => {
    const window = await app.getMainWindow();

    const fileToDelete = path.join(testDir, 'to-delete.txt');
    await fs.writeFile(fileToDelete, 'delete me');

    await window.evaluate(async (filePath) => {
      await (window as any).electron.fileSystem.delete(filePath);
    }, fileToDelete);

    const exists = await fs
      .access(fileToDelete)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(false);
  });

  test('should get file stats', async () => {
    const window = await app.getMainWindow();

    const testFile = path.join(testDir, 'stats-test.txt');
    const testContent = 'Test content for stats';
    await fs.writeFile(testFile, testContent);

    const stats = await window.evaluate(async (filePath) => {
      return await (window as any).electron.fileSystem.stat(filePath);
    }, testFile);

    expect(stats).toBeDefined();
    expect(stats.size).toBe(testContent.length);
    expect(stats.isFile).toBe(true);
    expect(stats.isDirectory).toBe(false);
  });

  test('should rename/move a file', async () => {
    const window = await app.getMainWindow();

    const oldPath = path.join(testDir, 'old-name.txt');
    const newPath = path.join(testDir, 'new-name.txt');

    await fs.writeFile(oldPath, 'rename me');

    await window.evaluate(
      async ({ oldPath, newPath }) => {
        await (window as any).electron.fileSystem.rename(oldPath, newPath);
      },
      { oldPath, newPath }
    );

    const oldExists = await fs
      .access(oldPath)
      .then(() => true)
      .catch(() => false);
    const newExists = await fs
      .access(newPath)
      .then(() => true)
      .catch(() => false);

    expect(oldExists).toBe(false);
    expect(newExists).toBe(true);
  });

  test('should copy a file', async () => {
    const window = await app.getMainWindow();

    const srcPath = path.join(testDir, 'source.txt');
    const destPath = path.join(testDir, 'destination.txt');
    const content = 'Copy this content';

    await fs.writeFile(srcPath, content);

    await window.evaluate(
      async ({ src, dest }) => {
        await (window as any).electron.fileSystem.copy(src, dest);
      },
      { src: srcPath, dest: destPath }
    );

    const srcContent = await fs.readFile(srcPath, 'utf-8');
    const destContent = await fs.readFile(destPath, 'utf-8');

    expect(srcContent).toBe(content);
    expect(destContent).toBe(content);
  });
});

test.describe('File System Security', () => {
  test.beforeAll(async () => {
    app = new ElectronAppHelper();
    await app.launch();
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('should reject access to forbidden paths', async () => {
    const window = await app.getMainWindow();

    const forbiddenPaths = [
      '/etc/passwd',
      '/etc/shadow',
      'C:\\Windows\\System32\\config\\SAM',
    ];

    for (const forbiddenPath of forbiddenPaths) {
      try {
        await window.evaluate(async (filePath) => {
          return await (window as any).electron.fileSystem.readFile(filePath);
        }, forbiddenPath);

        // If we get here, the security check failed
        expect(false).toBe(true); // Force test failure
      } catch (error: any) {
        // Should throw an error about access denied
        expect(error.message).toMatch(/denied|forbidden|not allowed/i);
      }
    }
  });

  test('should reject path traversal attempts', async () => {
    const window = await app.getMainWindow();

    const traversalPaths = [
      '../../../etc/passwd',
      '..\\..\\..\\Windows\\System32',
      '/home/user/../../../etc/passwd',
    ];

    for (const traversalPath of traversalPaths) {
      try {
        await window.evaluate(async (filePath) => {
          return await (window as any).electron.fileSystem.readFile(filePath);
        }, traversalPath);

        expect(false).toBe(true); // Force test failure
      } catch (error: any) {
        // Should throw an error
        expect(error).toBeDefined();
      }
    }
  });
});
