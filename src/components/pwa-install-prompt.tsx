'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface PWAInstallPromptProps {
  className?: string;
}

export function PWAInstallPrompt({ className }: PWAInstallPromptProps) {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const beforeInstallPromptHandlerRef = useRef<(e: Event) => void>((e) => {
    e.preventDefault();
  });
  const appInstalledHandlerRef = useRef<() => void>(() => {});

  useEffect(() => {
    const checkInstalled = async () => {
      if ((window as any).navigator.getInstalledRelatedApps) {
        const apps = await (window as any).navigator.getInstalledRelatedApps();
        setIsInstalled(apps.length > 0);
      }
    };
    checkInstalled();

    beforeInstallPromptHandlerRef.current = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = window.setTimeout(() => {
        setIsVisible((prevVisible) => !prevVisible && !isInstalled);
      }, 5000);
    };
    window.addEventListener('beforeinstallprompt', beforeInstallPromptHandlerRef.current);

    appInstalledHandlerRef.current = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setInstallPrompt(null);
    };
    window.addEventListener('appinstalled', appInstalledHandlerRef.current);

    const dismissed = localStorage.getItem('polaris-install-prompt-dismissed');
    if (dismissed) {
      setIsVisible(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstallPromptHandlerRef.current);
      window.removeEventListener('appinstalled', appInstalledHandlerRef.current);
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isInstalled]);

  const handleInstall = async () => {
    if (installPrompt) {
      try {
        const result = await installPrompt.prompt();
        
        if (result.outcome === 'accepted') {
          setIsVisible(false);
          setIsInstalled(true);
        }
      } catch (error) {
        console.error('Install failed:', error);
      }
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('polaris-install-prompt-dismissed', 'true');
  };

  const handleRemindLater = () => {
    setIsVisible(false);
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true);
    }, 7 * 24 * 60 * 60 * 1000);
  };

  if (!isVisible || isInstalled || !installPrompt) {
    return null;
  }

  return (
    <div className={`pwa-install-prompt ${className || ''}`} role="dialog" aria-labelledby="install-title">
      <div className="pwa-install-content">
        <div className="pwa-install-header">
          <div className="pwa-install-icon">
            <span className="pwa-app-icon" aria-hidden="true">🔷</span>
          </div>
          <div className="pwa-install-text">
            <h3 id="install-title" className="pwa-install-title">
              Install Polaris IDE
            </h3>
            <p className="pwa-install-description">
              Get the full desktop experience with offline support and faster performance.
            </p>
          </div>
        </div>

        <div className="pwa-install-features">
          <div className="pwa-feature-grid">
            <div className="pwa-feature">
              <span className="pwa-feature-icon">🚀</span>
              <span className="pwa-feature-text">Offline Code Editing</span>
            </div>
            <div className="pwa-feature">
              <span className="pwa-feature-icon">⚡</span>
              <span className="pwa-feature-text">Native Performance</span>
            </div>
            <div className="pwa-feature">
              <span className="pwa-feature-icon">📁</span>
              <span className="pwa-feature-text">Direct File Access</span>
            </div>
            <div className="pwa-feature">
              <span className="pwa-feature-icon">🔔</span>
              <span className="pwa-feature-text">System Notifications</span>
            </div>
          </div>
        </div>

        <div className="pwa-install-actions">
          <Button 
            onClick={handleInstall}
            className="pwa-install-btn"
            size="lg"
          >
            Install App
          </Button>
          <Button 
            onClick={handleRemindLater}
            variant="outline"
            className="pwa-remind-btn"
          >
            Remind Me Later
          </Button>
          <Button 
            onClick={handleDismiss}
            variant="ghost"
            className="pwa-dismiss-btn"
          >
            No Thanks
          </Button>
        </div>
      </div>
    </div>
  );
}

// Inline installation guide component
export function PWAInstallationGuide() {
  const [showGuide, setShowGuide] = useState(false);

  const steps = [
    {
      title: "Open Browser Menu",
      description: "Click the three dots (⋮) in your browser's address bar",
      icon: "⋮"
    },
    {
      title: "Select 'Install'",
      description: "Choose 'Install Polaris IDE' from the dropdown menu",
      icon: "⬇️"
    },
    {
      title: "Confirm Installation",
      description: "Click 'Install' in the confirmation dialog",
      icon: "✅"
    },
    {
      title: "Launch App",
      description: "Find Polaris in your applications and start coding!",
      icon: "🚀"
    }
  ];

  return (
    <div className="pwa-install-guide">
      <Button 
        variant="outline" 
        onClick={() => setShowGuide(!showGuide)}
        className="pwa-guide-trigger"
      >
        How to Install
      </Button>
      
      {showGuide && (
        <div className="pwa-guide-modal" role="dialog">
          <div className="pwa-guide-content">
            <h3>Install Polaris IDE</h3>
            <div className="pwa-steps">
              {steps.map((step, index) => (
                <div key={index} className="pwa-step">
                  <div className="pwa-step-number">{index + 1}</div>
                  <div className="pwa-step-content">
                    <div className="pwa-step-title">
                      <span className="pwa-step-icon">{step.icon}</span>
                      {step.title}
                    </div>
                    <p className="pwa-step-description">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={() => setShowGuide(false)}>Got it!</Button>
          </div>
        </div>
      )}
    </div>
  );
}
