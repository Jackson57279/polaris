// Desktop integration features for PWA

export class DesktopIntegrationManager {
  private static instance: DesktopIntegrationManager;
  private notificationPermission: NotificationPermission = 'default';
  private isWorkspaceActive: boolean = true;

  private constructor() {
    this.initNotifications();
    this.initKeyboardShortcuts();
    this.initFocusDetection();
  }

  static getInstance(): DesktopIntegrationManager {
    if (!DesktopIntegrationManager.instance) {
      DesktopIntegrationManager.instance = new DesktopIntegrationManager();
    }
    return DesktopIntegrationManager.instance;
  }

  isWorkspaceFocused(): boolean {
    return this.isWorkspaceActive;
  }

  private initFocusDetection() {
    window.addEventListener('focus', () => {
      this.isWorkspaceActive = true;
    });
    window.addEventListener('blur', () => {
      this.isWorkspaceActive = false;
    });
  }

  private initNotifications() {
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;
    }
  }

  async requestNotificationPermission(): Promise<void> {
    if ('Notification' in window && this.notificationPermission === 'default') {
      try {
        this.notificationPermission = await Notification.requestPermission();
      } catch (error) {
        console.error('Notification permission denied:', error);
      }
    }
  }

  async sendNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    if (this.notificationPermission !== 'granted') {
      return;
    }

    const defaultOptions: NotificationOptions = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      requireInteraction: true,
      ...options
    };

    new Notification(title, defaultOptions);
  }

  // Keyboard shortcuts
  private initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (!this.isWorkspaceFocused()) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault();
            if (e.shiftKey) {
              this.createProject();
            } else {
              this.newFile();
            }
            break;
          case 's':
            e.preventDefault();
            this.saveProject();
            break;
          case 'o':
            e.preventDefault();
            this.openProject();
            break;
          case 'p':
            if (e.shiftKey) {
              e.preventDefault();
              this.openPreview();
            }
            break;
        }
      }
    });
  }

  // Project management
  private createProject() {
    window.dispatchEvent(new CustomEvent('polaris:project:create'));
  }

  private newFile() {
    window.dispatchEvent(new CustomEvent('polaris:file:new'));
  }

  private saveProject() {
    window.dispatchEvent(new CustomEvent('polaris:project:save'));
  }

  private openProject() {
    window.dispatchEvent(new CustomEvent('polaris:project:open'));
  }

  private openPreview() {
    window.dispatchEvent(new CustomEvent('polaris:preview:open'));
  }

  // Window management
  maximizeWindow() {
    if ('windowControlsOverlay' in navigator) {
      const overlay = (navigator as any).windowControlsOverlay;
      if (overlay) {
        window.dispatchEvent(new Event('maximize'));
      }
    } else {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    }
  }

  minimizeWindow() {
    window.dispatchEvent(new Event('minimize'));
  }

  closeWindow() {
    window.dispatchEvent(new Event('close'));
  }

  // File system integration
  async openFileInSystem(filePath: string) {
    if ('showOpenFilePicker' in window) {
      try {
        const [fileHandle] = await (window as any).showOpenFilePicker({
          id: 'polaris-file-opener',
          mode: 'read'
        });
        
        if (fileHandle) {
          const file = await fileHandle.getFile();
          return file;
        }
      } catch (error) {
        console.error('Failed to open file:', error);
      }
    }
  }

  // Performance monitoring
  startPerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'largest-contentful-paint') {
            console.log('LCP:', entry.startTime);
          }
        });
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    }
  }

  private getFirstPaint(): number {
    const entries = performance.getEntriesByType('paint');
    const fp = entries.find((entry: any) => entry.name === 'first-paint');
    return fp ? fp.startTime : 0;
  }

  private getFirstContentfulPaint(): number {
    const entries = performance.getEntriesByType('paint');
    const fcp = entries.find((entry: any) => entry.name === 'first-contentful-paint');
    return fcp ? fcp.startTime : 0;
  }

  private sendPerformanceMetrics(metrics: any) {
    console.log('Performance metrics:', metrics);
  }

  // Battery status monitoring
  monitorBatteryStatus() {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          const level = battery.level * 100;
          const isCharging = battery.charging;
          
          if (level < 20 && !isCharging) {
            this.enableLowPowerMode();
          } else {
            this.disableLowPowerMode();
          }
        };

        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
        
        updateBattery();
      });
    }
  }

  enableLowPowerMode() {
    document.body.classList.add('low-power-mode');
    this.sendNotification('Low Power Mode', {
      body: 'Battery is low. Performance optimizations enabled.',
    });
  }

  disableLowPowerMode() {
    document.body.classList.remove('low-power-mode');
  }
}

// React hook for desktop integration
export const useDesktopIntegration = () => {
  const manager = DesktopIntegrationManager.getInstance();

  return {
    sendNotification: (title: string, options?: any) => 
      manager.sendNotification(title, options),
    maximizeWindow: () => manager.maximizeWindow(),
    minimizeWindow: () => manager.minimizeWindow(),
    closeWindow: () => manager.closeWindow(),
    openFileInSystem: (path: string) => manager.openFileInSystem(path),
    startPerformanceMonitoring: () => manager.startPerformanceMonitoring(),
    monitorBatteryStatus: () => manager.monitorBatteryStatus(),
    enableLowPowerMode: () => manager.enableLowPowerMode(),
    disableLowPowerMode: () => manager.disableLowPowerMode(),
  };
};
