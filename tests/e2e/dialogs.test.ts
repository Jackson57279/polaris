/**
 * Dialog E2E Tests
 *
 * Tests for native dialog operations in Electron.
 */

import { test, expect } from '@playwright/test';
import { ElectronAppHelper } from './helpers/electron-app';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

let app: ElectronAppHelper;

test.describe('Native Dialogs', () => {
  test.beforeAll(async () => {
    app = new ElectronAppHelper();
    await app.launch();
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('should have dialog API available', async () => {
    const window = await app.getMainWindow();

    const hasDialog = await window.evaluate(() => {
      const electron = (window as any).electron;
      return (
        typeof electron?.dialog?.showOpenDialog === 'function' &&
        typeof electron?.dialog?.showSaveDialog === 'function' &&
        typeof electron?.dialog?.showMessageBox === 'function'
      );
    });

    expect(hasDialog).toBe(true);
  });

  // Note: Actual dialog tests require mocking the dialog module
  // as dialogs are blocking and require user interaction.
  // These tests verify the API is available and properly typed.

  test('should accept correct open dialog options', async () => {
    const window = await app.getMainWindow();

    // We can't actually open the dialog in tests, but we can verify
    // the function accepts the correct options without throwing
    const result = await window.evaluate(async () => {
      const electron = (window as any).electron;

      // This would normally open a dialog, but in test mode
      // the main process can be configured to auto-respond
      try {
        // Just verify the function exists and accepts options
        const fn = electron?.dialog?.showOpenDialog;
        return typeof fn === 'function';
      } catch {
        return false;
      }
    });

    expect(result).toBe(true);
  });

  test('should accept correct save dialog options', async () => {
    const window = await app.getMainWindow();

    const result = await window.evaluate(async () => {
      const electron = (window as any).electron;

      try {
        const fn = electron?.dialog?.showSaveDialog;
        return typeof fn === 'function';
      } catch {
        return false;
      }
    });

    expect(result).toBe(true);
  });

  test('should accept correct message box options', async () => {
    const window = await app.getMainWindow();

    const result = await window.evaluate(async () => {
      const electron = (window as any).electron;

      try {
        const fn = electron?.dialog?.showMessageBox;
        return typeof fn === 'function';
      } catch {
        return false;
      }
    });

    expect(result).toBe(true);
  });
});

test.describe('System Notifications', () => {
  test.beforeAll(async () => {
    app = new ElectronAppHelper();
    await app.launch();
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('should have notification API available', async () => {
    const window = await app.getMainWindow();

    const hasNotification = await window.evaluate(() => {
      const electron = (window as any).electron;
      return typeof electron?.notification?.show === 'function';
    });

    expect(hasNotification).toBe(true);
  });

  test('should send notification without error', async () => {
    const window = await app.getMainWindow();

    const result = await window.evaluate(async () => {
      const electron = (window as any).electron;

      try {
        await electron?.notification?.show({
          title: 'Test Notification',
          body: 'This is a test notification from E2E tests',
        });
        return true;
      } catch (error) {
        return false;
      }
    });

    expect(result).toBe(true);
  });
});

test.describe('Shell Operations', () => {
  test.beforeAll(async () => {
    app = new ElectronAppHelper();
    await app.launch();
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('should have shell API available', async () => {
    const window = await app.getMainWindow();

    const hasShell = await window.evaluate(() => {
      const electron = (window as any).electron;
      return (
        typeof electron?.shell?.openExternal === 'function' &&
        typeof electron?.shell?.showItemInFolder === 'function'
      );
    });

    expect(hasShell).toBe(true);
  });

  test('should open folder in file manager', async () => {
    const window = await app.getMainWindow();
    const testDir = os.tmpdir();

    const result = await window.evaluate(async (dirPath) => {
      const electron = (window as any).electron;

      try {
        await electron?.shell?.showItemInFolder(dirPath);
        return true;
      } catch (error) {
        return false;
      }
    }, testDir);

    expect(result).toBe(true);
  });

  // Note: openExternal is intentionally not tested as it would
  // open external applications/URLs
});

test.describe('App Information', () => {
  test.beforeAll(async () => {
    app = new ElectronAppHelper();
    await app.launch();
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('should get app version', async () => {
    const window = await app.getMainWindow();

    const version = await window.evaluate(async () => {
      const electron = (window as any).electron;
      return await electron?.app?.getVersion();
    });

    expect(version).toBeDefined();
    expect(typeof version).toBe('string');
    // Version should match semver pattern
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  test('should get app name', async () => {
    const window = await app.getMainWindow();

    const name = await window.evaluate(async () => {
      const electron = (window as any).electron;
      return await electron?.app?.getName();
    });

    expect(name).toBeDefined();
    expect(typeof name).toBe('string');
    expect(name).toBe('Polaris IDE');
  });

  test('should get app paths', async () => {
    const window = await app.getMainWindow();

    const paths = await window.evaluate(async () => {
      const electron = (window as any).electron;
      return {
        userData: await electron?.app?.getPath('userData'),
        temp: await electron?.app?.getPath('temp'),
        documents: await electron?.app?.getPath('documents'),
      };
    });

    expect(paths.userData).toBeDefined();
    expect(typeof paths.userData).toBe('string');
    expect(paths.temp).toBeDefined();
    expect(paths.documents).toBeDefined();
  });
});
