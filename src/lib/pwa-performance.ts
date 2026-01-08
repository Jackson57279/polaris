// Performance optimization utilities for PWA

export class PWAPerformance {
  private static instance: PWAPerformance;
  private static readonly CACHE_KEY = 'polaris-performance-cache';
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private perfObservers: PerformanceObserver[] = [];

  private constructor() {}

  static getInstance(): PWAPerformance {
    if (!PWAPerformance.instance) {
      PWAPerformance.instance = new PWAPerformance();
    }
    return PWAPerformance.instance;
  }

  // Resource preloading
  preloadCriticalResources() {
    const criticalResources = [
      '/_next/static/chunks/main.js',
      '/_next/static/chunks/webpack.js',
      '/_next/static/css/app.css',
      '/sw.js',
      '/manifest.json',
    ];

    criticalResources.forEach((url) => {
      if (document.querySelector(`link[href="${url}"]`)) return;
      
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      link.as = url.includes('.js') ? 'script' : 'style';
      document.head.appendChild(link);
    });
  }

  // Memory management
  optimizeMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
        if ('gc' in window) {
          (window as any).gc();
        }
      }
    }
  }

  // Connection-aware loading
  async loadWithConnectionAwareness(loadFunction: () => Promise<any>) {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        return this.loadMinimalBundle(loadFunction);
      }
    }
    
    return loadFunction();
  }

  private async loadMinimalBundle(loadFunction: () => Promise<any>) {
    try {
      return await loadFunction();
    } catch (error) {
      console.warn('Failed to load with connection awareness:', error);
      return null;
    }
  }

  // Cache management
  async clearCache() {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }
  }

  // Performance monitoring
  startPerformanceMonitoring() {
    this.stopPerformanceMonitoring();
    
    if ('PerformanceObserver' in window) {
      // LCP
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          console.log('LCP:', lastEntry.startTime);
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.perfObservers.push(lcpObserver);
      } catch (e) {
        // LCP not supported
      }

      // FID
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            console.log('FID:', (entry as any).firstInputDelay);
          });
        });
        
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.perfObservers.push(fidObserver);
      } catch (e) {
        // FID not supported
      }

      // CLS
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
              console.log('CLS:', clsValue);
            }
          });
        });
        
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.perfObservers.push(clsObserver);
      } catch (e) {
        // CLS not supported
      }
    }
  }

  stopPerformanceMonitoring() {
    this.perfObservers.forEach((observer) => observer.disconnect());
    this.perfObservers = [];
  }

  // Get current performance metrics
  getPerformanceMetrics() {
    const navigation = performance.getEntriesByType('navigation')[0] as any;
    const paint = performance.getEntriesByType('paint');
    
    return {
      // Timing
      pageLoadTime: navigation ? navigation.loadEventEnd - navigation.startTime : 0,
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.startTime : 0,
      firstPaint: paint.find((p: any) => p.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find((p: any) => p.name === 'first-contentful-paint')?.startTime || 0,
      
      // Memory
      memory: 'memory' in performance ? (performance as any).memory : null,
      
      // Connection
      connection: 'connection' in navigator ? (navigator as any).connection : null,
    };
  }
}

// Usage hook
export const usePWAPerformance = () => {
  const performanceManager = PWAPerformance.getInstance();

  return {
    preloadCriticalResources: () => performanceManager.preloadCriticalResources(),
    optimizeMemoryUsage: () => performanceManager.optimizeMemoryUsage(),
    clearCache: () => performanceManager.clearCache(),
    startPerformanceMonitoring: () => performanceManager.startPerformanceMonitoring(),
    stopPerformanceMonitoring: () => performanceManager.stopPerformanceMonitoring(),
    getPerformanceMetrics: () => performanceManager.getPerformanceMetrics(),
  };
};
