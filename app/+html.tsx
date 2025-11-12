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
    
    // DISABLED: All automatic version checking to prevent reload loops
    // Version checking function exists but is not called automatically
    
    window.addEventListener('load', () => {
        setTimeout(() => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => {
                    registration = reg;
                    console.log('✅ Service Worker registered with scope:', reg.scope);
                    
                    // DISABLED: No automatic version checking
                    // Version checks can be triggered manually if needed
                    
                    // Listen for service worker updates (but don't auto-reload)
                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    console.log('ℹ️ New service worker available. Manual refresh recommended.');
                                }
                            });
                        }
                    });
                    
                    // Listen for messages from service worker (but don't auto-reload)
                    navigator.serviceWorker.addEventListener('message', (event) => {
                        if (event.data && event.data.type === 'VERSION_UPDATE') {
                            console.log('ℹ️ Version update available. Manual refresh recommended.');
                        }
                    });
                })
                .catch(error => {
                    console.error('❌ Service Worker registration failed:', error);
                });
        }, 1000);
    });
}
`;