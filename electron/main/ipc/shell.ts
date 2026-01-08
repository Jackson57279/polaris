/**
 * Shell IPC Handlers
 *
 * Provides shell operations to the renderer process
 * Includes opening URLs, files, and file locations
 */

import { ipcMain, shell } from 'electron';
import electronLog from 'electron-log';

/**
 * Register shell IPC handlers
 */
export function registerShellHandlers(): void {
  // Open external URL in default browser
  ipcMain.handle('shell:openExternal', async (event, url: string) => {
    try {
      // Validate URL
      const parsedUrl = new URL(url);
      const allowedProtocols = ['http:', 'https:', 'mailto:'];

      if (!allowedProtocols.includes(parsedUrl.protocol)) {
        return { success: false, error: `Protocol not allowed: ${parsedUrl.protocol}` };
      }

      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      const err = error as Error;
      electronLog.error('shell:openExternal error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Open a path with the system's default application
  ipcMain.handle('shell:openPath', async (event, filePath: string) => {
    try {
      const errorMessage = await shell.openPath(filePath);
      if (errorMessage) {
        return { success: false, error: errorMessage };
      }
      return { success: true };
    } catch (error) {
      const err = error as Error;
      electronLog.error('shell:openPath error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Show item in folder (reveal in Finder/Explorer)
  ipcMain.handle('shell:showItemInFolder', async (event, filePath: string) => {
    try {
      shell.showItemInFolder(filePath);
      return { success: true };
    } catch (error) {
      const err = error as Error;
      electronLog.error('shell:showItemInFolder error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Move item to trash
  ipcMain.handle('shell:trashItem', async (event, filePath: string) => {
    try {
      await shell.trashItem(filePath);
      return { success: true };
    } catch (error) {
      const err = error as Error;
      electronLog.error('shell:trashItem error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Beep (system sound)
  ipcMain.handle('shell:beep', async () => {
    try {
      shell.beep();
      return { success: true };
    } catch (error) {
      const err = error as Error;
      electronLog.error('shell:beep error:', err.message);
      return { success: false, error: err.message };
    }
  });

  electronLog.info('Shell IPC handlers registered');
}
