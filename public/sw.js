// Version-aware Service Worker for HashPass
// Automatically clears cache when version changes

const APP_VERSION = '1.6.43'; // This will be updated during build
const CACHE_NAME = `hashpass-v${APP_VERSION}`;
const VERSION_CHECK_URL = '/api/config/versions';
const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker version:', APP_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache opened:', CACHE_NAME);
        return cache.addAll([
          '/',
          '/index.html',
          '/manifest.json'
        ]).catch((err) => {
          console.warn('[SW] Some resources failed to cache:', err);
        });
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker version:', APP_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete all caches that don't match current version
          if (cacheName !== CACHE_NAME && cacheName.startsWith('hashpass-')) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - network first with cache fallback and size limits
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip version check requests - always fetch fresh
  if (url.pathname.includes('versions.json') || url.pathname.includes('version')) {
    event.respondWith(fetch(request));
    return;
  }

  // Skip large files from caching (images, videos, etc.)
  const isLargeFile = url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|pdf)$/i);
  const maxCacheSize = 5 * 1024 * 1024; // 5MB limit

  // For other requests, try network first, then cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache if response is OK and not too large
        if (response && response.status === 200) {
          // Check content-length header if available
          const contentLength = response.headers.get('content-length');
          const size = contentLength ? parseInt(contentLength, 10) : 0;
          
          // Don't cache large files or images (they should use browser cache)
          if (!isLargeFile && (size === 0 || size < maxCacheSize)) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache).catch((err) => {
                console.warn('[SW] Failed to cache:', request.url, err);
              });
            });
          }
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then((response) => {
          if (response) {
            return response;
          }
          // If cache also fails, return offline page or error
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

// Check for version updates periodically
let versionCheckInProgress = false;
let lastVersionCheck = 0;
const VERSION_CHECK_COOLDOWN = 60000; // 1 minute cooldown between checks

function checkForVersionUpdate() {
  // Prevent multiple simultaneous checks
  if (versionCheckInProgress) {
    return;
  }
  
  // Cooldown to prevent excessive checks
  const now = Date.now();
  if (now - lastVersionCheck < VERSION_CHECK_COOLDOWN) {
    return;
  }
  
  versionCheckInProgress = true;
  lastVersionCheck = now;
  
  // Add timestamp to prevent caching
  const timestamp = Date.now();
  fetch(`${VERSION_CHECK_URL}?t=${timestamp}`, { 
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch version');
      }
      return response.json();
    })
    .then((data) => {
      const latestVersion = data && data.currentVersion ? data.currentVersion : null;
      if (!latestVersion) {
        console.warn('[SW] No version found in response');
        versionCheckInProgress = false;
        return;
      }
      
      if (latestVersion !== APP_VERSION) {
        console.log('[SW] Version mismatch detected! Current:', APP_VERSION, 'Latest:', latestVersion);
        // Clear all caches first for better resiliency
        return caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              console.log('[SW] Clearing cache due to version update:', cacheName);
              return caches.delete(cacheName);
            })
          );
        }).then(() => {
          // Notify all clients about the update (show notification)
          return self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'VERSION_UPDATE_AVAILABLE',
                currentVersion: APP_VERSION,
                latestVersion: latestVersion,
                action: 'reload' // Auto-reload for optimistic updates
              });
            });
            return clients;
          });
        }).then((clients) => {
          // Auto-reload after a short delay to show notification
          setTimeout(() => {
            clients.forEach((client) => {
              if (client && 'reload' in client) {
                client.reload();
              } else if (client && 'navigate' in client) {
                client.navigate(client.url);
              }
            });
          }, 2000); // 2 second delay to show notification
          versionCheckInProgress = false;
        }).catch((err) => {
          console.warn('[SW] Failed to notify clients:', err);
          versionCheckInProgress = false;
        });
      } else {
        console.log('[SW] Version check: up to date (', APP_VERSION, ')');
        versionCheckInProgress = false;
      }
    })
    .catch((err) => {
      console.warn('[SW] Version check failed:', err);
      versionCheckInProgress = false;
    });
}

// Check for version updates on activation (with safeguards)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName.startsWith('hashpass-')) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Check for version updates immediately (no delay for first check)
      checkForVersionUpdate().catch((err) => {
        console.warn('[SW] Initial version check failed:', err);
      })
    ]).then(() => {
      return self.clients.claim();
    })
  );
});

// Periodic version check (with safeguards)
setInterval(() => {
  // Only check if not already in progress and enough time has passed
  const now = Date.now();
  if (!versionCheckInProgress && (now - lastVersionCheck >= VERSION_CHECK_COOLDOWN)) {
    checkForVersionUpdate();
  }
}, VERSION_CHECK_INTERVAL);

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CHECK_VERSION') {
    checkForVersionUpdate();
  }
});

