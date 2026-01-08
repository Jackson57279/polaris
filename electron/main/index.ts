/**
 * Electron Main Process Entry Point
 *
 * This is the heart of the Electron application. It manages:
 * - Application lifecycle
 * - Window creation and management
 * - Next.js server lifecycle
 * - IPC handler registration
 * - Protocol handling
 * - Auto-updates
 */

import { app, BrowserWindow, protocol, shell } from 'electron';
import path from 'path';
import { WindowManager } from './window-manager';
import { ServerManager } from './server-manager';
import { registerAllIpcHandlers } from './ipc';
import { AutoUpdaterManager, registerUpdaterHandlers } from './auto-updater';
import { createApplicationMenu } from './menu';
import { TrayManager } from './tray';
import { registerProtocolHandler } from './protocol-handler';
import electronLog from 'electron-log';

// Configure logging
electronLog.transports.file.level = 'info';
electronLog.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : 'info';

// Global references to prevent garbage collection
let windowManager: WindowManager | null = null;
let serverManager: ServerManager | null = null;
let autoUpdaterManager: AutoUpdaterManager | null = null;
let trayManager: TrayManager | null = null;

/**
 * Ensure single instance of the application
 */
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  electronLog.warn('Another instance is already running. Quitting...');
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Focus the main window if a second instance is attempted
    const mainWindow = windowManager?.getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }

    // Handle protocol URLs from second instance
    const url = commandLine.find((arg) => arg.startsWith('polaris://'));
    if (url) {
      handleProtocolUrl(url);
    }
  });
}

/**
 * Forwards a received polaris:// URL to the renderer by sending a `protocol-url` IPC message to the main window.
 *
 * If no main window is available, the URL is not forwarded.
 *
 * @param url - The polaris protocol URL to handle (e.g., `polaris://...`)
 */
function handleProtocolUrl(url: string): void {
  electronLog.info('Handling protocol URL:', url);
  const mainWindow = windowManager?.getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.send('protocol-url', url);
  }
}

/**
 * Register the application as the system handler for the `polaris://` protocol.
 *
 * In packaged runs this sets the app as the default protocol client. In development
 * (when `process.defaultApp` is true) it registers using the current Node/Electron
 * executable and the app's script path so protocol links launch the running app.
 */
function registerProtocol(): void {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('polaris', process.execPath, [
        path.resolve(process.argv[1]),
      ]);
    }
  } else {
    app.setAsDefaultProtocolClient('polaris');
  }
}

/**
 * Initialize and start the application's core services and main window.
 *
 * Performs app startup tasks such as registering the custom protocol, starting
 * the local web server, creating the main BrowserWindow, registering IPC
 * handlers, setting up the application menu, and initializing the auto-updater
 * when the app is packaged.
 *
 * @returns Nothing.
 */
async function initialize(): Promise<void> {
  electronLog.info('Initializing Polaris IDE...');
  electronLog.info('App version:', app.getVersion());
  electronLog.info('Electron version:', process.versions.electron);
  electronLog.info('Chrome version:', process.versions.chrome);
  electronLog.info('Node version:', process.versions.node);
  electronLog.info('Is packaged:', app.isPackaged);

  // Register custom protocol
  registerProtocol();

  // Start the Next.js server
  serverManager = new ServerManager();
  const serverPort = await serverManager.start();
  electronLog.info(`Next.js server started on port ${serverPort}`);

  // Create the main window
  windowManager = new WindowManager(serverPort);
  const mainWindow = windowManager.createMainWindow();

  // Register IPC handlers
  registerAllIpcHandlers();

  // Set up application menu
  createApplicationMenu(mainWindow);

  // Initialize auto-updater (production only)
  if (app.isPackaged) {
    autoUpdaterManager = new AutoUpdaterManager(mainWindow);
    registerUpdaterHandlers(autoUpdaterManager);
  }

  // Initialize system tray (optional)
  // trayManager = new TrayManager(mainWindow);

  electronLog.info('Polaris IDE initialized successfully');
}

/**
 * Application ready event
 */
app.whenReady().then(async () => {
  electronLog.info('App ready event received');

  try {
    await initialize();
  } catch (error) {
    electronLog.error('Failed to initialize application:', error);
    app.quit();
  }

  // macOS: Re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager?.createMainWindow();
    }
  });
});

/**
 * Window all closed event
 */
app.on('window-all-closed', () => {
  // On macOS, keep the app running unless explicitly quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Before quit - cleanup
 */
app.on('before-quit', async () => {
  electronLog.info('Application quitting...');

  // Stop the Next.js server
  if (serverManager) {
    await serverManager.stop();
  }

// Clean up tray
  if (trayManager !== null) {
    (trayManager as TrayManager).destroy();
  }
});

/**
 * Handle certificate errors (development only)
 */
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (!app.isPackaged) {
    // In development, allow localhost with self-signed certs
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

/**
 * Prevent new window creation (security)
 */
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    // Open external links in the default browser
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Prevent navigation to external sites
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const serverPort = serverManager?.getPort() || 3000;

    // Only allow navigation to localhost (our server)
    if (parsedUrl.origin !== `http://localhost:${serverPort}`) {
      event.preventDefault();
      electronLog.warn('Blocked navigation to:', navigationUrl);
    }
  });
});

/**
 * Handle open-url event (macOS protocol handler)
 */
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleProtocolUrl(url);
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  electronLog.error('Unhandled Promise Rejection:', reason);
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  electronLog.error('Uncaught Exception:', error);
  // Don't exit immediately in production - show error dialog
  if (app.isPackaged) {
    const { dialog } = require('electron');
    dialog.showErrorBox('An error occurred', error.message);
  }
});

// Export for testing
export { windowManager, serverManager, autoUpdaterManager, initialize };