'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from 'next-themes';

/**
 * Initializes client-side PWA behaviors and coordinates related UI hooks.
 *
 * Applies the appropriate theme-color meta, registers a service worker on window load when supported, adapts CSS for the Window Controls Overlay title bar, tracks online/offline state and network quality, and wires PWA lifecycle events (`beforeinstallprompt` / `appinstalled`). Emits custom events (`pwa:installavailable`, `pwa:installed`, `pwa:connectionchange`, `pwa:connectionquality`) and updates document attributes/variables to reflect connection and titlebar state. Cleans up all registered event listeners on unmount.
 */
export function PWAInitializer() {
  const { theme } = useTheme();
  const loadHandlerRef = useRef<() => void>(() => {});
  const beforeInstallPromptHandlerRef = useRef<(e: Event) => void>((e) => {
    e.preventDefault();
  });
  const appInstalledHandlerRef = useRef<() => void>(() => {});
  const connectionChangeHandlerRef = useRef<() => void>(() => {});

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      loadHandlerRef.current = () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('SW registered:', registration.scope);
          },
          (registrationError) => {
            console.log('SW registration failed:', registrationError);
          }
        );
      };
      window.addEventListener('load', loadHandlerRef.current);
    }

    const handleThemeChange = () => {
      const themeColor = theme === 'dark' ? '#0b1220' : '#ffffff';
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', themeColor);
      }
    };

    handleThemeChange();

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

    let deferredPrompt: any = null;
    beforeInstallPromptHandlerRef.current = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      
      window.dispatchEvent(new CustomEvent('pwa:installavailable', { detail: deferredPrompt }));
    };
    window.addEventListener('beforeinstallprompt', beforeInstallPromptHandlerRef.current);

    appInstalledHandlerRef.current = () => {
      window.dispatchEvent(new CustomEvent('pwa:installed'));
      
      deferredPrompt = null;
    };
    window.addEventListener('appinstalled', appInstalledHandlerRef.current);

    const updateOnlineStatus = () => {
      const status = navigator.onLine ? 'online' : 'offline';
      document.body.setAttribute('data-connection', status);
      window.dispatchEvent(new CustomEvent('pwa:connectionchange', { detail: { online: navigator.onLine } }));
    };
    connectionChangeHandlerRef.current = updateOnlineStatus;

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateConnectionQuality = () => {
        const effectiveType = connection.effectiveType;
        document.body.setAttribute('data-connection-quality', effectiveType);
        window.dispatchEvent(new CustomEvent('pwa:connectionquality', { detail: { effectiveType } }));
      };

      connection.addEventListener('change', updateConnectionQuality);

      return () => {
        window.removeEventListener('load', loadHandlerRef.current);
        window.removeEventListener('beforeinstallprompt', beforeInstallPromptHandlerRef.current);
        window.removeEventListener('appinstalled', appInstalledHandlerRef.current);
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
        connection.removeEventListener('change', updateConnectionQuality);
      };
    }

    return () => {
      window.removeEventListener('load', loadHandlerRef.current);
      window.removeEventListener('beforeinstallprompt', beforeInstallPromptHandlerRef.current);
      window.removeEventListener('appinstalled', appInstalledHandlerRef.current);
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [theme]);

  return null;
}

/**
 * Exposes reactive Progressive Web App state and an action to trigger installation.
 *
 * @returns An object with:
 * - `installPrompt` — the current deferred install prompt event or `null`.
 * - `isInstalled` — `true` when the app is detected as installed, `false` otherwise.
 * - `isOnline` — current online status (`true` for online, `false` for offline).
 * - `connectionQuality` — current network effective type (e.g., `'4g'`, `'3g'`, `'slow-2g'`, or `'unknown'`).
 * - `triggerInstall` — async function that, when an install prompt is available, shows it and resolves to `true` if the user accepted the installation, `false` otherwise.
 * - `canInstall` — `true` if an install prompt is available and the app is not already installed, `false` otherwise.
 */
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