import { app, BrowserWindow, protocol } from 'electron';
import path from 'path';
import log from 'electron-log';
import { WindowManager } from './window-manager';
import { ServerManager } from './server-manager';
import { registerIpcHandlers } from './ipc';
import { setupAutoUpdater } from './auto-updater';
import { setupMenu } from './menu';

log.initialize();

const isDev = process.env.NODE_ENV === 'development';
let windowManager: WindowManager | null = null;
let serverManager: ServerManager | null = null;

async function createApplication() {
  try {
    log.info('Starting Polaris IDE application...');

    // Start Next.js server
    serverManager = new ServerManager(isDev);
    const port = await serverManager.start();
    log.info(`Next.js server started on port ${port}`);

    // Create main window
    windowManager = new WindowManager(port, isDev);
    const mainWindow = await windowManager.createMainWindow();
    log.info('Main window created');

    // Register IPC handlers
    registerIpcHandlers(mainWindow);
    log.info('IPC handlers registered');

    // Setup application menu
    setupMenu(mainWindow);

    // Setup auto-updater (production only)
    if (!isDev) {
      setupAutoUpdater(mainWindow);
    }

    log.info('Application started successfully');
  } catch (error) {
    log.error('Failed to start application:', error);
    app.quit();
  }
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  log.info('Another instance is already running');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (windowManager) {
      const mainWindow = windowManager.getMainWindow();
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    }
  });

  app.whenReady().then(() => {
    // Register protocol in production
    if (!isDev) {
      protocol.registerFileProtocol('polaris', (request, callback) => {
        const url = request.url.replace('polaris://', '');
        try {
          return callback(path.normalize(path.join(__dirname, url)));
        } catch (error) {
          log.error('Protocol error:', error);
          return callback({ error: -2 });
        }
      });
    }

    createApplication();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createApplication();
    }
  });

  app.on('before-quit', async () => {
    log.info('Application shutting down...');
    if (serverManager) {
      await serverManager.stop();
    }
  });
}
