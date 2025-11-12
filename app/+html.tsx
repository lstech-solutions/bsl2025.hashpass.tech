import { ScrollViewStyleReset } from 'expo-router/html';
import { type ReactNode } from 'react';


// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children, metadata }: { children: ReactNode, metadata?: { description?: string; title?: string; keywords?: string; author?: string; viewport?: string; } }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <title>{metadata?.title || "HashPass"}</title>
        <meta name="viewport" content={metadata?.viewport || "width=device-width, initial-scale=1, shrink-to-fit=no, user-scalable=no, viewport-fit=cover"} />
        <meta name="description" content={metadata?.description || "YOUR EVENT - YOUR COMMUNITY - YOUR BENEFITS"} />
        <meta name="keywords" content={metadata?.keywords || "community, event, benefits, security, encryption, digital security, password protection, blockchain, wallet, loyalty"} />
        <meta name="author" content="HashPass" />
        <meta name="publisher" content="HashPass" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content={metadata?.title || "HashPass - YOUR EVENT - YOUR COMMUNITY - YOUR BENEFITS"} />
        <meta property="og:description" content={metadata?.description || "YOUR EVENT - YOUR COMMUNITY - YOUR BENEFITS"} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://hashpass.tech" />
        <meta property="og:image" content="/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metadata?.title || "HashPass - YOUR EVENT - YOUR COMMUNITY - YOUR BENEFITS"} />
        <meta name="twitter:description" content={metadata?.description || "YOUR EVENT - YOUR COMMUNITY - YOUR BENEFITS"} />
        <meta name="twitter:image" content="/twitter-image.png" />
        <meta name="theme-color" content="#000000" />
        <link rel="manifest" href="/manifest.json" />

        {/* Bootstrap the service worker. */}
        <script dangerouslySetInnerHTML={{ __html: sw }} />

        {/**
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

      </head>
      <body>{children}</body>
    </html>
  );
}


const sw = `
if ('serviceWorker' in navigator) {
    let registration;
    let isReloading = false;
    let versionCheckTimeout = null;
    let lastReloadTime = 0;
    const RELOAD_COOLDOWN = 10000; // 10 seconds cooldown between reloads
    
    // Function to check for version updates
    function checkVersionUpdate() {
        // Prevent multiple simultaneous checks
        if (versionCheckTimeout) {
            return;
        }
        
        // Prevent reload loops
        if (isReloading) {
            return;
        }
        
        versionCheckTimeout = setTimeout(() => {
            versionCheckTimeout = null;
        }, 2000);
        
        fetch('/api/config/versions', { cache: 'no-store' })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch version');
                }
                return response.json();
            })
            .then(data => {
                const currentVersion = localStorage.getItem('app_version');
                const latestVersion = data && data.currentVersion ? data.currentVersion : null;
                
                // Validate version exists
                if (!latestVersion) {
                    console.warn('⚠️ No version found in response');
                    return;
                }
                
                // First time - store current version
                if (!currentVersion) {
                    localStorage.setItem('app_version', latestVersion);
                    console.log('✅ Stored initial version:', latestVersion);
                    return;
                }
                
                // Only reload if versions actually differ and cooldown has passed
                if (currentVersion !== latestVersion) {
                    const now = Date.now();
                    if (now - lastReloadTime < RELOAD_COOLDOWN) {
                        console.log('⏳ Reload cooldown active, skipping reload');
                        return;
                    }
                    
                    console.log('🔄 Version update detected! Current:', currentVersion, 'Latest:', latestVersion);
                    
                    // Set reload flag to prevent loops
                    isReloading = true;
                    lastReloadTime = now;
                    
                    // Clear all caches
                    if ('caches' in window) {
                        caches.keys().then(cacheNames => {
                            return Promise.all(
                                cacheNames.map(cacheName => {
                                    console.log('🗑️ Clearing cache:', cacheName);
                                    return caches.delete(cacheName);
                                })
                            );
                        }).then(() => {
                            // Unregister service worker
                            if (registration) {
                                registration.unregister().then(() => {
                                    console.log('✅ Service worker unregistered');
                                    // Reload page to get new version
                                    setTimeout(() => {
                                        window.location.reload();
                                    }, 500);
                                });
                            } else {
                                setTimeout(() => {
                                    window.location.reload();
                                }, 500);
                            }
                        }).catch(err => {
                            console.error('❌ Error clearing caches:', err);
                            isReloading = false;
                        });
                    } else {
                        setTimeout(() => {
                            window.location.reload();
                        }, 500);
                    }
                }
            })
            .catch(err => {
                console.warn('⚠️ Version check failed:', err);
                // Don't reload on error
            });
    }
    
    window.addEventListener('load', () => {
        // Delay initial check to prevent immediate reloads
        setTimeout(() => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => {
                    registration = reg;
                    console.log('✅ Service Worker registered with scope:', reg.scope);
                    
                    // Check for updates after a delay (5 seconds)
                    setTimeout(() => {
                        checkVersionUpdate();
                    }, 5000);
                    
                    // Check for updates every 5 minutes
                    setInterval(checkVersionUpdate, 5 * 60 * 1000);
                    
                    // Listen for service worker updates
                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    console.log('🔄 New service worker available');
                                    // Delay check to prevent immediate reload
                                    setTimeout(() => {
                                        checkVersionUpdate();
                                    }, 5000);
                                }
                            });
                        }
                    });
                    
                    // Listen for messages from service worker
                    navigator.serviceWorker.addEventListener('message', (event) => {
                        if (event.data && event.data.type === 'VERSION_UPDATE') {
                            console.log('🔄 Version update message received:', event.data);
                            // Delay check to prevent immediate reload
                            setTimeout(() => {
                                checkVersionUpdate();
                            }, 2000);
                        }
                    });
                })
                .catch(error => {
                    console.error('❌ Service Worker registration failed:', error);
                });
        }, 2000);
    });
    
    // Check for version updates on focus (with delay and cooldown)
    window.addEventListener('focus', () => {
        setTimeout(() => {
            const now = Date.now();
            if (now - lastReloadTime > RELOAD_COOLDOWN) {
                checkVersionUpdate();
            }
        }, 3000);
    });
}
`;