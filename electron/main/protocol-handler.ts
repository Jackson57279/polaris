/**
 * Protocol Handler
 *
 * Handles the polaris:// custom protocol for deep linking
 * Allows external applications to open projects or perform actions
 */

import { app, BrowserWindow } from 'electron';
import electronLog from 'electron-log';

export interface ProtocolAction {
  action: string;
  params: Record<string, string>;
}

/**
 * Convert a polaris:// URL into a structured ProtocolAction describing the requested action and parameters.
 *
 * @param url - The polaris:// URL to parse
 * @returns A `ProtocolAction` containing `action` and `params` when the URL uses the `polaris:` protocol and is parsed successfully; `null` otherwise.
 */
export function parseProtocolUrl(url: string): ProtocolAction | null {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== 'polaris:') {
      electronLog.warn('Invalid protocol:', parsed.protocol);
      return null;
    }

    const action = parsed.hostname + parsed.pathname;
    const params: Record<string, string> = {};

    parsed.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    electronLog.info('Parsed protocol URL:', { action, params });

    return { action, params };
  } catch (error) {
    electronLog.error('Failed to parse protocol URL:', error);
    return null;
  }
}

/**
 * Route a parsed polaris:// protocol action to the renderer and ensure the main window is focused.
 *
 * Sends IPC messages to the renderer based on `protocolAction.action`:
 * - 'open' -> 'protocol:openProject' with `params.project`
 * - 'import' -> 'protocol:importGitHub' with `params.github`
 * - 'new' -> 'protocol:newProject'
 * - 'auth/callback' -> 'protocol:authCallback' with `params.token`
 * Unknown actions send 'protocol:unknown' with the full action and params. After dispatching, restores the window if minimized and focuses it.
 *
 * @param mainWindow - The application's main BrowserWindow that will receive IPC messages and be focused.
 * @param protocolAction - Parsed protocol action containing `action` and a string map of `params`.
 */
export function handleProtocolAction(
  mainWindow: BrowserWindow,
  protocolAction: ProtocolAction
): void {
  const { action, params } = protocolAction;

  electronLog.info('Handling protocol action:', action);

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
      electronLog.warn('Unknown protocol action:', action);
      mainWindow.webContents.send('protocol:unknown', { action, params });
  }

  // Focus the window after handling the action
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
}

/**
 * Register the application as the system handler for the polaris:// protocol.
 *
 * Ensures the app is registered as the default protocol client for polaris://. Call this before the application `ready` event. On macOS, the function checks and sets the app as the default protocol client; on Windows and Linux it registers the protocol handler and, when running as the default app (development), supplies the executable and entry script so the protocol opens the running instance.
 */
export function registerProtocolHandler(): void {
  // On macOS, we need to check if we're the default handler
  if (process.platform === 'darwin') {
    const isDefaultProtocolClient = app.isDefaultProtocolClient('polaris');

    if (!isDefaultProtocolClient) {
      app.setAsDefaultProtocolClient('polaris');
      electronLog.info('Registered as default protocol client for polaris://');
    }
  }

  // On Windows and Linux, register with the executable path
  if (process.platform === 'win32' || process.platform === 'linux') {
    if (process.defaultApp) {
      // Development mode - need to specify the script path
      if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('polaris', process.execPath, [
          process.argv[1],
        ]);
      }
    } else {
      // Production mode
      app.setAsDefaultProtocolClient('polaris');
    }

    electronLog.info('Registered protocol handler for polaris://');
  }
}

/**
 * Extracts the first `polaris://` URL from a list of command-line arguments.
 *
 * @param args - Command-line arguments to search
 * @returns The first argument that starts with `polaris://`, or `null` if none is found
 */
export function getProtocolUrlFromArgs(args: string[]): string | null {
  // Look for polaris:// in the arguments
  for (const arg of args) {
    if (arg.startsWith('polaris://')) {
      return arg;
    }
  }
  return null;
}

/**
 * Builds a polaris:// URL for the given action and optional query parameters.
 *
 * @param action - Action path appended after the scheme (for example `open` or `auth/callback`)
 * @param params - Optional key/value pairs to serialize into the URL query string
 * @returns The constructed polaris:// URL including a query string when `params` is provided
 */
export function createProtocolUrl(
  action: string,
  params?: Record<string, string>
): string {
  let url = `polaris://${action}`;

  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  return url;
}