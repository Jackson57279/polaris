// Service Worker for Polaris IDE PWA
const CACHE_NAME = 'polaris-v1.0.0';
const OFFLINE_URL = '/offline';

// Allowed hostnames for cross-origin caching (strict whitelist)
const ALLOWED_HOSTNAMES = new Set([
  'cdn.jsdelivr.net',
  'unpkg.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
]);

// Allowed origins for caching (includes same-origin)
const ALLOWED_ORIGINS = new Set([
  self.location.origin,
]);

// Resources to cache immediately
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/offline',
];

// Cache strategies
const strategies = {
  cacheFirst: (request) => {
    return caches.match(request).then((response) => {
      if (response) {
        return response;
      }
      
      return fetch(request).then((fetchResponse) => {
        const responseClone = fetchResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        return fetchResponse;
      });
    });
  },

  networkFirst: (request) => {
    return fetch(request)
      .then((response) => {
        // Cache successful responses for offline access
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((response) => {
          if (response) {
            return response;
          }
          return caches.match(OFFLINE_URL);
        });
      });
  },

  staleWhileRevalidate: (request) => {
    return caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        return networkResponse;
      });

      return cachedResponse || fetchPromise;
    });
  }
};

// Install event - cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - apply caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Skip cross-origin requests (except for allowed CDN resources with strict hostname check)
  if (url.origin !== location.origin) {
    if (ALLOWED_HOSTNAMES.has(url.hostname)) {
      event.respondWith(strategies.cacheFirst(request));
    }
    return;
  }

  // Apply cache strategy based on request type
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(strategies.cacheFirst(request));
  } else if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/data/')
  ) {
    event.respondWith(strategies.networkFirst(request));
  } else {
    event.respondWith(strategies.staleWhileRevalidate(request));
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-actions') {
    event.waitUntil(processOfflineActions());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'Polaris IDE', body: 'New notification', tag: 'default' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || 'default',
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    vibrate: [200, 100, 200],
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data;
  let url = '/';

  if (data?.url) {
    url = data.url;
  } else if (event.action === 'open') {
    url = '/projects';
  } else if (event.action === 'new-project') {
    url = '/projects/new';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  // Verify sender origin before processing any commands
  const senderOrigin = event.origin;
  const trustedOrigin = self.location.origin;
  
  // Only accept messages from the same origin
  if (senderOrigin !== trustedOrigin) {
    console.warn('Ignoring message from untrusted origin:', senderOrigin);
    return;
  }

  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys().then((keyList) => {
          return Promise.all(keyList.map((key) => caches.delete(key)));
        })
      );
      break;
    case 'GET_CACHE_SIZE':
      event.waitUntil(
        getCacheSize().then((size) => {
          event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
        })
      );
      break;
    case 'CACHE_URLS':
      event.waitUntil(
        cacheUrls(payload.urls)
      );
      break;
    default:
      console.log('Unknown message type:', type);
  }
});

// Helper functions
async function processOfflineActions() {
  try {
    const clients = await self.clients.matchAll();
    
    for (const client of clients) {
      client.postMessage({ type: 'PROCESS_OFFLINE_QUEUE' });
    }
  } catch (error) {
    console.error('Failed to process offline actions:', error);
  }
}

async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  
  return totalSize;
}

async function cacheUrls(urls) {
  const cache = await caches.open(CACHE_NAME);
  
  await Promise.all(
    urls.map(async (url) => {
      try {
        // Validate URL and check origin before fetching
        const parsedUrl = new URL(url, self.location.origin);
        
        // Only allow same-origin or explicitly whitelisted origins
        if (!ALLOWED_ORIGINS.has(parsedUrl.origin) && !ALLOWED_HOSTNAMES.has(parsedUrl.hostname)) {
          console.warn('Skipping untrusted URL:', url);
          return;
        }
        
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (error) {
        console.warn('Failed to cache URL:', url, error);
      }
    })
  );
}

// Periodic background sync for AI suggestions
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-ai-suggestions') {
    event.waitUntil(syncAISuggestions());
  }
});

async function syncAISuggestions() {
  try {
    const clients = await self.clients.matchAll();
    
    for (const client of clients) {
      client.postMessage({ type: 'SYNC_AI_SUGGESTIONS' });
    }
  } catch (error) {
    console.error('Failed to sync AI suggestions:', error);
  }
}

// Navigation preload
self.addEventListener('navigationpreload', (event) => {
  if ('enable' in event) {
    event.enable();
  }
});
