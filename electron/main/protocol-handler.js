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
 * Parse a polaris:// deep link into an action and its query parameters.
 * @param {string} url - The polaris:// URL to parse.
 * @returns {{ action: string, params: Record<string, string> } | null} An object where `action` is the hostname plus pathname (e.g., "auth/callback") and `params` maps query parameter names to values; `null` if the URL is invalid or not using the `polaris:` scheme.
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
 * Execute UI actions for a parsed polaris protocol action and ensure the main window is focused.
 * 
 * Dispatches renderer IPC events based on `protocolAction.action`:
 * - `open`: sends `protocol:openProject` with `params.project` when present.
 * - `import`: sends `protocol:importGitHub` with `params.github` when present.
 * - `new`: sends `protocol:newProject`.
 * - `auth/callback`: sends `protocol:authCallback` with `params.token` when present.
 * Unknown actions send `protocol:unknown` with the `{ action, params }` payload.
 * After dispatch, restores the window if minimized and focuses it.
 * 
 * @param {import('electron').BrowserWindow} mainWindow - The main application window used to send IPC messages and control focus.
 * @param {{ action: string, params: Record<string, string> }} protocolAction - Parsed protocol action containing an `action` string and a map of `params`.
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
 * Register the application as the default handler for the polaris:// deep-link protocol.
 *
 * On macOS this ensures the app is set as the default protocol client if it is not already.
 * On Windows and Linux, in development (when running as the defaultApp) it registers using
 * the current executable and script argument; in production it registers normally.
 *
 * Must be called before app.ready.
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
 * Extracts a polaris:// URL from an array of command-line arguments.
 * @param {string[]} args - Command-line arguments to scan.
 * @returns {string|null} The first argument that starts with `polaris://`, or `null` if none is found.
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
 * Build a polaris:// deep link for the given action and optional query parameters.
 * @param {string} action - The action path and/or host (e.g., "open", "auth/callback").
 * @param {Record<string, string|number|boolean>|null} [params] - Optional key/value pairs to include as URL query parameters; values will be converted to strings.
 * @returns {string} The resulting polaris:// URL including encoded query parameters when provided.
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