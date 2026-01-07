import { BrowserWindow, screen } from 'electron';
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

    // Load the app
    const url = `http://localhost:${this.port}`;
    log.info(`Loading URL: ${url}`);

    try {
      await this.mainWindow.loadURL(url);
    } catch (error) {
      log.error('Failed to load URL:', error);
      throw error;
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      if (this.mainWindow) {
        this.mainWindow.show();
        if (this.isDev) {
          this.mainWindow.webContents.openDevTools();
        }
      }
    });

    // Prevent navigation to external URLs
    this.mainWindow.webContents.on('will-navigate', (event, url) => {
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname !== 'localhost' && parsedUrl.hostname !== '127.0.0.1') {
        event.preventDefault();
        log.warn('Prevented navigation to external URL:', url);
      }
    });

    // Prevent new window creation
    this.mainWindow.webContents.setWindowOpenHandler(() => {
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
