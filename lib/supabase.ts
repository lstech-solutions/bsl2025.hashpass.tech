import { createClient, type Session, type User } from '@supabase/supabase-js';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { Platform } from 'react-native';

let storage: any;

if (Platform.OS === 'web') {
  // For web, use localStorage if window is defined (client-side browser)
  // Otherwise, for SSR (Node.js environment), use a dummy storage
  storage = typeof window !== 'undefined' ? window.localStorage : {
    getItem: async (_key: string) => null,
    setItem: async (_key: string, _value: string) => {},
    removeItem: async (_key: string) => {},
  };
} else {
  // For native (iOS, Android), use lazy initialization with dynamic import
  // This prevents AsyncStorage from being evaluated in Node.js environments
  // if it has top-level dependencies on browser globals.
  // Initialize with a proxy that loads AsyncStorage on first access
  let asyncStorage: any = null;
  const loadAsyncStorage = async () => {
    if (!asyncStorage) {
      const AsyncStorageModule = await import('@react-native-async-storage/async-storage');
      asyncStorage = AsyncStorageModule.default;
    }
    return asyncStorage;
  };
  
  storage = {
    getItem: async (key: string) => {
      const AsyncStorage = await loadAsyncStorage();
      return AsyncStorage.getItem(key);
    },
    setItem: async (key: string, value: string) => {
      const AsyncStorage = await loadAsyncStorage();
      return AsyncStorage.setItem(key, value);
    },
    removeItem: async (key: string) => {
      const AsyncStorage = await loadAsyncStorage();
      return AsyncStorage.removeItem(key);
    },
  };
}


/**
 * Creates a session from a URL, typically after OAuth redirect
 * @param url The URL containing the authentication data
 * @returns The session data if successful
 */
export const createSessionFromUrl = async (url: string): Promise<{
  session: Session | null;
  user: User | null;
  error: Error | null;
}> => {
  console.log('🔍 Creating session from URL:', url.substring(0, 100) + '...');
  
  try {
    // Parse URL parameters
    const { params, errorCode } = QueryParams.getQueryParams(url);
    
    console.log('📋 URL params:', {
      hasAccessToken: !!params.access_token,
      hasRefreshToken: !!params.refresh_token,
      hasCode: !!params.code,
      errorCode,
      paramsKeys: Object.keys(params),
    });

    // Handle OAuth errors
    if (errorCode) {
      console.error('❌ OAuth error code:', errorCode);
      
      // Handle specific error cases that might still have valid sessions
      if (errorCode === 'server_error' || errorCode.includes('email')) {
        console.log('ℹ️ Checking for existing session despite error...');
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('✅ Found existing session despite error');
          return { session, user: null, error: null };
        }
      }
      
      throw new Error(`OAuth error: ${errorCode}`);
    }

    const { access_token, refresh_token, code } = params;

    // Method 1: Direct token setting (preferred)
    if (access_token) {
      console.log('🎫 Setting session with access token...');
      
      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token: refresh_token || '',
      });

      if (error) {
        console.error('❌ Error setting session:', error);
        
        // Check if session was created despite error
        const { data: { session: fallbackSession } } = await supabase.auth.getSession();
        if (fallbackSession) {
          console.log('✅ Session exists despite setSession error');
          return { session: fallbackSession, user: null, error: null };
        }
        
        throw error;
      }

      console.log('✅ Session created successfully with tokens');
      return { session: data.session, user: null, error: null };
    }

    // Method 2: Authorization code exchange
    if (code) {
      
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('❌ Error exchanging code:', error);
        throw error;
      }
      
      return { session: data.session, user: null, error: null };
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      return { session, user: null, error: null };
    }

    return { session: null, user: null, error: null };

  } catch (error: any) {
    console.error('❌ Error in createSessionFromUrl:', error);
    
    // Last resort: check for any existing session
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        return { session, user: null, error: null };
      }
    } catch (fallbackError) {
      console.error('❌ Fallback session check failed:', fallbackError);
    }
    
    throw error;
  }
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
