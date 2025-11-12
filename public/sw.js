// Version-aware Service Worker for HashPass
// Automatically clears cache when version changes

const APP_VERSION = '1.6.20'; // This will be updated during build
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

// Fetch event - network first with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip version check requests - always fetch fresh
  if (url.pathname.includes('versions.json') || url.pathname.includes('version')) {
    event.respondWith(fetch(request));
    return;
  }

  // For other requests, try network first, then cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // If network request succeeds, cache it
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
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
function checkForVersionUpdate() {
  fetch(VERSION_CHECK_URL, { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch version');
      }
      return response.json();
    })
    .then((data) => {
      const latestVersion = data.currentVersion;
      if (latestVersion && latestVersion !== APP_VERSION) {
        console.log('[SW] Version mismatch detected! Current:', APP_VERSION, 'Latest:', latestVersion);
        // Clear all caches and reload
        caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              console.log('[SW] Clearing cache due to version update:', cacheName);
              return caches.delete(cacheName);
            })
          );
        }).then(() => {
          // Notify all clients to reload
          return self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'VERSION_UPDATE',
                currentVersion: APP_VERSION,
                latestVersion: latestVersion
              });
            });
          });
        });
      }
    })
    .catch((err) => {
      console.warn('[SW] Version check failed:', err);
    });
}

// DISABLED: Version checking on activation to prevent reload loops
// self.addEventListener('activate', (event) => {
//   event.waitUntil(
//     checkForVersionUpdate()
//   );
// });

// DISABLED: Periodic version check to prevent reload loops
// setInterval(checkForVersionUpdate, VERSION_CHECK_INTERVAL);

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CHECK_VERSION') {
    checkForVersionUpdate();
  }
});
