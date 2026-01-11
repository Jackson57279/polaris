import { ipcMain, dialog, BrowserWindow } from 'electron';
import log from 'electron-log';

export function registerDialogHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle('dialog:showOpenDialog', async (_, options: unknown) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, options as Electron.OpenDialogOptions);
      return { success: true, data: result };
    } catch (error) {
      log.error('dialog:showOpenDialog error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  ipcMain.handle('dialog:showSaveDialog', async (_, options: unknown) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, options as Electron.SaveDialogOptions);
      return { success: true, data: result };
    } catch (error) {
      log.error('dialog:showSaveDialog error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });
}
