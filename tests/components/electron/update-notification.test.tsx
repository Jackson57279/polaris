/**
 * Update Notification Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UpdateNotification } from '../../../src/components/electron/update-notification';

// Mock the environment module
vi.mock('@/lib/electron/environment', () => ({
  isElectron: vi.fn(() => true),
}));

// Mock the IPC client
vi.mock('@/lib/electron/ipc-client', () => ({
  autoUpdater: {
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
  },
}));

// Mock window.electron
const mockElectron = {
  updates: {
    onUpdateAvailable: vi.fn((callback: any) => {
      // Store callback for triggering in tests
      (global as any).__updateAvailableCallback = callback;
      return () => {};
    }),
    onUpdateDownloaded: vi.fn((callback: any) => {
      (global as any).__updateDownloadedCallback = callback;
      return () => {};
    }),
    onDownloadProgress: vi.fn((callback: any) => {
      (global as any).__downloadProgressCallback = callback;
      return () => {};
    }),
    onError: vi.fn((callback: any) => {
      (global as any).__updateErrorCallback = callback;
      return () => {};
    }),
  },
};

describe('UpdateNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).electron = mockElectron;
  });

  afterEach(() => {
    delete (window as any).electron;
    delete (global as any).__updateAvailableCallback;
    delete (global as any).__updateDownloadedCallback;
    delete (global as any).__downloadProgressCallback;
    delete (global as any).__updateErrorCallback;
  });

  it('should render nothing initially', () => {
    const { container } = render(<UpdateNotification />);
    expect(container.firstChild).toBeNull();
  });

  it('should show update available notification', async () => {
    render(<UpdateNotification />);

    // Trigger update available
    const callback = (global as any).__updateAvailableCallback;
    if (callback) {
      callback({ version: '2.0.0' });
    }

    await waitFor(() => {
      expect(screen.getByText(/update available/i)).toBeInTheDocument();
    });
  });

  it('should show update version in notification', async () => {
    render(<UpdateNotification />);

    const callback = (global as any).__updateAvailableCallback;
    if (callback) {
      callback({ version: '2.0.0' });
    }

    await waitFor(() => {
      expect(screen.getByText(/2\.0\.0/)).toBeInTheDocument();
    });
  });

  it('should show download button when update is available', async () => {
    render(<UpdateNotification />);

    const callback = (global as any).__updateAvailableCallback;
    if (callback) {
      callback({ version: '2.0.0' });
    }

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
    });
  });

  it('should show progress during download', async () => {
    render(<UpdateNotification />);

    // Trigger update available first
    const availableCallback = (global as any).__updateAvailableCallback;
    if (availableCallback) {
      availableCallback({ version: '2.0.0' });
    }

    // Then trigger progress
    const progressCallback = (global as any).__downloadProgressCallback;
    if (progressCallback) {
      progressCallback({ percent: 50 });
    }

    await waitFor(() => {
      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });
  });

  it('should show install button when download is complete', async () => {
    render(<UpdateNotification />);

    const downloadedCallback = (global as any).__updateDownloadedCallback;
    if (downloadedCallback) {
      downloadedCallback({ version: '2.0.0' });
    }

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /install|restart/i })
      ).toBeInTheDocument();
    });
  });

  it('should allow dismissing the notification', async () => {
    render(<UpdateNotification />);

    const callback = (global as any).__updateAvailableCallback;
    if (callback) {
      callback({ version: '2.0.0' });
    }

    await waitFor(() => {
      expect(screen.getByText(/update available/i)).toBeInTheDocument();
    });

    // Find and click dismiss button
    const dismissButton = screen.getByRole('button', { name: /dismiss|close|later/i });
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText(/update available/i)).not.toBeInTheDocument();
    });
  });
});

describe('UpdateNotification - Browser Environment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Remove electron from window
    delete (window as any).electron;

    // Mock isElectron to return false
    vi.doMock('@/lib/electron/environment', () => ({
      isElectron: vi.fn(() => false),
    }));
  });

  it('should render nothing in browser environment', () => {
    const { container } = render(<UpdateNotification />);
    expect(container.firstChild).toBeNull();
  });
});
