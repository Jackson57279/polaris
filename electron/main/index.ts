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
let isQuitting = false;

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
        try {
          // Remove protocol prefix and decode
          let sanitizedUrl = request.url.replace('polaris://', '');
          sanitizedUrl = decodeURIComponent(sanitizedUrl);
          // Remove leading slashes
          sanitizedUrl = sanitizedUrl.replace(/^\/+/, '');
          
          // Define safe base directory
          const baseDir = path.resolve(__dirname);
          
          // Resolve absolute path
          const resolvedPath = path.resolve(baseDir, sanitizedUrl);
          
          // Verify path is within base directory
          if (!resolvedPath.startsWith(baseDir)) {
            log.error('Protocol path traversal attempt:', request.url);
            return callback({ error: -6 }); // FILE_NOT_FOUND
          }
          
          return callback(resolvedPath);
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

  app.on('before-quit', (event) => {
    if (isQuitting) {
      return;
    }

    if (serverManager) {
      event.preventDefault();
      isQuitting = true;
      log.info('Application shutting down...');

      serverManager.stop()
        .then(() => {
          log.info('Server stopped successfully');
          serverManager = null;
          app.quit();
        })
        .catch((error) => {
          log.error('Error stopping server:', error);
          serverManager = null;
          app.quit();
        });
    }
  });
}
