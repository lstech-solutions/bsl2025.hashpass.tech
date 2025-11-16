/**
 * Cloudflare Worker for HashPass
 * Serves static assets and handles SPA routing
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // For API routes, return 404 (these should be handled by Pages Functions)
    if (pathname.startsWith('/api/')) {
      return new Response(
        JSON.stringify({ 
          error: 'Not Found',
          message: 'API routes should be handled by Cloudflare Pages Functions',
          path: pathname 
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // For all other routes, try to serve from assets
    // In Cloudflare Pages, static files are served automatically
    // This worker is mainly for handling SPA routing
    try {
      // Try to get the file from the assets
      // For Cloudflare Pages, this would be handled automatically
      // For Workers, we need to use the ASSETS binding
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }
      
      // Fallback: return a simple HTML response
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <title>HashPass</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <h1>HashPass</h1>
  <p>If you're seeing this, static assets are not properly configured.</p>
  <p>For Cloudflare Pages, ensure you're using Pages deployment, not Workers.</p>
  <p>Path: ${pathname}</p>
</body>
</html>`,
        {
          status: 200,
          headers: {
            'Content-Type': 'text/html',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Internal Server Error', message: error.message }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};

