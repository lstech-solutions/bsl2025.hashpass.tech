# Cloudflare Deployment Guide

## Problem: 404 Error on Workers URL

If you're getting a 404 error on `https://hashpass.hidden-queen-ebdc.workers.dev/`, it's because:

1. **You're deploying to Cloudflare Workers** (workers.dev domain)
2. **But the configuration is set up for Cloudflare Pages** (which uses a different deployment method)

## Solution: Use Cloudflare Pages (Recommended)

Cloudflare Pages is better suited for static sites with API routes. Here's how to fix it:

### Option 1: Deploy to Cloudflare Pages (Recommended)

1. **Build your project:**
   ```bash
   npm run build:web
   ```

2. **Deploy to Cloudflare Pages:**
   ```bash
   npx wrangler pages deploy ./dist/client --project-name=hashpass
   ```

3. **Or use the Cloudflare Dashboard:**
   - Go to Cloudflare Dashboard → Pages
   - Create a new project or connect your Git repository
   - Set build command: `npm run build:web`
   - Set output directory: `dist/client`

### Option 2: Use Cloudflare Workers (If you must)

If you need to use Workers instead of Pages:

1. **Update `wrangler.toml`:**
   ```toml
   # Comment out the [site] section
   # [site]
   # bucket = "./dist/client"
   
   # Uncomment the Worker configuration
   main = "./cloudflare/worker.js"
   compatibility_flags = ["nodejs_compat"]
   ```

2. **Deploy:**
   ```bash
   npx wrangler deploy
   ```

**Note:** Workers have limitations for serving static files. Pages is recommended for static sites.

## Current Configuration

The `wrangler.toml` is currently configured for **Cloudflare Pages** (using `[site]` section).

To deploy:
```bash
npx wrangler pages deploy ./dist/client
```

## API Routes

For API routes (`/api/*`), Cloudflare Pages Functions automatically handles routes in:
- `dist/client/_expo/functions/api/**/*`

These are automatically deployed with Pages and don't need separate configuration.

