import { BrowserWindow, ipcMain } from 'electron';
import { registerFileSystemHandlers } from './file-system';
import { registerDialogHandlers } from './dialog';
import { registerWindowHandlers } from './window';
import { registerNotificationHandlers } from './notification';
import { registerExternalUrlHandlers } from './external-url';

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  registerFileSystemHandlers();
  registerDialogHandlers(mainWindow);
  registerWindowHandlers(mainWindow);
  registerNotificationHandlers();
  registerExternalUrlHandlers();
}

export { ipcMain };
