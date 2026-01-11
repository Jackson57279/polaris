import { ipcMain, shell } from 'electron';
import log from 'electron-log';

export function registerExternalUrlHandlers() {
  ipcMain.handle('external:openUrl', async (_, url: string) => {
    try {
      // Validate URL
      const parsedUrl = new URL(url);

      // Only allow http and https protocols for security
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        log.warn('Blocked opening URL with invalid protocol:', url);
        return { success: false, error: 'Invalid protocol' };
      }

      log.info('Opening external URL:', url);
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      log.error('external:openUrl error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });
}
