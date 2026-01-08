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
 * Start an Electron application with merged default and custom launch options for end-to-end tests.
 *
 * @param options - Launch options that override defaults; the `env` object is merged with default environment variables.
 * @returns The launched Electron application and the Page for its main window
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
 * Close the Electron application referenced by the context.
 */
export async function closeElectronApp(context: ElectronAppContext): Promise<void> {
  await context.app.close();
}

/**
 * Waits for the app's renderer to reach a network-idle state, indicating the Next.js server is ready.
 *
 * @param window - Playwright Page representing the Electron window to observe
 * @param timeout - Maximum time to wait in milliseconds (default: 30000)
 */
export async function waitForServerReady(window: Page, timeout = 30000): Promise<void> {
  await window.waitForLoadState('networkidle', { timeout });
}

/**
 * Retrieves the application's version string from the Electron main process.
 *
 * @returns The application's version string as reported by Electron's `app.getVersion()`.
 */
export async function getAppVersion(app: ElectronApplication): Promise<string> {
  return app.evaluate(async ({ app }) => app.getVersion());
}

/**
 * Determine whether the Electron application is packaged.
 *
 * @returns `true` if the application is packaged, `false` otherwise.
 */
export async function isPackaged(app: ElectronApplication): Promise<boolean> {
  return app.evaluate(async ({ app }) => app.isPackaged);
}

/**
 * Patch the Electron `dialog` to simulate a user selecting files.
 *
 * The patched `showOpenDialog` will resolve to `{ canceled: false, filePaths: [...] }`.
 *
 * @param filePaths - Array of file paths to be returned as the selection by the dialog
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
 * Patches the Electron `dialog` implementation to simulate a user selecting a file in a save dialog.
 *
 * @param app - The Electron application whose main process `dialog` will be patched
 * @param filePath - The file path to return as the selected save location
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
 * Retrieve the bounds of the first BrowserWindow in the Electron application.
 *
 * @param app - The Electron application instance to query
 * @returns An object `{ x, y, width, height }` with the window's position and size in pixels
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
 * Maximizes the first BrowserWindow in the Electron application.
 *
 * @param app - The ElectronApplication whose first BrowserWindow will be maximized
 */
export async function maximizeWindow(app: ElectronApplication): Promise<void> {
  await app.evaluate(async ({ BrowserWindow }) => {
    const [window] = BrowserWindow.getAllWindows();
    window.maximize();
  });
}

/**
 * Minimizes the application's first BrowserWindow.
 */
export async function minimizeWindow(app: ElectronApplication): Promise<void> {
  await app.evaluate(async ({ BrowserWindow }) => {
    const [window] = BrowserWindow.getAllWindows();
    window.minimize();
  });
}

/**
 * Capture a full-page screenshot of the given Electron window and save it to the specified file path.
 *
 * @param window - The Playwright `Page` representing the Electron window to capture
 * @param path - File system path where the screenshot will be written
 */
export async function takeScreenshot(
  window: Page,
  path: string
): Promise<void> {
  await window.screenshot({ path, fullPage: true });
}

/**
 * Waits for a DOM element matching `selector` to become visible in the given window.
 *
 * @param selector - CSS or other selector used to locate the element
 * @param timeout - Maximum time in milliseconds to wait for the element to become visible (default: 10000)
 *
 * @throws If the element does not become visible before `timeout` elapses
 */
export async function waitForElement(
  window: Page,
  selector: string,
  timeout = 10000
): Promise<void> {
  await window.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Determine whether at least one DOM element on the page matches the given selector.
 *
 * @param window - The Playwright `Page` to query
 * @param selector - A selector string (CSS, text, or any Playwright-supported selector) to match elements
 * @returns `true` if at least one element matches `selector`, `false` otherwise.
 */
export async function elementExists(
  window: Page,
  selector: string
): Promise<boolean> {
  const count = await window.locator(selector).count();
  return count > 0;
}

/**
 * Types text into the element matching `selector`, inserting a delay between keystrokes to simulate realistic typing.
 *
 * @param window - The Playwright Page containing the target element
 * @param selector - Selector string identifying the target element
 * @param text - The text to type into the element
 * @param delay - Milliseconds to wait between each keystroke (default: 50)
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
 * Executes a keyboard shortcut in the given window by pressing modifier keys, then the final key, and releasing modifiers.
 *
 * @param window - Playwright page representing the window to receive the shortcut
 * @param shortcut - Shortcut string with keys separated by `+` (e.g. `"Control+S"`, `"Meta+Shift+P"`). Modifiers are applied in left-to-right order and released in reverse order.
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
 * Initiates an auto-update check in the application's main process.
 *
 * @param app - The Electron application whose updater will be checked
 */
export async function triggerUpdateCheck(app: ElectronApplication): Promise<void> {
  await app.evaluate(async () => {
    const { autoUpdater } = await import('electron-updater');
    await autoUpdater.checkForUpdates();
  });
}

/**
 * Collects console messages emitted by the renderer and returns a live array of formatted entries.
 *
 * The returned array is populated as messages arrive; each entry is formatted as `[type] message`.
 *
 * @param window - Playwright Page representing the renderer window
 * @returns An array that accumulates formatted console messages from the renderer
 */
export function collectConsoleLogs(window: Page): string[] {
  const logs: string[] = [];
  window.on('console', (msg) => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });
  return logs;
}

/**
 * Waits until the page emits a console message matching the provided regular expression.
 *
 * @param window - The Playwright Page to listen for console messages on
 * @param pattern - Regular expression to test console message text against
 * @param timeout - Maximum time in milliseconds to wait for a matching message
 * @returns The text of the first console message that matches `pattern`
 * @throws Rejects with an Error if no matching message is observed before `timeout` milliseconds
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