import { BrowserWindow, screen, shell } from 'electron';
import path from 'path';
import log from 'electron-log';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private port: number;
  private isDev: boolean;

  constructor(port: number, isDev: boolean) {
    this.port = port;
    this.isDev = isDev;
  }

  async createMainWindow(): Promise<BrowserWindow> {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    this.mainWindow = new BrowserWindow({
      width: Math.floor(width * 0.8),
      height: Math.floor(height * 0.8),
      minWidth: 1024,
      minHeight: 768,
      show: false,
      backgroundColor: '#0a0a0a',
      icon: path.join(__dirname, '../resources/icons/icon.png'),
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        devTools: this.isDev
      }
    });

    // Show window when ready (attach before loading URL)
    this.mainWindow.once('ready-to-show', () => {
      if (this.mainWindow) {
        this.mainWindow.show();
        if (this.isDev) {
          this.mainWindow.webContents.openDevTools();
        }
      }
    });

    // Load the app
    const url = `http://localhost:${this.port}`;
    log.info(`Loading URL: ${url}`);

    try {
      await this.mainWindow.loadURL(url);
    } catch (error) {
      log.error('Failed to load URL:', error);
      throw error;
    }

    // Allow navigation to Clerk auth URLs, prevent others
    this.mainWindow.webContents.on('will-navigate', (event, url) => {
      const parsedUrl = new URL(url);
      const isLocalhost = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';
      const isClerkAuth = parsedUrl.hostname.includes('accounts.dev') || parsedUrl.hostname.includes('clerk.dev');

      // OAuth provider domains that should open in system browser
      const isOAuthProvider =
        parsedUrl.hostname === 'github.com' ||
        parsedUrl.hostname.endsWith('.github.com') ||
        parsedUrl.hostname === 'accounts.google.com' ||
        parsedUrl.hostname.endsWith('.google.com');

      if (!isLocalhost && !isClerkAuth) {
        event.preventDefault();

        if (isOAuthProvider) {
          log.info('Opening OAuth URL in system browser:', url);
          shell.openExternal(url);
        } else {
          log.warn('Prevented navigation to external URL:', url);
        }
      }
    });

    // Allow Clerk popups, prevent other new windows
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      const parsedUrl = new URL(url);
      const isClerkAuth = parsedUrl.hostname.includes('accounts.dev') || parsedUrl.hostname.includes('clerk.dev');

      // OAuth provider domains that should open in system browser
      const isOAuthProvider =
        parsedUrl.hostname === 'github.com' ||
        parsedUrl.hostname.endsWith('.github.com') ||
        parsedUrl.hostname === 'accounts.google.com' ||
        parsedUrl.hostname.endsWith('.google.com');

      if (isClerkAuth) {
        // Allow Clerk auth popups and handle OAuth navigation within them
        const popup = new BrowserWindow({
          width: 500,
          height: 700,
          center: true,
          modal: true,
          parent: this.mainWindow || undefined,
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
          }
        });

        // Handle OAuth navigation in popup window
        popup.webContents.on('will-navigate', (event, navigationUrl) => {
          const navParsedUrl = new URL(navigationUrl);
          const navIsOAuthProvider =
            navParsedUrl.hostname === 'github.com' ||
            navParsedUrl.hostname.endsWith('.github.com') ||
            navParsedUrl.hostname === 'accounts.google.com' ||
            navParsedUrl.hostname.endsWith('.google.com');

          if (navIsOAuthProvider) {
            event.preventDefault();
            log.info('Opening OAuth URL from popup in system browser:', navigationUrl);
            shell.openExternal(navigationUrl);
            popup.close();
          }
        });

        popup.loadURL(url);
        return { action: 'deny' }; // We manually created the window
      }

      if (isOAuthProvider) {
        // Open OAuth URLs directly in system browser
        log.info('Opening OAuth URL in system browser:', url);
        shell.openExternal(url);
        return { action: 'deny' };
      }

      return { action: 'deny' };
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  isMaximized(): boolean {
    return this.mainWindow?.isMaximized() ?? false;
  }

  minimize(): void {
    this.mainWindow?.minimize();
  }

  maximize(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow.maximize();
      }
    }
  }

  close(): void {
    this.mainWindow?.close();
  }
}
