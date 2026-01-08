/**
 * Notification IPC Handlers
 *
 * Provides native notification access to the renderer process
 * Uses Electron's Notification API for system notifications
 */

import { ipcMain, Notification, nativeImage, app } from 'electron';
import path from 'path';
import electronLog from 'electron-log';

/**
 * Get the default notification icon
 */
function getDefaultIcon(): Electron.NativeImage | undefined {
  const iconPath = path.join(__dirname, '../resources/icons/icon.png');
  try {
    return nativeImage.createFromPath(iconPath);
  } catch {
    return undefined;
  }
}

/**
 * Register notification IPC handlers
 */
export function registerNotificationHandlers(): void {
  // Check if notifications are supported
  ipcMain.handle('notification:isSupported', async () => {
    return { success: true, data: Notification.isSupported() };
  });

  // Show a notification
  ipcMain.handle(
    'notification:show',
    async (
      event,
      options: {
        title: string;
        body?: string;
        icon?: string;
        silent?: boolean;
        urgency?: 'normal' | 'critical' | 'low';
        actions?: Array<{ type: 'button'; text: string }>;
        closeButtonText?: string;
        timeoutType?: 'default' | 'never';
      }
    ) => {
      try {
        if (!Notification.isSupported()) {
          return { success: false, error: 'Notifications not supported' };
        }

        const notification = new Notification({
          title: options.title,
          body: options.body,
          icon: options.icon ? nativeImage.createFromPath(options.icon) : getDefaultIcon(),
          silent: options.silent,
          urgency: options.urgency,
          actions: options.actions,
          closeButtonText: options.closeButtonText,
          timeoutType: options.timeoutType,
        });

        // Set up event listeners
        notification.on('click', () => {
          event.sender.send('notification:click', { title: options.title });
        });

        notification.on('close', () => {
          event.sender.send('notification:close', { title: options.title });
        });

        notification.on('action', (actionEvent, index) => {
          event.sender.send('notification:action', {
            title: options.title,
            actionIndex: index,
          });
        });

        notification.on('failed', (failEvent, error) => {
          event.sender.send('notification:failed', {
            title: options.title,
            error,
          });
        });

        notification.show();

        return { success: true };
      } catch (error) {
        const err = error as Error;
        electronLog.error('notification:show error:', err.message);
        return { success: false, error: err.message };
      }
    }
  );

  // Show a simple notification
  ipcMain.handle(
    'notification:simple',
    async (event, title: string, body?: string) => {
      try {
        if (!Notification.isSupported()) {
          return { success: false, error: 'Notifications not supported' };
        }

        const notification = new Notification({
          title,
          body,
          icon: getDefaultIcon(),
        });

        notification.show();

        return { success: true };
      } catch (error) {
        const err = error as Error;
        electronLog.error('notification:simple error:', err.message);
        return { success: false, error: err.message };
      }
    }
  );

  // Request notification permission (for consistency with browser API)
  ipcMain.handle('notification:requestPermission', async () => {
    // Electron notifications don't require permission like browser notifications
    // But we check if they're supported
    return {
      success: true,
      data: Notification.isSupported() ? 'granted' : 'denied',
    };
  });

  // Set app badge count (macOS/Linux)
  ipcMain.handle('notification:setBadgeCount', async (event, count: number) => {
    try {
      if (process.platform === 'darwin' || process.platform === 'linux') {
        app.setBadgeCount(count);
      }
      return { success: true };
    } catch (error) {
      const err = error as Error;
      electronLog.error('notification:setBadgeCount error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Get app badge count
  ipcMain.handle('notification:getBadgeCount', async () => {
    try {
      const count = app.getBadgeCount();
      return { success: true, data: count };
    } catch (error) {
      const err = error as Error;
      electronLog.error('notification:getBadgeCount error:', err.message);
      return { success: false, error: err.message };
    }
  });

  electronLog.info('Notification IPC handlers registered');
}
