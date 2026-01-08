import { ipcMain, Notification } from 'electron';
import log from 'electron-log';

export function registerNotificationHandlers() {
  ipcMain.handle('notification:show', async (_, options: { title: string; body: string }) => {
    try {
      // Check if notifications are supported
      if (!Notification.isSupported()) {
        log.warn('Notifications are not supported on this platform');
        return { success: false, error: 'Notifications not supported' };
      }

      const notification = new Notification({
        title: options.title,
        body: options.body
      });
      notification.show();
      return { success: true };
    } catch (error) {
      log.error('notification:show error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });
}
