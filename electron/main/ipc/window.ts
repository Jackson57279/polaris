import { ipcMain, BrowserWindow } from 'electron';

export function registerWindowHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle('window:minimize', () => {
    mainWindow.minimize();
    return { success: true };
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    return { success: true };
  });

  ipcMain.handle('window:close', () => {
    mainWindow.close();
    return { success: true };
  });

  ipcMain.handle('window:isMaximized', () => {
    return { success: true, data: mainWindow.isMaximized() };
  });
}
