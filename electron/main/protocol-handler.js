"use strict";
/**
 * Protocol Handler
 *
 * Handles the polaris:// custom protocol for deep linking
 * Allows external applications to open projects or perform actions
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseProtocolUrl = parseProtocolUrl;
exports.handleProtocolAction = handleProtocolAction;
exports.registerProtocolHandler = registerProtocolHandler;
exports.getProtocolUrlFromArgs = getProtocolUrlFromArgs;
exports.createProtocolUrl = createProtocolUrl;
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
/**
 * Parse a polaris:// URL into an action
 *
 * Supported formats:
 * - polaris://open?project=<projectId>
 * - polaris://import?github=<owner/repo>
 * - polaris://new
 * - polaris://auth/callback?token=<token>
 */
function parseProtocolUrl(url) {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'polaris:') {
            electron_log_1.default.warn('Invalid protocol:', parsed.protocol);
            return null;
        }
        const action = parsed.hostname + parsed.pathname;
        const params = {};
        parsed.searchParams.forEach((value, key) => {
            params[key] = value;
        });
        electron_log_1.default.info('Parsed protocol URL:', { action, params });
        return { action, params };
    }
    catch (error) {
        electron_log_1.default.error('Failed to parse protocol URL:', error);
        return null;
    }
}
/**
 * Handle a protocol action
 */
function handleProtocolAction(mainWindow, protocolAction) {
    const { action, params } = protocolAction;
    electron_log_1.default.info('Handling protocol action:', action);
    switch (action) {
        case 'open':
            if (params.project) {
                mainWindow.webContents.send('protocol:openProject', params.project);
            }
            break;
        case 'import':
            if (params.github) {
                mainWindow.webContents.send('protocol:importGitHub', params.github);
            }
            break;
        case 'new':
            mainWindow.webContents.send('protocol:newProject');
            break;
        case 'auth/callback':
            if (params.token) {
                mainWindow.webContents.send('protocol:authCallback', params.token);
            }
            break;
        default:
            electron_log_1.default.warn('Unknown protocol action:', action);
            mainWindow.webContents.send('protocol:unknown', { action, params });
    }
    // Focus the window after handling the action
    if (mainWindow.isMinimized()) {
        mainWindow.restore();
    }
    mainWindow.focus();
}
/**
 * Register the protocol handler
 *
 * This should be called before app.ready
 */
function registerProtocolHandler() {
    // On macOS, we need to check if we're the default handler
    if (process.platform === 'darwin') {
        const isDefaultProtocolClient = electron_1.app.isDefaultProtocolClient('polaris');
        if (!isDefaultProtocolClient) {
            electron_1.app.setAsDefaultProtocolClient('polaris');
            electron_log_1.default.info('Registered as default protocol client for polaris://');
        }
    }
    // On Windows and Linux, register with the executable path
    if (process.platform === 'win32' || process.platform === 'linux') {
        if (process.defaultApp) {
            // Development mode - need to specify the script path
            if (process.argv.length >= 2) {
                electron_1.app.setAsDefaultProtocolClient('polaris', process.execPath, [
                    process.argv[1],
                ]);
            }
        }
        else {
            // Production mode
            electron_1.app.setAsDefaultProtocolClient('polaris');
        }
        electron_log_1.default.info('Registered protocol handler for polaris://');
    }
}
/**
 * Handle protocol URLs on Windows (via command line arguments)
 *
 * On Windows, the protocol URL is passed as a command line argument
 * when a second instance is launched
 */
function getProtocolUrlFromArgs(args) {
    // Look for polaris:// in the arguments
    for (const arg of args) {
        if (arg.startsWith('polaris://')) {
            return arg;
        }
    }
    return null;
}
/**
 * Create a polaris:// URL for a specific action
 */
function createProtocolUrl(action, params) {
    let url = `polaris://${action}`;
    if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
    }
    return url;
}
//# sourceMappingURL=protocol-handler.js.map