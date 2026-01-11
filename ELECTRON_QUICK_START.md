# Electron Quick Start Guide

Get started with Polaris IDE desktop app development in 5 minutes.

## Prerequisites

- Node.js 20 or higher
- npm or yarn
- Git

## Installation

```bash
# Clone the repository (if not already done)
git clone https://github.com/yourusername/polaris.git
cd polaris

# Install dependencies
npm install
```

## Development

### Option 1: Run Web Version (Browser/PWA)

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Option 2: Run Desktop Version (Electron)

```bash
# Start both Next.js dev server and Electron
npm run electron:dev
```

This will:
1. Start Next.js dev server on port 3000
2. Wait for server to be ready
3. Launch Electron window loading the dev server

**Note**: First launch may take 10-15 seconds as Electron downloads dependencies.

## Testing

```bash
# Run all tests
npm test

# Run with watch mode
npm test -- --watch

# Run Electron-specific tests
npm run test:electron

# Run with coverage
npm run test:coverage

# Run E2E tests (when implemented)
npm run test:e2e
```

## Building

### Local Testing Build

```bash
# Create unpackaged build for testing
npm run electron:pack
```

Output: `dist-electron/` (unpackaged app)

### Production Installers

```bash
# Build for your current platform
npm run electron:build

# Or platform-specific:
npm run electron:build:win      # Windows .exe
npm run electron:build:linux    # Linux .AppImage/.deb/.rpm
```

Output: `dist-electron/` (installers + auto-update manifests)

## Project Structure

```
polaris/
├── electron/               # Electron desktop app code
│   ├── main/              # Main process (Node.js)
│   ├── preload/           # Preload scripts (bridge)
│   └── resources/         # Icons and assets
├── src/
│   ├── lib/electron/      # Electron utilities
│   ├── components/electron/  # Electron UI components
│   └── app/api/health/    # Health check endpoint
└── tests/
    ├── setup.ts           # Test configuration
    └── mocks/electron.ts  # Electron API mocks
```

## Using Electron Features

### Environment Detection

```typescript
import { isElectron, getEnvironment } from '@/lib/electron/environment';

if (isElectron()) {
  // Desktop-specific code
  console.log('Running in Electron');
} else {
  // Browser-specific code
  console.log('Running in browser');
}

const env = getEnvironment(); // 'electron' | 'browser-pwa' | 'browser'
```

### File System Access

```typescript
import { fileSystemBridge } from '@/lib/electron/file-system-bridge';

// Read file
const content = await fileSystemBridge.readFile('/path/to/file.txt');

// Write file
await fileSystemBridge.writeFile('/path/to/file.txt', 'Hello, World!');

// Read directory
const entries = await fileSystemBridge.readDirectory('/path/to/dir');

// Create directory
await fileSystemBridge.createDirectory('/path/to/new-dir');

// Delete entry
await fileSystemBridge.deleteEntry('/path/to/entry');
```

### Native Dialogs

```typescript
if (isElectron()) {
  const result = await window.electron.dialog.showOpenDialog({
    title: 'Select a file',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Text Files', extensions: ['txt', 'md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.data.canceled) {
    console.log('Selected files:', result.data.filePaths);
  }
}
```

### Window Controls

```typescript
if (isElectron()) {
  // Minimize window
  await window.electron.window.minimize();

  // Maximize/restore window
  await window.electron.window.maximize();

  // Close window
  await window.electron.window.close();

  // Check if maximized
  const result = await window.electron.window.isMaximized();
  console.log('Is maximized:', result.data);
}
```

### Notifications

```typescript
if (isElectron()) {
  await window.electron.notification.show({
    title: 'Build Complete',
    body: 'Your project has been built successfully!'
  });
}
```

## Troubleshooting

### Electron window is blank

**Solution**: Check that Next.js dev server is running. Wait for "Ready" message before starting Electron.

### "Cannot find module 'electron'"

**Solution**: 
```bash
npm install
# or
rm -rf node_modules package-lock.json
npm install
```

### Build errors

**Solution**: Clear caches and rebuild:
```bash
rm -rf .next dist-electron node_modules
npm install
npm run electron:build
```

### Tests failing

**Solution**: Ensure you're excluding Convex imports:
```bash
# Check vitest.config.ts has:
exclude: ['**/convex/**', 'tests/paddle-integration.test.ts']
```

### Port 3000 already in use

**Solution**: 
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

## Common Tasks

### Add New IPC Handler

1. Create handler in `electron/main/ipc/your-feature.ts`:
```typescript
import { ipcMain } from 'electron';

export function registerYourFeatureHandlers() {
  ipcMain.handle('yourFeature:action', async (_, arg) => {
    try {
      // Your code here
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
```

2. Register in `electron/main/ipc/index.ts`:
```typescript
import { registerYourFeatureHandlers } from './your-feature';

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  registerYourFeatureHandlers();
  // ... other handlers
}
```

3. Expose in preload script `electron/preload/index.ts`:
```typescript
const electronAPI = {
  yourFeature: {
    action: (arg: string) => ipcRenderer.invoke('yourFeature:action', arg)
  }
  // ... other APIs
};
```

4. Update TypeScript types `src/types/electron.d.ts`:
```typescript
export interface ElectronAPI {
  yourFeature: {
    action: (arg: string) => Promise<FileSystemResult<any>>;
  };
  // ... other APIs
}
```

### Add Environment-Specific Component

```typescript
'use client';

import { useEffect, useState } from 'react';
import { isElectron } from '@/lib/electron/environment';

export function MyComponent() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsDesktop(isElectron());
  }, []);

  if (isDesktop) {
    return <DesktopVersion />;
  }

  return <BrowserVersion />;
}
```

## Release Process

### 1. Update Version

```bash
# In package.json, update version
"version": "1.0.1"
```

### 2. Create Git Tag

```bash
git add .
git commit -m "Release v1.0.1"
git tag v1.0.1
git push origin v1.0.1
```

### 3. GitHub Actions Builds

GitHub Actions will automatically:
- Run tests
- Build Windows installer
- Build Linux installers
- Create GitHub Release
- Publish auto-update manifests

### 4. Auto-Update

Existing installs will:
- Check for updates on startup
- Show update notification
- Download in background
- Prompt user to install

## Resources

- [Electron Documentation](https://www.electronjs.org/docs/latest/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Full Integration Guide](./ELECTRON_INTEGRATION.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)

## Getting Help

- **Issues**: https://github.com/yourusername/polaris/issues
- **Discussions**: https://github.com/yourusername/polaris/discussions
- **Electron Discord**: https://discord.gg/electronjs

## Next Steps

1. **Create app icons** - Replace placeholders in `electron/resources/icons/`
2. **Test build** - Run `npm run electron:pack` and verify
3. **Add E2E tests** - Implement Phase 8 (see IMPLEMENTATION_SUMMARY.md)
4. **Deploy first release** - Push version tag to trigger CI/CD

Happy coding! 🚀
