# Electron Desktop App Integration

This document describes the Electron desktop app integration for Polaris IDE.

## Overview

Polaris IDE now supports **dual-mode architecture**:
- **Web/PWA Mode**: Traditional browser-based access with PWA capabilities
- **Desktop Mode**: Native desktop application with Electron

## Architecture

### Process Model

```
Main Process (Electron)
  ├── Next.js Server (child process on dynamic port)
  ├── BrowserWindow (renderer)
  ├── IPC Handlers (native file system, dialogs, etc.)
  └── Auto-updater

Renderer Process
  ├── Next.js React UI
  ├── IPC Client (window.electron API)
  └── Environment detection
```

### Key Features

✅ **Native File System Access** - Full read/write access via Node.js fs  
✅ **Auto-Updates** - Seamless updates via electron-updater  
✅ **Dual Mode Support** - Single codebase for web and desktop  
✅ **Native Dialogs** - File open/save dialogs  
✅ **Native Notifications** - System-level notifications  
✅ **Window Management** - Minimize, maximize, close controls  
✅ **Security** - Context isolation, no Node integration in renderer  

## Project Structure

```
polaris/
├── electron/                          # Electron-specific code
│   ├── main/                          # Main process
│   │   ├── index.ts                   # Entry point
│   │   ├── window-manager.ts          # Window management
│   │   ├── server-manager.ts          # Next.js server lifecycle
│   │   ├── menu.ts                    # Application menu
│   │   ├── auto-updater.ts            # Auto-update system
│   │   └── ipc/                       # IPC handlers
│   │       ├── file-system.ts         # Native file operations
│   │       ├── dialog.ts              # Native dialogs
│   │       ├── window.ts              # Window controls
│   │       └── notification.ts        # Notifications
│   ├── preload/                       # Preload scripts
│   │   ├── index.ts                   # IPC bridge
│   │   └── types.ts                   # TypeScript types
│   ├── resources/                     # Build resources
│   │   └── icons/                     # App icons
│   └── tsconfig.json                  # Electron TypeScript config
├── src/lib/electron/                  # Electron utilities
│   ├── environment.ts                 # Environment detection
│   ├── file-system-bridge.ts          # Unified FS interface
│   └── ipc-client.ts                  # Type-safe IPC client
├── src/components/electron/           # Electron UI components
│   ├── update-notification.tsx        # Update UI
│   └── environment-indicator.tsx      # Dev mode indicator
├── electron-builder.yml               # Build configuration
└── .github/workflows/
    └── electron-release.yml           # CI/CD pipeline
```

## Development

### Prerequisites

- Node.js 20+
- npm or yarn

### Install Dependencies

```bash
npm install
```

### Run in Development Mode

```bash
# Start Next.js dev server + Electron
npm run electron:dev
```

This will:
1. Start Next.js dev server on port 3000
2. Wait for server to be ready
3. Launch Electron window loading the dev server

### Testing

```bash
# Run all tests
npm test

# Run Electron-specific tests
npm run test:electron

# Run tests with UI
npm run test:ui

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

## Building

### Development Build (Unpackaged)

```bash
npm run electron:pack
```

Outputs to `dist-electron/` (unpackaged, for testing)

### Production Build

```bash
# Build for current platform
npm run electron:build

# Build for Windows
npm run electron:build:win

# Build for Linux
npm run electron:build:linux
```

Outputs:
- **Windows**: `.exe` installer + `latest.yml` (auto-update manifest)
- **Linux**: `.AppImage`, `.deb`, `.rpm` + `latest-linux.yml`

### Build Process

1. **Next.js Build**: Standalone build with all dependencies
2. **Electron Compile**: TypeScript → JavaScript
3. **electron-builder**: Package into native installers

## Environment Detection

The app automatically detects the environment:

```typescript
import { isElectron, getEnvironment } from '@/lib/electron/environment';

if (isElectron()) {
  // Use native file system
  await window.electron.fs.readFile(path);
} else {
  // Use File System Access API
  const handle = await showOpenFilePicker();
}
```

### Environment Types

- `electron` - Native desktop app
- `browser-pwa` - Progressive Web App
- `browser` - Standard web browser

## File System Access

### Electron (Native)

```typescript
import { fileSystemBridge } from '@/lib/electron/file-system-bridge';

// Read file
const content = await fileSystemBridge.readFile('/path/to/file.txt');

// Write file
await fileSystemBridge.writeFile('/path/to/file.txt', 'content');

// Read directory
const entries = await fileSystemBridge.readDirectory('/path/to/dir');

// Create directory
await fileSystemBridge.createDirectory('/path/to/new-dir');

// Delete entry
await fileSystemBridge.deleteEntry('/path/to/entry');
```

### Browser (File System Access API)

Not yet implemented - falls back to manual file selection

## Auto-Updates

Auto-updates are enabled by default in production builds.

### How It Works

1. App checks for updates on startup (after 3 seconds)
2. If update available, notification appears
3. User clicks "Download Update"
4. Progress bar shows download status
5. User clicks "Install and Restart"
6. App installs update and restarts

### Update Configuration

Edit `electron-builder.yml`:

```yaml
publish:
  provider: github
  owner: yourusername
  repo: polaris
```

### Releasing Updates

1. Update version in `package.json`
2. Create git tag: `git tag v1.0.1`
3. Push tag: `git push origin v1.0.1`
4. GitHub Actions builds and publishes release
5. Existing installs auto-update

## IPC Communication

### Available APIs

```typescript
// File System
window.electron.fs.readFile(path)
window.electron.fs.writeFile(path, content)
window.electron.fs.readDirectory(path)
window.electron.fs.createDirectory(path)
window.electron.fs.deleteEntry(path)
window.electron.fs.watchDirectory(path)
window.electron.fs.unwatchDirectory(path)
window.electron.fs.onFileEvent(callback)

// Dialogs
window.electron.dialog.showOpenDialog(options)
window.electron.dialog.showSaveDialog(options)

// Window Controls
window.electron.window.minimize()
window.electron.window.maximize()
window.electron.window.close()
window.electron.window.isMaximized()

// Auto-Updater
window.electron.updater.checkForUpdates()
window.electron.updater.downloadUpdate()
window.electron.updater.installUpdate()
window.electron.updater.onUpdateAvailable(callback)
window.electron.updater.onDownloadProgress(callback)
window.electron.updater.onUpdateDownloaded(callback)

// Notifications
window.electron.notification.show({ title, body })
```

## Security

### Context Isolation

✅ Enabled - Renderer has no direct access to Node.js

### Preload Script

The preload script exposes only necessary APIs via `contextBridge`:

```typescript
contextBridge.exposeInMainWorld('electron', {
  fs: { /* safe file system methods */ },
  dialog: { /* dialog methods */ },
  // etc.
});
```

### Path Validation

All file system operations validate paths to prevent:
- Directory traversal attacks
- Access to system directories (`/etc`, `C:\Windows`, etc.)

## CI/CD

### GitHub Actions Workflow

Located in `.github/workflows/electron-release.yml`

### Trigger

- **Automatic**: Push tag matching `v*` (e.g., `v1.0.0`)
- **Manual**: Via GitHub Actions UI

### Build Matrix

- **Windows**: `windows-latest` runner → `.exe` installer
- **Linux**: `ubuntu-latest` runner → `.AppImage`, `.deb`, `.rpm`

### Artifacts

All builds uploaded to GitHub Releases with auto-update manifests

### Code Signing (Windows)

Add these secrets to GitHub:
- `WIN_CSC_LINK` - Base64-encoded code signing certificate (.pfx)
- `WIN_CSC_KEY_PASSWORD` - Certificate password

```bash
# Encode certificate
base64 -i certificate.pfx -o certificate.txt
```

## Troubleshooting

### Electron window is blank

Check the server manager logs:
```bash
electron/main/server-manager.ts
```

Ensure Next.js server started successfully.

### Auto-updater not working

Verify `publish` configuration in `electron-builder.yml`:
- Correct GitHub owner/repo
- `GITHUB_TOKEN` available in CI

### File system operations failing

Check security restrictions in `electron/main/ipc/file-system.ts`:
- Path validation logic
- Forbidden directories list

### Build errors

Clear caches:
```bash
rm -rf .next dist-electron node_modules
npm install
npm run electron:build
```

## Performance

### Bundle Size

- Next.js standalone: ~150-200MB
- Electron + dependencies: ~100-150MB
- **Total installer**: ~200-300MB (compressed)

### Startup Time

- Cold start: ~3-5 seconds
- Warm start: ~1-2 seconds

### Memory Usage

- Idle: ~200-300MB
- Active editing: ~400-600MB
- With WebContainer: ~600-800MB

## Roadmap

### Phase 1: Foundation ✅
- [x] Basic Electron window
- [x] Next.js server integration
- [x] Testing infrastructure

### Phase 2: Native Features ✅
- [x] File system access
- [x] Native dialogs
- [x] Window controls
- [x] Auto-updates

### Phase 3: Build & Release ✅
- [x] electron-builder config
- [x] CI/CD pipeline
- [x] GitHub releases

### Phase 4: E2E Testing (In Progress)
- [ ] Playwright Electron tests
- [ ] Full user flow coverage
- [ ] CI integration

### Phase 5: Enhancements (Future)
- [ ] System tray support
- [ ] Custom protocol handler (polaris://)
- [ ] Native spellcheck
- [ ] Touch Bar support (macOS)
- [ ] Deep link integration

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder](https://www.electron.build/)
- [electron-updater](https://www.electron.build/auto-update)
- [Next.js Standalone Output](https://nextjs.org/docs/advanced-features/output-file-tracing)

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/polaris/issues
- Discussions: https://github.com/yourusername/polaris/discussions

## License

Same as Polaris IDE main project license.
