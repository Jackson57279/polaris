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
    await window.electron.updater.downloadUpdate();
  };

  const handleInstall = () => {
    window.electron.updater.installUpdate();
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
