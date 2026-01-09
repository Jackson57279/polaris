"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowManager = void 0;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const electron_log_1 = __importDefault(require("electron-log"));
class WindowManager {
    constructor(port, isDev) {
        this.mainWindow = null;
        this.port = port;
        this.isDev = isDev;
    }
    async createMainWindow() {
        const { width, height } = electron_1.screen.getPrimaryDisplay().workAreaSize;
        this.mainWindow = new electron_1.BrowserWindow({
            width: Math.floor(width * 0.8),
            height: Math.floor(height * 0.8),
            minWidth: 1024,
            minHeight: 768,
            show: false,
            backgroundColor: '#0a0a0a',
            icon: path_1.default.join(__dirname, '../resources/icons/icon.png'),
            webPreferences: {
                preload: path_1.default.join(__dirname, '../preload/index.js'),
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
        electron_log_1.default.info(`Loading URL: ${url}`);
        try {
            await this.mainWindow.loadURL(url);
        }
        catch (error) {
            electron_log_1.default.error('Failed to load URL:', error);
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
                electron_log_1.default.warn('Prevented navigation to external URL:', url);
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
    getMainWindow() {
        return this.mainWindow;
    }
    isMaximized() {
        return this.mainWindow?.isMaximized() ?? false;
    }
    minimize() {
        this.mainWindow?.minimize();
    }
    maximize() {
        if (this.mainWindow) {
            if (this.mainWindow.isMaximized()) {
                this.mainWindow.unmaximize();
            }
            else {
                this.mainWindow.maximize();
            }
        }
    }
    close() {
        this.mainWindow?.close();
    }
}
exports.WindowManager = WindowManager;
//# sourceMappingURL=window-manager.js.map