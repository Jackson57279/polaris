'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';

export function PWAInitializer() {
  const { theme } = useTheme();

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('SW registered:', registration.scope);
          },
          (registrationError) => {
            console.log('SW registration failed:', registrationError);
          }
        );
      });
    }

    // Handle theme changes for PWA
    const handleThemeChange = () => {
      const themeColor = theme === 'dark' ? '#0b1220' : '#ffffff';
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', themeColor);
      }
    };

    handleThemeChange();

    // Handle window controls overlay (Windows 11+)
    if ('windowControlsOverlay' in navigator) {
      const overlay = (navigator as any).windowControlsOverlay;
      
      if (overlay) {
        const updateTitleBar = () => {
          const { titlebarAreaRect } = overlay;
          document.documentElement.style.setProperty(
            '--titlebar-height',
            `${titlebarAreaRect.height}px`
          );
        };

        overlay.addEventListener('geometrychange', updateTitleBar);
        updateTitleBar();
      }
    }

    // Handle beforeinstallprompt event
    let deferredPrompt: any = null;
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Dispatch custom event for UI components
      window.dispatchEvent(new CustomEvent('pwa:installavailable', { detail: deferredPrompt }));
    });

    // Handle app installed event
    window.addEventListener('appinstalled', () => {
      window.dispatchEvent(new CustomEvent('pwa:installed'));
      
      // Clear the deferred prompt
      deferredPrompt = null;
    });

    // Connection status monitoring
    const updateOnlineStatus = () => {
      const status = navigator.onLine ? 'online' : 'offline';
      document.body.setAttribute('data-connection', status);
      window.dispatchEvent(new CustomEvent('pwa:connectionchange', { detail: { online: navigator.onLine } }));
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // Performance optimization hints
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateConnectionQuality = () => {
        const effectiveType = connection.effectiveType;
        document.body.setAttribute('data-connection-quality', effectiveType);
        window.dispatchEvent(new CustomEvent('pwa:connectionquality', { detail: { effectiveType } }));
      };

      connection.addEventListener('change', updateConnectionQuality);
      updateConnectionQuality();
    }

    // Cleanup
    return () => {
      window.removeEventListener('load', () => {});
      window.removeEventListener('beforeinstallprompt', () => {});
      window.removeEventListener('appinstalled', () => {});
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [theme]);

  return null;
}

// Hook to access PWA state
export function usePWAState() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState('unknown');

  useEffect(() => {
    // Check installation status
    if ((navigator as any).getInstalledRelatedApps) {
      (navigator as any).getInstalledRelatedApps().then((apps: any[]) => {
        setIsInstalled(apps.length > 0);
      });
    }

    // Listen for install prompt
    const handleInstallAvailable = (e: CustomEvent) => {
      setInstallPrompt(e.detail);
    };

    window.addEventListener('pwa:installavailable', handleInstallAvailable as EventListener);

    // Listen for installation
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('pwa:installed', handleInstalled);

    // Connection status
    const handleConnectionChange = (e: CustomEvent) => {
      setIsOnline(e.detail.online);
    };

    window.addEventListener('pwa:connectionchange', handleConnectionChange as EventListener);

    // Connection quality
    const handleConnectionQuality = (e: CustomEvent) => {
      setConnectionQuality(e.detail.effectiveType);
    };

    window.addEventListener('pwa:connectionquality', handleConnectionQuality as EventListener);

    // Initial state
    setIsOnline(navigator.onLine);

    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setConnectionQuality(connection.effectiveType);
    }

    return () => {
      window.removeEventListener('pwa:installavailable', handleInstallAvailable as EventListener);
      window.removeEventListener('pwa:installed', handleInstalled);
      window.removeEventListener('pwa:connectionchange', handleConnectionChange as EventListener);
      window.removeEventListener('pwa:connectionquality', handleConnectionQuality as EventListener);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!installPrompt) return false;

    try {
      const result = await installPrompt.prompt();
      return result.outcome === 'accepted';
    } catch (error) {
      console.error('Install failed:', error);
      return false;
    }
  }, [installPrompt]);

  return {
    installPrompt,
    isInstalled,
    isOnline,
    connectionQuality,
    triggerInstall,
    canInstall: !!installPrompt && !isInstalled
  };
}
