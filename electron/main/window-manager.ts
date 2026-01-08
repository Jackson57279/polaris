/**
 * Window Manager
 *
 * Manages BrowserWindow creation and lifecycle
 * Handles window state, security, and configuration
 */

import { BrowserWindow, app, screen } from 'electron';
import path from 'path';
import electronLog from 'electron-log';

export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private serverPort: number;

  constructor(serverPort: number) {
    this.serverPort = serverPort;
  }

  /**
   * Create the main application window
   */
  createMainWindow(): BrowserWindow {
    const windowState = this.getWindowState();

    this.mainWindow = new BrowserWindow({
      x: windowState.x,
      y: windowState.y,
      width: windowState.width,
      height: windowState.height,
      minWidth: 800,
      minHeight: 600,
      show: false, // Show after ready-to-show for smoother UX
      backgroundColor: '#0b1220',
      title: 'Polaris IDE',
      icon: this.getIcon(),

      // Custom title bar for Windows
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
      titleBarOverlay: process.platform === 'win32' ? {
        color: '#0b1220',
        symbolColor: '#ffffff',
        height: 40,
      } : undefined,

      // Security settings
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false, // Required for preload script
        webSecurity: true,
        allowRunningInsecureContent: false,
        webviewTag: false,
        // Enable SharedArrayBuffer for WebContainer API
        additionalArguments: ['--enable-features=SharedArrayBuffer'],
      },
    });

    // Restore maximized state
    if (windowState.isMaximized) {
      this.mainWindow.maximize();
    }

    // Configure window behavior
    this.setupWindowEvents();
    this.setupSecurityHandlers();

    // Load the application
    this.loadApplication();

    return this.mainWindow;
  }

  /**
   * Get the main window instance
   */
  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  /**
   * Load the Next.js application
   */
  private loadApplication(): void {
    if (!this.mainWindow) return;

    const startUrl = `http://localhost:${this.serverPort}`;
    electronLog.info('Loading application from:', startUrl);

    this.mainWindow.loadURL(startUrl).catch((error) => {
      electronLog.error('Failed to load application:', error);
      // Retry loading after a delay
      setTimeout(() => {
        this.mainWindow?.loadURL(startUrl);
      }, 2000);
    });
  }

  /**
   * Set up window event handlers
   */
  private setupWindowEvents(): void {
    if (!this.mainWindow) return;

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      electronLog.info('Window ready to show');
      this.mainWindow?.show();
      this.mainWindow?.focus();
    });

    // Save window state on close
    this.mainWindow.on('close', () => {
      this.saveWindowState();
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Handle maximize/unmaximize for state saving
    this.mainWindow.on('maximize', () => {
      this.mainWindow?.webContents.send('window-maximized', true);
    });

    this.mainWindow.on('unmaximize', () => {
      this.mainWindow?.webContents.send('window-maximized', false);
    });

    // Handle enter/leave fullscreen
    this.mainWindow.on('enter-full-screen', () => {
      this.mainWindow?.webContents.send('window-fullscreen', true);
    });

    this.mainWindow.on('leave-full-screen', () => {
      this.mainWindow?.webContents.send('window-fullscreen', false);
    });

    // Handle focus events
    this.mainWindow.on('focus', () => {
      this.mainWindow?.webContents.send('window-focus', true);
    });

    this.mainWindow.on('blur', () => {
      this.mainWindow?.webContents.send('window-focus', false);
    });

    // Development: Open DevTools
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  }

  /**
   * Set up security handlers
   */
  private setupSecurityHandlers(): void {
    if (!this.mainWindow) return;

    // Prevent navigation to external sites
    this.mainWindow.webContents.on('will-navigate', (event, url) => {
      const parsedUrl = new URL(url);
      const allowedOrigin = `http://localhost:${this.serverPort}`;

      if (parsedUrl.origin !== allowedOrigin) {
        electronLog.warn('Blocked navigation to:', url);
        event.preventDefault();
      }
    });

    // Block new window creation
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      electronLog.info('Blocked new window for:', url);
      // Open external links in default browser
      if (url.startsWith('http://') || url.startsWith('https://')) {
        require('electron').shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    // Prevent file drops from loading
    this.mainWindow.webContents.on('will-attach-webview', (event) => {
      event.preventDefault();
      electronLog.warn('Blocked webview attachment');
    });
  }

  /**
   * Get the application icon path
   */
  private getIcon(): string {
    const iconDir = path.join(__dirname, '../resources/icons');

    if (process.platform === 'win32') {
      return path.join(iconDir, 'icon.ico');
    } else if (process.platform === 'darwin') {
      return path.join(iconDir, 'icon.icns');
    } else {
      return path.join(iconDir, 'icon.png');
    }
  }

  /**
   * Get saved window state or defaults
   */
  private getWindowState(): WindowState {
    const Store = require('electron-store');
    const store = new Store();
    const savedState = store.get('windowState') as WindowState | undefined;

    // Default state
    const defaultState: WindowState = {
      x: undefined as unknown as number,
      y: undefined as unknown as number,
      width: 1400,
      height: 900,
      isMaximized: false,
    };

    if (!savedState) {
      return defaultState;
    }

    // Validate that the saved position is still on a display
    const displays = screen.getAllDisplays();
    const isOnScreen = displays.some((display) => {
      const { x, y, width, height } = display.bounds;
      return (
        savedState.x >= x &&
        savedState.x < x + width &&
        savedState.y >= y &&
        savedState.y < y + height
      );
    });

    if (!isOnScreen) {
      // Reset position if window would be off-screen
      return {
        ...savedState,
        x: undefined as unknown as number,
        y: undefined as unknown as number,
      };
    }

    return savedState;
  }

  /**
   * Save current window state
   */
  private saveWindowState(): void {
    if (!this.mainWindow) return;

    const Store = require('electron-store');
    const store = new Store();

    const isMaximized = this.mainWindow.isMaximized();
    const bounds = this.mainWindow.getBounds();

    // Don't save position/size if maximized (we want to restore to previous normal size)
    const state: WindowState = isMaximized
      ? {
          ...store.get('windowState', { x: 0, y: 0, width: 1400, height: 900 }),
          isMaximized: true,
        }
      : {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          isMaximized: false,
        };

    store.set('windowState', state);
    electronLog.debug('Saved window state:', state);
  }

  /**
   * Focus the main window
   */
  focus(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.focus();
    }
  }

  /**
   * Reload the main window
   */
  reload(): void {
    this.mainWindow?.reload();
  }

  /**
   * Toggle DevTools
   */
  toggleDevTools(): void {
    this.mainWindow?.webContents.toggleDevTools();
  }

  /**
   * Get window state for IPC
   */
  getState(): { isMaximized: boolean; isFullScreen: boolean; isFocused: boolean } {
    return {
      isMaximized: this.mainWindow?.isMaximized() ?? false,
      isFullScreen: this.mainWindow?.isFullScreen() ?? false,
      isFocused: this.mainWindow?.isFocused() ?? false,
    };
  }
}
