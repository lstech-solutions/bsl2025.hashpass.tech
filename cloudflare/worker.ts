/**
 * Cloudflare Worker for HashPass
 * Handles static file serving, API routes, SPA routing, and Cloudflare Access JWT validation
 */

import { jwtVerify, createRemoteJWKSet } from 'jose';

interface Env {
  POLICY_AUD?: string;
  TEAM_DOMAIN?: string;
  [key: string]: any;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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
      } catch (error: any) {
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

