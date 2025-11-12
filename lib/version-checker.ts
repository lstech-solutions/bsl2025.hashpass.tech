/**
 * Version Checker Utility
 * Checks app version against API and clears cache if mismatch detected
 */

import { Platform } from 'react-native';
import { apiClient } from './api-client';
const VERSION_STORAGE_KEY = '@hashpass:last_version_check';
const VERSION_CHECK_COOLDOWN = 60000; // 1 minute cooldown

interface VersionCheckResult {
  currentVersion: string;
  latestVersion: string;
  isMatch: boolean;
  needsUpdate: boolean;
}

/**
 * Get current app version from package.json or config
 * Uses fetch to avoid module resolution issues
 */
async function getCurrentVersion(): Promise<string> {
  // On web, fetch version from API endpoint to avoid module resolution issues
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Try to get from window.__APP_VERSION__ if set during build
    if ((window as any).__APP_VERSION__) {
      return (window as any).__APP_VERSION__;
    }
    
    // Try to fetch from API endpoint (safer than importing modules)
    try {
      const timestamp = Date.now();
      const response = await apiClient.get('/config/versions', {
        skipEventSegment: true,
        params: { t: timestamp.toString() },
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        }
      });
      if (response.success && response.data?.currentVersion) {
        return response.data.currentVersion;
      }
    } catch (e) {
      // Ignore fetch errors - will use fallback
    }
  }
  
  // Hardcoded fallback - avoids any module resolution
  return '1.6.28';
}

/**
 * Fetch latest version from API (always fresh, no cache)
 */
async function fetchLatestVersion(): Promise<string | null> {
  try {
    const timestamp = Date.now();
    const response = await apiClient.get('/config/versions', {
      skipEventSegment: true,
      params: { t: timestamp.toString() },
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

    if (!response.success) {
      console.warn('[VersionChecker] Failed to fetch version:', response.error);
      return null;
    }

    return response.data?.currentVersion || null;
  } catch (error) {
    console.error('[VersionChecker] Error fetching version:', error);
    return null;
  }
}

/**
 * Clear all caches (Service Worker and browser caches)
 */
async function clearAllCaches(): Promise<void> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  try {
    // Clear Service Worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[VersionChecker] Clearing cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }

    // Clear browser caches (localStorage, sessionStorage)
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('[VersionChecker] Failed to clear storage:', e);
    }

    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => {
          console.log('[VersionChecker] Unregistering service worker');
          return registration.unregister();
        })
      );
    }

    console.log('[VersionChecker] ✅ All caches cleared');
  } catch (error) {
    console.error('[VersionChecker] Error clearing caches:', error);
  }
}

/**
 * Check version and clear cache if mismatch
 * Returns true if cache was cleared
 */
export async function checkVersionAndClearCache(forceCheck: boolean = false): Promise<boolean> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  try {
    // Check cooldown
    if (!forceCheck) {
      const lastCheck = localStorage.getItem(VERSION_STORAGE_KEY);
      if (lastCheck) {
        const lastCheckTime = parseInt(lastCheck, 10);
        const now = Date.now();
        if (now - lastCheckTime < VERSION_CHECK_COOLDOWN) {
          console.log('[VersionChecker] Version check cooldown active');
          return false;
        }
      }
    }

    // Update last check time
    localStorage.setItem(VERSION_STORAGE_KEY, Date.now().toString());

    const currentVersion = await getCurrentVersion();
    const latestVersion = await fetchLatestVersion();

    if (!latestVersion) {
      console.warn('[VersionChecker] Could not fetch latest version');
      return false;
    }

    console.log('[VersionChecker] Current:', currentVersion, 'Latest:', latestVersion);

    if (currentVersion !== latestVersion) {
      console.warn('[VersionChecker] ⚠️ Version mismatch detected! Clearing cache...');
      await clearAllCaches();
      
      // Reload page after cache clear
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }, 1000);
      
      return true;
    }

    console.log('[VersionChecker] ✅ Version check passed');
    return false;
  } catch (error) {
    console.error('[VersionChecker] Error checking version:', error);
    return false;
  }
}

/**
 * Check version on app start (first load)
 */
export async function checkVersionOnStart(): Promise<void> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  // Use setTimeout to defer version check and avoid blocking initial render
  // This prevents path resolution issues during module loading
  setTimeout(async () => {
    try {
      // Check immediately on first load
      const wasCleared = await checkVersionAndClearCache(true);
      
      if (wasCleared) {
        // Cache was cleared, page will reload
        return;
      }

      // Also check periodically
      setInterval(() => {
        checkVersionAndClearCache(false).catch((error) => {
          console.warn('[VersionChecker] Periodic check failed:', error);
        });
      }, 5 * 60 * 1000); // Every 5 minutes
    } catch (error) {
      console.error('[VersionChecker] Version check on start failed:', error);
    }
  }, 1000); // Delay by 1 second to let app initialize
}

/**
 * Clear auth-related caches (for fixing auth flow issues)
 */
export async function clearAuthCache(): Promise<void> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  try {
    // Clear auth-related localStorage items
    const authKeys = [
      '@supabase.auth.token',
      'sb-',
      'supabase.auth.token',
    ];

    authKeys.forEach((key) => {
      try {
        // Clear all keys that start with the prefix
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith(key)) {
            localStorage.removeItem(k);
          }
        });
      } catch (e) {
        // Ignore errors
      }
    });

    // Clear sessionStorage
    try {
      sessionStorage.clear();
    } catch (e) {
      // Ignore errors
    }

    console.log('[VersionChecker] ✅ Auth cache cleared');
  } catch (error) {
    console.error('[VersionChecker] Error clearing auth cache:', error);
  }
}

