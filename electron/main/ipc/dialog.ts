/**
 * Dialog IPC Handlers
 *
 * Provides native dialog access to the renderer process
 * Includes file/folder pickers, message boxes, and error dialogs
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import electronLog from 'electron-log';

/**
 * Get the focused window for dialog parent
 */
function getFocusedWindow(): BrowserWindow | undefined {
  return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || undefined;
}

/**
 * Register dialog IPC handlers
 */
export function registerDialogHandlers(): void {
  // Show open dialog (file/folder picker)
  ipcMain.handle('dialog:showOpenDialog', async (event, options: Electron.OpenDialogOptions) => {
    try {
      const window = getFocusedWindow();
      const result = window
        ? await dialog.showOpenDialog(window, options)
        : await dialog.showOpenDialog(options);

      return {
        success: true,
        data: {
          canceled: result.canceled,
          filePaths: result.filePaths,
        },
      };
    } catch (error) {
      const err = error as Error;
      electronLog.error('dialog:showOpenDialog error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Show save dialog
  ipcMain.handle('dialog:showSaveDialog', async (event, options: Electron.SaveDialogOptions) => {
    try {
      const window = getFocusedWindow();
      const result = window
        ? await dialog.showSaveDialog(window, options)
        : await dialog.showSaveDialog(options);

      return {
        success: true,
        data: {
          canceled: result.canceled,
          filePath: result.filePath,
        },
      };
    } catch (error) {
      const err = error as Error;
      electronLog.error('dialog:showSaveDialog error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Show message box
  ipcMain.handle(
    'dialog:showMessageBox',
    async (
      event,
      options: Electron.MessageBoxOptions
    ) => {
      try {
        const window = getFocusedWindow();
        const result = window
          ? await dialog.showMessageBox(window, options)
          : await dialog.showMessageBox(options);

        return {
          success: true,
          data: {
            response: result.response,
            checkboxChecked: result.checkboxChecked,
          },
        };
      } catch (error) {
        const err = error as Error;
        electronLog.error('dialog:showMessageBox error:', err.message);
        return { success: false, error: err.message };
      }
    }
  );

  // Show error box (synchronous, blocking)
  ipcMain.handle('dialog:showErrorBox', async (event, title: string, content: string) => {
    try {
      dialog.showErrorBox(title, content);
      return { success: true };
    } catch (error) {
      const err = error as Error;
      electronLog.error('dialog:showErrorBox error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Show open file dialog (convenience wrapper)
  ipcMain.handle(
    'dialog:openFile',
    async (
      event,
      options?: {
        title?: string;
        defaultPath?: string;
        filters?: Electron.FileFilter[];
        multiple?: boolean;
      }
    ) => {
      try {
        const window = getFocusedWindow();
        const dialogOptions: Electron.OpenDialogOptions = {
          title: options?.title || 'Open File',
          defaultPath: options?.defaultPath,
          filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
          properties: options?.multiple
            ? ['openFile', 'multiSelections']
            : ['openFile'],
        };

        const result = window
          ? await dialog.showOpenDialog(window, dialogOptions)
          : await dialog.showOpenDialog(dialogOptions);

        return {
          success: true,
          data: {
            canceled: result.canceled,
            filePaths: result.filePaths,
          },
        };
      } catch (error) {
        const err = error as Error;
        electronLog.error('dialog:openFile error:', err.message);
        return { success: false, error: err.message };
      }
    }
  );

  // Show open folder dialog (convenience wrapper)
  ipcMain.handle(
    'dialog:openFolder',
    async (
      event,
      options?: {
        title?: string;
        defaultPath?: string;
        multiple?: boolean;
      }
    ) => {
      try {
        const window = getFocusedWindow();
        const dialogOptions: Electron.OpenDialogOptions = {
          title: options?.title || 'Open Folder',
          defaultPath: options?.defaultPath,
          properties: options?.multiple
            ? ['openDirectory', 'multiSelections']
            : ['openDirectory'],
        };

        const result = window
          ? await dialog.showOpenDialog(window, dialogOptions)
          : await dialog.showOpenDialog(dialogOptions);

        return {
          success: true,
          data: {
            canceled: result.canceled,
            folderPaths: result.filePaths,
          },
        };
      } catch (error) {
        const err = error as Error;
        electronLog.error('dialog:openFolder error:', err.message);
        return { success: false, error: err.message };
      }
    }
  );

  // Show save file dialog (convenience wrapper)
  ipcMain.handle(
    'dialog:saveFile',
    async (
      event,
      options?: {
        title?: string;
        defaultPath?: string;
        filters?: Electron.FileFilter[];
      }
    ) => {
      try {
        const window = getFocusedWindow();
        const dialogOptions: Electron.SaveDialogOptions = {
          title: options?.title || 'Save File',
          defaultPath: options?.defaultPath,
          filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
        };

        const result = window
          ? await dialog.showSaveDialog(window, dialogOptions)
          : await dialog.showSaveDialog(dialogOptions);

        return {
          success: true,
          data: {
            canceled: result.canceled,
            filePath: result.filePath,
          },
        };
      } catch (error) {
        const err = error as Error;
        electronLog.error('dialog:saveFile error:', err.message);
        return { success: false, error: err.message };
      }
    }
  );

  // Show confirmation dialog
  ipcMain.handle(
    'dialog:confirm',
    async (
      event,
      options: {
        title: string;
        message: string;
        detail?: string;
        confirmLabel?: string;
        cancelLabel?: string;
      }
    ) => {
      try {
        const window = getFocusedWindow();
        const dialogOptions: Electron.MessageBoxOptions = {
          type: 'question',
          title: options.title,
          message: options.message,
          detail: options.detail,
          buttons: [
            options.cancelLabel || 'Cancel',
            options.confirmLabel || 'OK',
          ],
          defaultId: 1,
          cancelId: 0,
        };

        const result = window
          ? await dialog.showMessageBox(window, dialogOptions)
          : await dialog.showMessageBox(dialogOptions);

        return {
          success: true,
          data: {
            confirmed: result.response === 1,
          },
        };
      } catch (error) {
        const err = error as Error;
        electronLog.error('dialog:confirm error:', err.message);
        return { success: false, error: err.message };
      }
    }
  );

  electronLog.info('Dialog IPC handlers registered');
}
