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
        electron_log_1.default.info(`Loading URL: ${url}`);
        try {
            await this.mainWindow.loadURL(url);
        }
        catch (error) {
            electron_log_1.default.error('Failed to load URL:', error);
            throw error;
        }
        // Allow navigation to Clerk auth URLs, prevent others
        this.mainWindow.webContents.on('will-navigate', (event, url) => {
            const parsedUrl = new URL(url);
            const isLocalhost = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';
            const isClerkAuth = parsedUrl.hostname.includes('accounts.dev') || parsedUrl.hostname.includes('clerk.dev');
            // OAuth provider domains that should open in system browser
            const isOAuthProvider = parsedUrl.hostname === 'github.com' ||
                parsedUrl.hostname.endsWith('.github.com') ||
                parsedUrl.hostname === 'accounts.google.com' ||
                parsedUrl.hostname.endsWith('.google.com');
            if (!isLocalhost && !isClerkAuth) {
                event.preventDefault();
                if (isOAuthProvider) {
                    electron_log_1.default.info('Opening OAuth URL in system browser:', url);
                    electron_1.shell.openExternal(url);
                }
                else {
                    electron_log_1.default.warn('Prevented navigation to external URL:', url);
                }
            }
        });
        // Allow Clerk popups, prevent other new windows
        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            const parsedUrl = new URL(url);
            const isClerkAuth = parsedUrl.hostname.includes('accounts.dev') || parsedUrl.hostname.includes('clerk.dev');
            // OAuth provider domains that should open in system browser
            const isOAuthProvider = parsedUrl.hostname === 'github.com' ||
                parsedUrl.hostname.endsWith('.github.com') ||
                parsedUrl.hostname === 'accounts.google.com' ||
                parsedUrl.hostname.endsWith('.google.com');
            if (isClerkAuth) {
                // Allow Clerk auth popups and handle OAuth navigation within them
                const popup = new electron_1.BrowserWindow({
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
                    const navIsOAuthProvider = navParsedUrl.hostname === 'github.com' ||
                        navParsedUrl.hostname.endsWith('.github.com') ||
                        navParsedUrl.hostname === 'accounts.google.com' ||
                        navParsedUrl.hostname.endsWith('.google.com');
                    if (navIsOAuthProvider) {
                        event.preventDefault();
                        electron_log_1.default.info('Opening OAuth URL from popup in system browser:', navigationUrl);
                        electron_1.shell.openExternal(navigationUrl);
                        popup.close();
                    }
                });
                popup.loadURL(url);
                return { action: 'deny' }; // We manually created the window
            }
            if (isOAuthProvider) {
                // Open OAuth URLs directly in system browser
                electron_log_1.default.info('Opening OAuth URL in system browser:', url);
                electron_1.shell.openExternal(url);
                return { action: 'deny' };
            }
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