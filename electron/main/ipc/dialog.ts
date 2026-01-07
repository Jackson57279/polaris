import { ipcMain, dialog, BrowserWindow } from 'electron';
import log from 'electron-log';

export function registerDialogHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle('dialog:showOpenDialog', async (_, options: any) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, options);
      return { success: true, data: result };
    } catch (error: any) {
      log.error('dialog:showOpenDialog error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('dialog:showSaveDialog', async (_, options: any) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, options);
      return { success: true, data: result };
    } catch (error: any) {
      log.error('dialog:showSaveDialog error:', error);
      return { success: false, error: error.message };
    }
  });
}
