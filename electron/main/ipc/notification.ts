import { ipcMain, Notification } from 'electron';
import log from 'electron-log';

export function registerNotificationHandlers() {
  ipcMain.handle('notification:show', async (_, options: { title: string; body: string }) => {
    try {
      const notification = new Notification({
        title: options.title,
        body: options.body
      });
      notification.show();
      return { success: true };
    } catch (error: any) {
      log.error('notification:show error:', error);
      return { success: false, error: error.message };
    }
  });
}
