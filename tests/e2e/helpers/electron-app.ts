/**
 * Electron E2E Test Helpers
 * Utilities for launching and interacting with the Electron app in tests
 */

import { _electron as electron, ElectronApplication, Page } from 'playwright';
import path from 'path';

export interface ElectronAppContext {
  app: ElectronApplication;
  window: Page;
}

/**
 * Default Electron launch options
 */
const defaultLaunchOptions = {
  args: [path.join(__dirname, '../../../electron/main/index.js')],
  env: {
    ...process.env,
    NODE_ENV: 'test',
    IS_ELECTRON: 'true',
  },
};

/**
 * Launch the Electron application for testing
 * @param options - Custom launch options
 * @returns The Electron app and main window
 */
export async function launchElectronApp(
  options: Partial<typeof defaultLaunchOptions> = {}
): Promise<ElectronAppContext> {
  const mergedOptions = {
    ...defaultLaunchOptions,
    ...options,
    env: {
      ...defaultLaunchOptions.env,
      ...options.env,
    },
  };

  const app = await electron.launch(mergedOptions);

  // Wait for the first window to open
  const window = await app.firstWindow();

  // Wait for the window to be ready
  await window.waitForLoadState('domcontentloaded');

  return { app, window };
}

/**
 * Close the Electron app gracefully
 */
export async function closeElectronApp(context: ElectronAppContext): Promise<void> {
  await context.app.close();
}

/**
 * Wait for the Next.js server to be ready inside Electron
 */
export async function waitForServerReady(window: Page, timeout = 30000): Promise<void> {
  await window.waitForLoadState('networkidle', { timeout });
}

/**
 * Get the app version from the Electron main process
 */
export async function getAppVersion(app: ElectronApplication): Promise<string> {
  return app.evaluate(async ({ app }) => app.getVersion());
}

/**
 * Check if we're running in a packaged app
 */
export async function isPackaged(app: ElectronApplication): Promise<boolean> {
  return app.evaluate(async ({ app }) => app.isPackaged);
}

/**
 * Simulate file dialog selection
 * This patches the dialog module to return predefined paths
 */
export async function mockFileDialog(
  app: ElectronApplication,
  filePaths: string[]
): Promise<void> {
  await app.evaluate(
    async ({ dialog }, paths) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: paths,
      });
    },
    filePaths
  );
}

/**
 * Simulate save dialog selection
 */
export async function mockSaveDialog(
  app: ElectronApplication,
  filePath: string
): Promise<void> {
  await app.evaluate(
    async ({ dialog }, path) => {
      dialog.showSaveDialog = async () => ({
        canceled: false,
        filePath: path,
      });
    },
    filePath
  );
}

/**
 * Get window bounds
 */
export async function getWindowBounds(
  app: ElectronApplication
): Promise<{ x: number; y: number; width: number; height: number }> {
  return app.evaluate(async ({ BrowserWindow }) => {
    const [window] = BrowserWindow.getAllWindows();
    return window.getBounds();
  });
}

/**
 * Maximize/minimize window
 */
export async function maximizeWindow(app: ElectronApplication): Promise<void> {
  await app.evaluate(async ({ BrowserWindow }) => {
    const [window] = BrowserWindow.getAllWindows();
    window.maximize();
  });
}

export async function minimizeWindow(app: ElectronApplication): Promise<void> {
  await app.evaluate(async ({ BrowserWindow }) => {
    const [window] = BrowserWindow.getAllWindows();
    window.minimize();
  });
}

/**
 * Take a screenshot of the Electron window
 */
export async function takeScreenshot(
  window: Page,
  path: string
): Promise<void> {
  await window.screenshot({ path, fullPage: true });
}

/**
 * Wait for element to be visible with custom timeout
 */
export async function waitForElement(
  window: Page,
  selector: string,
  timeout = 10000
): Promise<void> {
  await window.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Check if element exists
 */
export async function elementExists(
  window: Page,
  selector: string
): Promise<boolean> {
  const count = await window.locator(selector).count();
  return count > 0;
}

/**
 * Type text with realistic delay
 */
export async function typeText(
  window: Page,
  selector: string,
  text: string,
  delay = 50
): Promise<void> {
  await window.click(selector);
  await window.keyboard.type(text, { delay });
}

/**
 * Execute keyboard shortcut
 */
export async function executeShortcut(
  window: Page,
  shortcut: string
): Promise<void> {
  const keys = shortcut.split('+');
  const modifiers = keys.slice(0, -1);
  const key = keys[keys.length - 1];

  for (const modifier of modifiers) {
    await window.keyboard.down(modifier);
  }
  await window.keyboard.press(key);
  for (const modifier of modifiers.reverse()) {
    await window.keyboard.up(modifier);
  }
}

/**
 * Trigger auto-update check
 */
export async function triggerUpdateCheck(app: ElectronApplication): Promise<void> {
  await app.evaluate(async () => {
    const { autoUpdater } = await import('electron-updater');
    await autoUpdater.checkForUpdates();
  });
}

/**
 * Get console logs from the renderer process
 */
export function collectConsoleLogs(window: Page): string[] {
  const logs: string[] = [];
  window.on('console', (msg) => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });
  return logs;
}

/**
 * Wait for specific console message
 */
export async function waitForConsoleMessage(
  window: Page,
  pattern: RegExp,
  timeout = 10000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for console message matching ${pattern}`));
    }, timeout);

    window.on('console', (msg) => {
      const text = msg.text();
      if (pattern.test(text)) {
        clearTimeout(timer);
        resolve(text);
      }
    });
  });
}
