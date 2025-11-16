/**
 * Cloudflare Worker for HashPass
 * Handles static file serving, API routes, and SPA routing
 */

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
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

    // Try to serve static files first
    // In Cloudflare Pages, static assets are automatically served
    // For Workers, we need to handle this differently
    
    // Handle API routes
    if (pathname.startsWith('/api/')) {
      // For API routes, we'd need to import and call the Expo server handler
      // Since Cloudflare Workers have limitations, we'll return a simple response
      // In production, you might want to use Cloudflare Pages Functions instead
      return new Response(
        JSON.stringify({ 
          error: 'API routes should be handled by Cloudflare Pages Functions',
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

    // For SPA routing, all non-API routes should serve index.html
    // In Cloudflare Pages, this is handled automatically
    // For Workers, we need to fetch the index.html from assets
    return new Response('HashPass - Cloudflare Worker', {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};

