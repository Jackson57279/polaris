"use strict";
/**
 * Application Menu
 *
 * Creates the native application menu for the Electron app
 * Includes File, Edit, View, and Help menus with keyboard shortcuts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApplicationMenu = createApplicationMenu;
exports.createEditorContextMenu = createEditorContextMenu;
exports.createFileExplorerContextMenu = createFileExplorerContextMenu;
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
/**
 * Builds and sets the native application menu appropriate for the current platform.
 *
 * Menu items forward user actions to the renderer via IPC or open external links where applicable;
 * the constructed menu is installed as the application's menu and its creation is logged.
 * @param {import('electron').BrowserWindow} mainWindow - The main window whose webContents will receive menu action messages.
 */
function createApplicationMenu(mainWindow) {
    const isMac = process.platform === 'darwin';
    const template = [
        // App menu (macOS only)
        ...(isMac
            ? [
                {
                    label: electron_1.app.name,
                    submenu: [
                        { role: 'about' },
                        { type: 'separator' },
                        {
                            label: 'Preferences...',
                            accelerator: 'Cmd+,',
                            click: () => {
                                mainWindow.webContents.send('menu:preferences');
                            },
                        },
                        { type: 'separator' },
                        { role: 'services' },
                        { type: 'separator' },
                        { role: 'hide' },
                        { role: 'hideOthers' },
                        { role: 'unhide' },
                        { type: 'separator' },
                        { role: 'quit' },
                    ],
                },
            ]
            : []),
        // File menu
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Project',
                    accelerator: 'CmdOrCtrl+Shift+N',
                    click: () => {
                        mainWindow.webContents.send('menu:newProject');
                    },
                },
                {
                    label: 'Open Project...',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => {
                        mainWindow.webContents.send('menu:openProject');
                    },
                },
                { type: 'separator' },
                {
                    label: 'New File',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('menu:newFile');
                    },
                },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        mainWindow.webContents.send('menu:save');
                    },
                },
                {
                    label: 'Save All',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: () => {
                        mainWindow.webContents.send('menu:saveAll');
                    },
                },
                { type: 'separator' },
                {
                    label: 'Import from GitHub...',
                    click: () => {
                        mainWindow.webContents.send('menu:importGitHub');
                    },
                },
                {
                    label: 'Export to GitHub...',
                    click: () => {
                        mainWindow.webContents.send('menu:exportGitHub');
                    },
                },
                { type: 'separator' },
                isMac ? { role: 'close' } : { role: 'quit' },
            ],
        },
        // Edit menu
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                ...(isMac
                    ? [
                        { role: 'pasteAndMatchStyle' },
                        { role: 'delete' },
                        { role: 'selectAll' },
                        { type: 'separator' },
                        {
                            label: 'Speech',
                            submenu: [
                                { role: 'startSpeaking' },
                                { role: 'stopSpeaking' },
                            ],
                        },
                    ]
                    : [
                        { role: 'delete' },
                        { type: 'separator' },
                        { role: 'selectAll' },
                    ]),
                { type: 'separator' },
                {
                    label: 'Find',
                    accelerator: 'CmdOrCtrl+F',
                    click: () => {
                        mainWindow.webContents.send('menu:find');
                    },
                },
                {
                    label: 'Replace',
                    accelerator: 'CmdOrCtrl+H',
                    click: () => {
                        mainWindow.webContents.send('menu:replace');
                    },
                },
            ],
        },
        // View menu
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
                { type: 'separator' },
                {
                    label: 'Toggle File Explorer',
                    accelerator: 'CmdOrCtrl+B',
                    click: () => {
                        mainWindow.webContents.send('menu:toggleFileExplorer');
                    },
                },
                {
                    label: 'Toggle Terminal',
                    accelerator: 'CmdOrCtrl+`',
                    click: () => {
                        mainWindow.webContents.send('menu:toggleTerminal');
                    },
                },
                {
                    label: 'Toggle Preview',
                    accelerator: 'CmdOrCtrl+Shift+P',
                    click: () => {
                        mainWindow.webContents.send('menu:togglePreview');
                    },
                },
                {
                    label: 'Toggle AI Chat',
                    accelerator: 'CmdOrCtrl+Shift+A',
                    click: () => {
                        mainWindow.webContents.send('menu:toggleAIChat');
                    },
                },
            ],
        },
        // Window menu
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                ...(isMac
                    ? [
                        { type: 'separator' },
                        { role: 'front' },
                        { type: 'separator' },
                        { role: 'window' },
                    ]
                    : [{ role: 'close' }]),
            ],
        },
        // Help menu
        {
            role: 'help',
            submenu: [
                {
                    label: 'Documentation',
                    click: async () => {
                        await electron_1.shell.openExternal('https://docs.polaris.dev');
                    },
                },
                {
                    label: 'Report Issue',
                    click: async () => {
                        await electron_1.shell.openExternal('https://github.com/polaris/issues');
                    },
                },
                { type: 'separator' },
                {
                    label: 'Check for Updates...',
                    click: () => {
                        mainWindow.webContents.send('menu:checkForUpdates');
                    },
                },
                { type: 'separator' },
                {
                    label: 'About Polaris IDE',
                    click: () => {
                        mainWindow.webContents.send('menu:about');
                    },
                },
            ],
        },
    ];
    const menu = electron_1.Menu.buildFromTemplate(template);
    electron_1.Menu.setApplicationMenu(menu);
    electron_log_1.default.info('Application menu created');
}
/**
 * Builds the standard editor context menu containing undo/redo, cut/copy/paste, and select-all actions.
 * @returns {import('electron').Menu} An Electron Menu configured for editor text-editing actions.
 */
function createEditorContextMenu() {
    const template = [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        { role: 'selectAll' },
    ];
    return electron_1.Menu.buildFromTemplate(template);
}
/**
 * Build a context menu for the file explorer with file/folder and reveal actions.
 * @param {Object} callbacks - Handlers invoked when menu items are clicked.
 * @param {Function} callbacks.onNewFile - Called to create a new file.
 * @param {Function} callbacks.onNewFolder - Called to create a new folder.
 * @param {Function} callbacks.onRename - Called to rename the selected item.
 * @param {Function} callbacks.onDelete - Called to delete the selected item.
 * @param {Function} callbacks.onRevealInFinder - Called to reveal the item in Finder/Explorer.
 * @returns {Electron.Menu} The constructed context menu.
 */
function createFileExplorerContextMenu(isDirectory, callbacks) {
    const template = [
        {
            label: 'New File',
            click: callbacks.onNewFile,
        },
        {
            label: 'New Folder',
            click: callbacks.onNewFolder,
        },
        { type: 'separator' },
        {
            label: 'Rename',
            click: callbacks.onRename,
        },
        {
            label: 'Delete',
            click: callbacks.onDelete,
        },
        { type: 'separator' },
        {
            label: process.platform === 'darwin' ? 'Reveal in Finder' : 'Show in Explorer',
            click: callbacks.onRevealInFinder,
        },
    ];
    return electron_1.Menu.buildFromTemplate(template);
}
//# sourceMappingURL=menu.js.map