/**
 * IPC Handler Registration
 *
 * Central registration point for all IPC handlers
 * Organizes handlers by domain (file system, dialog, window, etc.)
 */

import { registerFileSystemHandlers } from './file-system';
import { registerDialogHandlers } from './dialog';
import { registerWindowHandlers } from './window';
import { registerNotificationHandlers } from './notification';
import { registerAppHandlers } from './app';
import { registerShellHandlers } from './shell';
import electronLog from 'electron-log';

/**
 * Register IPC handlers for all application domains.
 *
 * Registers handlers for file system, dialog, window, notification, app, and shell functionality.
 * Should be called once during application initialization.
 */
export function registerAllIpcHandlers(): void {
  electronLog.info('Registering IPC handlers...');

  // File system operations
  registerFileSystemHandlers();

  // Native dialogs
  registerDialogHandlers();

  // Window controls
  registerWindowHandlers();

  // System notifications
  registerNotificationHandlers();

  // App operations
  registerAppHandlers();

  // Shell operations
  registerShellHandlers();

  electronLog.info('All IPC handlers registered');
}

// Re-export individual registration functions for testing
export {
  registerFileSystemHandlers,
  registerDialogHandlers,
  registerWindowHandlers,
  registerNotificationHandlers,
  registerAppHandlers,
  registerShellHandlers,
};