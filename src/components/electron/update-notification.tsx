'use client';

import { useState, useEffect } from 'react';
import { isElectron } from '@/lib/electron/environment';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { X } from 'lucide-react';

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
}

interface DownloadProgress {
  percent: number;
}

export function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [visible, setVisible] = useState(true);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);

  useEffect(() => {
    if (!isElectron()) return;

    const unsubscribeAvailable = window.electron.updater.onUpdateAvailable((info: UpdateInfo) => {
      setUpdateAvailable(true);
      setUpdateInfo(info);
      setVisible(true);
    });

    const unsubscribeProgress = window.electron.updater.onDownloadProgress((progress: DownloadProgress) => {
      setDownloadProgress(progress.percent);
    });

    const unsubscribeDownloaded = window.electron.updater.onUpdateDownloaded(() => {
      setUpdateDownloaded(true);
      setDownloading(false);
    });

    return () => {
      unsubscribeAvailable();
      unsubscribeProgress();
      unsubscribeDownloaded();
    };
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const result = await window.electron.updater.downloadUpdate();
      if (!result.success) {
        setDownloadError(result.error || 'Failed to download update');
        setDownloading(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while downloading';
      setDownloadError(message);
      setDownloading(false);
    }
  };

  const handleInstall = async () => {
    setInstallError(null);
    try {
      const result = await window.electron.updater.installUpdate();
      if (!result.success) {
        setInstallError(result.error || 'Failed to install update');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred during installation';
      setInstallError(message);
    }
  };

  if (!isElectron() || !updateAvailable || !visible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96" data-testid="update-notification">
      <Card className="p-4 shadow-lg">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-lg">Update Available</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setVisible(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {updateInfo && (
          <p className="text-sm text-muted-foreground mb-4">
            Version {updateInfo.version} is available
          </p>
        )}

        {downloadError && (
          <div className="mb-4 p-2 bg-destructive/10 text-destructive text-sm rounded">
            {downloadError}
          </div>
        )}

        {installError && (
          <div className="mb-4 p-2 bg-destructive/10 text-destructive text-sm rounded">
            {installError}
          </div>
        )}

        {downloading && (
          <div className="mb-4">
            <Progress value={downloadProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Downloading... {Math.round(downloadProgress)}%
            </p>
          </div>
        )}

        {updateDownloaded ? (
          <Button onClick={handleInstall} className="w-full">
            Install and Restart
          </Button>
        ) : downloading ? (
          <Button disabled className="w-full">
            Downloading...
          </Button>
        ) : (
          <Button onClick={handleDownload} className="w-full">
            Download Update
          </Button>
        )}
      </Card>
    </div>
  );
}
