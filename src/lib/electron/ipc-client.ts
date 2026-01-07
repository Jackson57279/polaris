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

  async dialog_showOpenDialog(options: any) {
    this.checkElectron();
    return window.electron.dialog.showOpenDialog(options);
  }

  async dialog_showSaveDialog(options: any) {
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

  async notification_show(options: { title: string; body: string }) {
    this.checkElectron();
    return window.electron.notification.show(options);
  }
}

export const ipcClient = new IPCClient();
