/**
 * Cloudflare Worker for HashPass
 * Serves static assets, handles SPA routing, and validates Cloudflare Access JWT
 */

import { jwtVerify, createRemoteJWKSet } from 'jose';

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
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cf-Access-Jwt-Assertion',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Validate Cloudflare Access JWT if Access is configured
    if (env.POLICY_AUD && env.TEAM_DOMAIN) {
      // Get the JWT from the request headers
      const token = request.headers.get('cf-access-jwt-assertion');

      // Check if token exists
      if (!token) {
        return new Response('Missing required CF Access JWT', {
          status: 403,
          headers: { 
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      try {
        // Create JWKS from your team domain
        const JWKS = createRemoteJWKSet(new URL(`${env.TEAM_DOMAIN}/cdn-cgi/access/certs`));

        // Verify the JWT
        const { payload } = await jwtVerify(token, JWKS, {
          issuer: env.TEAM_DOMAIN,
          audience: env.POLICY_AUD,
        });

        // Token is valid, continue with request processing
        // You can access user info from payload.email, payload.sub, etc.
        console.log('Authenticated user:', payload.email || payload.sub);
      } catch (error) {
        // Token verification failed
        return new Response(`Invalid token: ${error.message}`, {
          status: 403,
          headers: { 
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // Handle API routes
    // Note: For production, you may want to proxy these to your API backend
    // or use Cloudflare Workers to handle them directly
    if (pathname.startsWith('/api/')) {
      // Try to serve from assets first (if API routes are pre-built)
      if (env.ASSETS) {
        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse.status !== 404) {
          return assetResponse;
        }
      }
      
      // Return API route not found
      return new Response(
        JSON.stringify({ 
          error: 'Not Found',
          message: 'API route not found. Ensure API routes are deployed or configured.',
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
      // For SPA routing, serve index.html for all non-API routes
      // This allows client-side routing to work
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <title>HashPass</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script>
    // Redirect to index.html for SPA routing
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  </script>
</head>
<body>
  <h1>HashPass</h1>
  <p>Loading...</p>
  <p>If assets are not loading, ensure ASSETS binding is configured in wrangler.toml</p>
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

