# Supabase Authentication Configuration

## Problem
Supabase is redirecting to `auth.hashpass.co/bsl2025.hashpass.tech` instead of the correct callback URL. This happens when:
1. Site URL is not configured or is incorrect
2. Redirect URLs don't match what we're sending
3. Supabase uses `site_url` as a fallback when `redirect_to` doesn't match allowed URLs

## Solution: Configure Supabase Dashboard

### Step 1: Set Site URL
Go to: **Supabase Dashboard → Your Project → Authentication → URL Configuration**

**Site URL** (REQUIRED):
- For development: `http://localhost:8081`
- For production: `https://bsl2025.hashpass.tech`

⚠️ **CRITICAL**: This MUST be a complete URL with protocol (http:// or https://), NOT just a domain name.

### Step 2: Configure Redirect URLs
In the same section, under **Redirect URLs**, add ONLY these URLs (remove any with `(shared)`):

**For Development:**
```
http://localhost:8081/auth/callback
```

**For Production:**
```
https://bsl2025.hashpass.tech/auth/callback
```

⚠️ **IMPORTANT**: 
- Do NOT include URLs with `(shared)` - Expo Router removes route groups from URLs
- The actual URL path is `/auth/callback`, not `/(shared)/auth/callback`
- Wildcards are allowed, so you can use: `http://localhost:*/auth/callback` if needed

### Step 3: Verify Configuration

After saving, verify:
1. **Site URL** is set to a complete URL (not empty, not just a domain)
2. **Redirect URLs** contains your callback URLs without `(shared)`
3. Both development and production URLs are included

### Current Issue

The current configuration has:
- ❌ Site URL: Empty or incorrect
- ❌ Redirect URLs with `(shared)` which won't work

### Correct Configuration

**Site URL:**
```
https://bsl2025.hashpass.tech
```
(or `http://localhost:8081` for development)

**Redirect URLs:**
```
https://bsl2025.hashpass.tech/auth/callback
http://localhost:8081/auth/callback
```

## Why This Fixes The Problem

When Supabase processes OAuth redirects:
1. It checks if the `redirect_to` parameter matches an allowed URL
2. If it matches, it uses that URL
3. If it doesn't match OR if `redirect_to` is missing, it uses `site_url` + the path from `site_url`
4. If `site_url` is empty or just a domain (like `bsl2025.hashpass.tech`), it treats it as a relative path on the auth domain (`auth.hashpass.co/bsl2025.hashpass.tech`)

By setting:
- **Site URL** to a complete URL (`https://bsl2025.hashpass.tech`)
- **Redirect URLs** to match exactly what we send (`/auth/callback`)

Supabase will correctly redirect to your callback URL instead of using the auth domain.

