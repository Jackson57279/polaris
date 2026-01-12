import { isElectron } from './environment';

export class IPCClient {
  private checkElectron() {
    if (!isElectron()) {
      throw new Error('IPC is only available in Electron environment');
    }
  }

  async fs_readFile(filePath: string) {
    this.checkElectron();
    return window.electron.fs.readFile(filePath);
  }

  async fs_writeFile(filePath: string, content: string) {
    this.checkElectron();
    return window.electron.fs.writeFile(filePath, content);
  }

  async fs_readDirectory(dirPath: string) {
    this.checkElectron();
    return window.electron.fs.readDirectory(dirPath);
  }

  async fs_createDirectory(dirPath: string) {
    this.checkElectron();
    return window.electron.fs.createDirectory(dirPath);
  }

  async fs_deleteEntry(entryPath: string) {
    this.checkElectron();
    return window.electron.fs.deleteEntry(entryPath);
  }

  async fs_watchDirectory(dirPath: string) {
    this.checkElectron();
    return window.electron.fs.watchDirectory(dirPath);
  }

  async fs_unwatchDirectory(dirPath: string) {
    this.checkElectron();
    return window.electron.fs.unwatchDirectory(dirPath);
  }

  fs_onFileEvent(callback: (event: unknown) => void) {
    this.checkElectron();
    return window.electron.fs.onFileEvent(callback);
  }

  async dialog_showOpenDialog(options: unknown) {
    this.checkElectron();
    return window.electron.dialog.showOpenDialog(options);
  }

  async dialog_showSaveDialog(options: unknown) {
    this.checkElectron();
    return window.electron.dialog.showSaveDialog(options);
  }

  async window_minimize() {
    this.checkElectron();
    return window.electron.window.minimize();
  }

  async window_maximize() {
    this.checkElectron();
    return window.electron.window.maximize();
  }

  async window_close() {
    this.checkElectron();
    return window.electron.window.close();
  }

  async window_isMaximized() {
    this.checkElectron();
    return window.electron.window.isMaximized();
  }

  async updater_checkForUpdates() {
    this.checkElectron();
    return window.electron.updater.checkForUpdates();
  }

  async updater_downloadUpdate() {
    this.checkElectron();
    return window.electron.updater.downloadUpdate();
  }

  async updater_installUpdate() {
    this.checkElectron();
    return window.electron.updater.installUpdate();
  }

  updater_onUpdateAvailable(callback: (info: unknown) => void) {
    this.checkElectron();
    return window.electron.updater.onUpdateAvailable(callback);
  }

  updater_onDownloadProgress(callback: (progress: unknown) => void) {
    this.checkElectron();
    return window.electron.updater.onDownloadProgress(callback);
  }

  updater_onUpdateDownloaded(callback: () => void) {
    this.checkElectron();
    return window.electron.updater.onUpdateDownloaded(callback);
  }

  async notification_show(options: { title: string; body: string }) {
    this.checkElectron();
    return window.electron.notification.show(options);
  }
}

export const ipcClient = new IPCClient();
