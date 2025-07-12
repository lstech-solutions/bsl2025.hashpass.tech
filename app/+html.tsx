import { ScrollViewStyleReset } from 'expo-router/html';
import { type ReactNode } from 'react';


// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children, metadata }: { children: ReactNode, metadata?: { description?: string; title?: string; keywords?: string; author?: string; } }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        
        {/* SEO Meta Tags */}
        <meta name="description" content={metadata?.description || "YOUR EVENT - YOUR COMMUNITY - YOUR BENEFITS"} />
        <meta name="keywords" content={metadata?.keywords || "community, event, benefits, security, encryption, digital security, password protection, blockchain, wallet, loyalty"} />
        <meta name="author" content="HashPass" />
        <meta name="publisher" content="HashPass" />
        <meta name="robots" content="index, follow" />

        {/* Open Graph */}
        <meta property="og:title" content={metadata?.title || "HashPass - YOUR EVENT - YOUR COMMUNITY - YOUR BENEFITS"} />
        <meta property="og:description" content={metadata?.description || "YOUR EVENT - YOUR COMMUNITY - YOUR BENEFITS"} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://hashpass.tech" />
        <meta property="og:image" content="/og-image.png" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metadata?.title || "HashPass - YOUR EVENT - YOUR COMMUNITY - YOUR BENEFITS"} />
        <meta name="twitter:description" content={metadata?.description || "YOUR EVENT - YOUR COMMUNITY - YOUR BENEFITS"} />
        <meta name="twitter:image" content="/twitter-image.png" />

        {/* Theme Color for mobile browsers */}
        <meta name="theme-color" content="#000000" />

        {/* Link the PWA manifest file. */}
        <link rel="manifest" href="/manifest.json" />

        {/* Bootstrap the service worker. */}
        <script dangerouslySetInnerHTML={{ __html: sw }} />

        {/**
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}


const sw = `
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
        }).catch(error => {
            console.error('Service Worker registration failed:', error);
        });
    });
}
`;