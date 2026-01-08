/**
 * App Startup E2E Tests
 *
 * Tests for Electron application startup, window creation, and basic functionality.
 */

import { test, expect } from '@playwright/test';
import { ElectronAppHelper } from './helpers/electron-app';

let app: ElectronAppHelper;

test.describe('Application Startup', () => {
  test.beforeAll(async () => {
    app = new ElectronAppHelper();
    await app.launch();
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('should launch the application', async () => {
    expect(app.isRunning()).toBe(true);
  });

  test('should create a main window', async () => {
    const window = await app.getMainWindow();
    expect(window).toBeDefined();
  });

  test('should have correct window title', async () => {
    const window = await app.getMainWindow();
    const title = await window.title();
    expect(title).toContain('Polaris');
  });

  test('should have minimum window dimensions', async () => {
    const window = await app.getMainWindow();
    const size = await window.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));

    expect(size.width).toBeGreaterThanOrEqual(800);
    expect(size.height).toBeGreaterThanOrEqual(600);
  });

  test('should load the application content', async () => {
    const window = await app.getMainWindow();

    // Wait for the app to load
    await window.waitForLoadState('networkidle');

    // Check that the body has content
    const bodyContent = await window.locator('body').innerHTML();
    expect(bodyContent.length).toBeGreaterThan(0);
  });

  test('should not have console errors on startup', async () => {
    const window = await app.getMainWindow();
    const errors: string[] = [];

    window.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Give some time for any errors to appear
    await window.waitForTimeout(2000);

    // Filter out known acceptable errors
    const criticalErrors = errors.filter(
      (err) =>
        !err.includes('favicon') &&
        !err.includes('DevTools') &&
        !err.includes('electron')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Window Controls', () => {
  test.beforeAll(async () => {
    app = new ElectronAppHelper();
    await app.launch();
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('should show window controls on Windows/Linux', async () => {
    const window = await app.getMainWindow();
    const platform = process.platform;

    if (platform !== 'darwin') {
      // On Windows/Linux, custom window controls should be visible
      const controls = window.locator('[data-testid="window-controls"]');
      await expect(controls).toBeVisible();
    }
  });

  test('should minimize window', async () => {
    const electronApp = app.getElectronApp();
    const window = await electronApp.firstWindow();

    // Get the BrowserWindow
    const isMinimized = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      win.minimize();
      return win.isMinimized();
    });

    expect(isMinimized).toBe(true);

    // Restore for subsequent tests
    await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      win.restore();
    });
  });

  test('should maximize and restore window', async () => {
    const electronApp = app.getElectronApp();

    // Maximize
    const isMaximized = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      win.maximize();
      return win.isMaximized();
    });

    expect(isMaximized).toBe(true);

    // Restore
    const isRestored = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      win.unmaximize();
      return !win.isMaximized();
    });

    expect(isRestored).toBe(true);
  });
});

test.describe('Navigation', () => {
  test.beforeAll(async () => {
    app = new ElectronAppHelper();
    await app.launch();
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('should navigate between routes', async () => {
    const window = await app.getMainWindow();

    // Navigate to a route (adjust based on your app's routes)
    await window.goto('http://localhost:3000/');
    await window.waitForLoadState('networkidle');

    // Verify we're on the home page
    const url = window.url();
    expect(url).toContain('localhost');
  });

  test('should handle back/forward navigation', async () => {
    const window = await app.getMainWindow();

    // Navigate to home
    await window.goto('http://localhost:3000/');
    const homeUrl = window.url();

    // Navigate to another page if available
    await window.goto('http://localhost:3000/editor');
    const editorUrl = window.url();

    // Go back
    await window.goBack();
    expect(window.url()).toBe(homeUrl);

    // Go forward
    await window.goForward();
    expect(window.url()).toBe(editorUrl);
  });
});

test.describe('Environment Detection', () => {
  test.beforeAll(async () => {
    app = new ElectronAppHelper();
    await app.launch();
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('should detect Electron environment', async () => {
    const window = await app.getMainWindow();

    const isElectron = await window.evaluate(() => {
      return !!(window as any).electron;
    });

    expect(isElectron).toBe(true);
  });

  test('should have electron API available', async () => {
    const window = await app.getMainWindow();

    const hasFileSystem = await window.evaluate(() => {
      return !!(window as any).electron?.fileSystem;
    });

    const hasDialog = await window.evaluate(() => {
      return !!(window as any).electron?.dialog;
    });

    const hasWindow = await window.evaluate(() => {
      return !!(window as any).electron?.window;
    });

    expect(hasFileSystem).toBe(true);
    expect(hasDialog).toBe(true);
    expect(hasWindow).toBe(true);
  });

  test('should show environment indicator in dev mode', async () => {
    const window = await app.getMainWindow();

    // In development mode, the environment indicator should be visible
    if (process.env.NODE_ENV === 'development') {
      const indicator = window.locator('[data-testid="environment-indicator"]');
      await expect(indicator).toBeVisible();
      await expect(indicator).toContainText('Electron');
    }
  });
});
