'use client';

/**
 * Update Notification Component
 *
 * Displays a notification when an update is available for the Electron app.
 * Shows download progress and install button.
 */

import { useState, useEffect, useCallback } from 'react';
import { isElectron } from '@/lib/electron/environment';
import { updater } from '@/lib/electron/ipc-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Download, X, RefreshCw, Check } from 'lucide-react';

interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond?: number;
  total?: number;
  transferred?: number;
}

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';

export function UpdateNotification() {
  const [state, setState] = useState<UpdateState>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<DownloadProgress>({ percent: 0 });
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Subscribe to update events
  useEffect(() => {
    if (!isElectron()) return;

    const unsubscribeAvailable = updater.onUpdateAvailable((info) => {
      setUpdateInfo(info as UpdateInfo);
      setState('available');
      setDismissed(false);
    });

    const unsubscribeProgress = updater.onDownloadProgress((prog) => {
      setProgress(prog as DownloadProgress);
    });

    const unsubscribeDownloaded = updater.onUpdateDownloaded((info) => {
      setUpdateInfo(info as UpdateInfo);
      setState('downloaded');
    });

    const unsubscribeError = updater.onError((err) => {
      setError(err.message);
      setState('error');
    });

    // Check for updates on mount
    checkForUpdates();

    return () => {
      unsubscribeAvailable();
      unsubscribeProgress();
      unsubscribeDownloaded();
      unsubscribeError();
    };
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (!isElectron()) return;

    setState('checking');
    setError(null);

    try {
      const info = await updater.checkForUpdates();
      if (!info) {
        setState('idle');
      }
      // If update is available, the event handler will update state
    } catch (err) {
      setError((err as Error).message);
      setState('error');
    }
  }, []);

  const downloadUpdate = useCallback(async () => {
    if (!isElectron()) return;

    setState('downloading');
    setProgress({ percent: 0 });

    try {
      await updater.downloadUpdate();
      // Downloaded state will be set by event handler
    } catch (err) {
      setError((err as Error).message);
      setState('error');
    }
  }, []);

  const installUpdate = useCallback(() => {
    if (!isElectron()) return;
    updater.installUpdate();
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  // Don't render in browser environment
  if (!isElectron()) {
    return null;
  }

  // Don't render if dismissed or idle
  if (dismissed || state === 'idle' || state === 'checking') {
    return null;
  }

  return (
    <Card
      className="fixed bottom-4 right-4 w-80 shadow-lg z-50 bg-background border"
      data-testid="update-notification"
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {state === 'available' && <Download className="h-5 w-5 text-primary" />}
            {state === 'downloading' && <RefreshCw className="h-5 w-5 text-primary animate-spin" />}
            {state === 'downloaded' && <Check className="h-5 w-5 text-green-500" />}
            <CardTitle className="text-base">
              {state === 'available' && 'Update Available'}
              {state === 'downloading' && 'Downloading Update'}
              {state === 'downloaded' && 'Update Ready'}
              {state === 'error' && 'Update Error'}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mt-1 -mr-2"
            onClick={dismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {updateInfo && (
          <CardDescription>
            Version {updateInfo.version} is available
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="pb-4">
        {state === 'downloading' && (
          <div className="space-y-2">
            <Progress value={progress.percent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {progress.percent.toFixed(0)}% downloaded
              {progress.bytesPerSecond && (
                <span className="ml-2">
                  ({formatBytes(progress.bytesPerSecond)}/s)
                </span>
              )}
            </p>
          </div>
        )}

        {state === 'available' && (
          <Button onClick={downloadUpdate} className="w-full" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download Update
          </Button>
        )}

        {state === 'downloaded' && (
          <Button onClick={installUpdate} className="w-full" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Restart & Install
          </Button>
        )}

        {state === 'error' && (
          <div className="space-y-2">
            <p className="text-xs text-destructive">{error}</p>
            <Button onClick={checkForUpdates} variant="outline" className="w-full" size="sm">
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
