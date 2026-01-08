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
 * Parse a polaris:// URL into an action
 *
 * Supported formats:
 * - polaris://open?project=<projectId>
 * - polaris://import?github=<owner/repo>
 * - polaris://new
 * - polaris://auth/callback?token=<token>
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
 * Handle a protocol action
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
 * Register the protocol handler
 *
 * This should be called before app.ready
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
 * Handle protocol URLs on Windows (via command line arguments)
 *
 * On Windows, the protocol URL is passed as a command line argument
 * when a second instance is launched
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
 * Create a polaris:// URL for a specific action
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
