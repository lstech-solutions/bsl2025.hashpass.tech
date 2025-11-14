import { createClient } from '@supabase/supabase-js';

// This client is specifically for server-side operations
// Only use this in API routes/server-side code
// DO NOT import this in client-side components - use lib/supabase.ts instead

// Get environment variables (only available at runtime)
const supabaseUrl = typeof process !== 'undefined' ? (process.env.EXPO_PUBLIC_SUPABASE_URL as string) : undefined;
const supabaseServiceKey = typeof process !== 'undefined' ? (process.env.SUPABASE_SERVICE_ROLE_KEY as string) : undefined;

// Lazy initialization - only create client when actually used
let _supabaseServer: ReturnType<typeof createClient> | null = null;

function getSupabaseServer() {
  // Check if we're in a browser/client environment
  const isClient = typeof window !== 'undefined';
  
  // If we're in client environment, this should not be used
  if (isClient) {
    console.error('⚠️ ERROR: supabase-server.ts is being imported in client-side code!');
    console.error('This file should ONLY be used in server-side API routes.');
    console.error('For client-side code, use lib/supabase.ts instead.');
    throw new Error('supabase-server.ts should only be used in server-side API routes. For client-side code, use lib/supabase.ts instead.');
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    const missingVars = [];
    if (!supabaseUrl) missingVars.push('EXPO_PUBLIC_SUPABASE_URL');
    if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
    
    const errorMsg = `Missing Supabase environment variables: ${missingVars.join(', ')}. ` +
                     `Please ensure these are set in your production environment. ` +
                     `Current values: EXPO_PUBLIC_SUPABASE_URL=${supabaseUrl ? 'SET' : 'MISSING'}, ` +
                     `SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceKey ? 'SET' : 'MISSING'}`;
    
    console.error('❌ Supabase Server Configuration Error:', errorMsg);
    throw new Error(errorMsg);
  }

  if (!_supabaseServer) {
    // Custom fetch function to ensure apikey header is always included
    // This is necessary when using custom domains like auth.hashpass.co
    const customFetch = (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers);
      
      // Ensure apikey header is always present for Supabase API requests
      // The Supabase client should add this automatically, but custom domains may not work correctly
      if (!headers.has('apikey') && supabaseServiceKey) {
        headers.set('apikey', supabaseServiceKey);
      }
      
      return fetch(url, {
        ...options,
        headers
      });
    };

    _supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'apikey': supabaseServiceKey
        },
        fetch: customFetch
      }
    });
  }

  return _supabaseServer;
}

// Check if we're in a browser/client environment BEFORE creating the Proxy
const isBrowser = typeof window !== 'undefined';

// Export as a Proxy to allow lazy initialization
// If we're in a browser, export a dummy that throws helpful error
// If we're in server, export the real client
export const supabaseServer = isBrowser
  ? new Proxy({} as ReturnType<typeof createClient>, {
      get(_target, prop) {
        // In browser, throw helpful error
        throw new Error(
          'supabase-server.ts should only be used in server-side API routes. ' +
          'For client-side code, use lib/supabase.ts instead. ' +
          `Attempted to access: ${String(prop)}`
        );
      }
    })
  : new Proxy({} as ReturnType<typeof createClient>, {
      get(_target, prop) {
        const client = getSupabaseServer();
        const value = (client as any)[prop];
        
        // If it's a function, bind it to the client
        if (typeof value === 'function') {
          return value.bind(client);
        }
        
        return value;
      }
    });
