import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, Image, TouchableOpacity, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createSessionFromUrl, supabase } from '../../../lib/supabase';
import { Check, AlertCircle, Info } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Session } from '@supabase/supabase-js';
import { useTranslation } from '../../../i18n/i18n';

export default function AuthCallback() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { t } = useTranslation('common');
    const [status, setStatus] = useState<'processing' | 'success' | 'warning' | 'error' | 'show_download'>('processing');
    const [message, setMessage] = useState('Processing authentication...');
    const [shouldRedirect, setShouldRedirect] = useState(false);
    
    // CRITICAL: Check and redirect immediately if on wrong domain
    // This runs synchronously during render to catch Supabase redirects ASAP
    // ONLY runs if we're on auth.hashpass.co (wrong domain)
    if (Platform.OS === 'web' && typeof window !== 'undefined' && !shouldRedirect) {
        const currentHost = window.location.host;
        const currentPath = window.location.pathname;
        const hashFragment = window.location.hash;
        
        // ONLY redirect if we're on auth.hashpass.co (wrong domain)
        // If we're already on the correct domain (bsl2025.hashpass.tech), don't redirect
        const isIncorrectRedirect = currentHost === 'auth.hashpass.co' && 
                                   (currentPath.includes('hashpass.tech') || 
                                    currentPath.match(/\/[a-z0-9-]+\.hashpass\.tech/i));
        
        // Only proceed if we're on the wrong domain AND have auth tokens
        if (isIncorrectRedirect && hashFragment && hashFragment.includes('access_token')) {
            console.error('❌ [IMMEDIATE] Detected incorrect Supabase redirect!');
            console.error('❌ Current URL:', window.location.href.substring(0, 200));
            
            // Determine correct origin - prioritize localStorage (has the actual origin from OAuth flow)
            let correctOrigin = '';
            
            // Method 1: Try localStorage FIRST (most reliable - has the actual origin from OAuth)
            // This will be http://localhost:8081 in development, https://bsl2025.hashpass.tech in production
            try {
                const stored = localStorage.getItem('oauth_redirect_origin');
                if (stored) {
                    correctOrigin = stored;
                    console.log('📍 [IMMEDIATE] Using stored origin from OAuth flow:', correctOrigin);
                }
            } catch (e) {
                console.warn('⚠️ [IMMEDIATE] Could not access localStorage');
            }
            
            // Check if we're in development mode based on stored origin or environment
            const isDevelopment = correctOrigin?.includes('localhost') || 
                                correctOrigin?.includes('127.0.0.1') || 
                                correctOrigin?.includes(':8081') ||
                                (typeof process !== 'undefined' && process.env.NODE_ENV === 'development');
            
            // If stored origin is production but we're in development, force localhost
            if (isDevelopment && correctOrigin && correctOrigin.includes('hashpass.tech')) {
                console.warn('⚠️ [IMMEDIATE] Stored origin is production in development, forcing localhost:8081');
                correctOrigin = 'http://localhost:8081';
            }
            
            // Method 2: If in development and no stored origin, force localhost
            if (!correctOrigin && isDevelopment) {
                correctOrigin = 'http://localhost:8081';
                console.log('📍 [IMMEDIATE] Development mode detected, using localhost:8081:', correctOrigin);
            }
            
            // Method 3: If no stored origin, extract from path (fallback for production)
            if (!correctOrigin) {
                const domainMatch = currentPath.match(/([a-z0-9-]+\.hashpass\.tech)/i);
                if (domainMatch) {
                    correctOrigin = `https://${domainMatch[1]}`;
                    console.log('📍 [IMMEDIATE] Extracted origin from path (fallback):', correctOrigin);
                }
            }
            
            if (correctOrigin) {
                let redirectUrl = `${correctOrigin}/auth/callback`;
                
                // Try to get apikey
                const apikey = (window as any).__SUPABASE_ANON_KEY__ || 
                              (window as any).__EXPO_PUBLIC_SUPABASE_KEY__ || '';
                if (apikey) {
                    redirectUrl += `?apikey=${encodeURIComponent(apikey)}`;
                }
                
                // Preserve hash and query params
                redirectUrl += hashFragment;
                const urlParams = new URLSearchParams(window.location.search);
                urlParams.forEach((value, key) => {
                    if (key !== 'apikey') {
                        redirectUrl += (redirectUrl.includes('?') ? '&' : '?') + 
                                      encodeURIComponent(key) + '=' + encodeURIComponent(value);
                    }
                });
                
                // CRITICAL: Only redirect if we're actually on the wrong domain
                // If we're already on the correct domain, don't redirect (prevents infinite loop)
                const currentUrl = window.location.origin + window.location.pathname;
                const targetUrl = new URL(redirectUrl);
                const targetOrigin = targetUrl.origin + targetUrl.pathname;
                
                if (currentUrl === targetOrigin && currentHost !== 'auth.hashpass.co') {
                    console.log('✅ [IMMEDIATE] Already on correct domain, skipping redirect');
                    // Don't redirect - we're already where we need to be
                } else {
                    console.log('🚀 [IMMEDIATE] Redirecting to:', redirectUrl.substring(0, 300));
                    setShouldRedirect(true);
                    // Redirect IMMEDIATELY - don't wait for React
                    window.location.replace(redirectUrl);
                }
            }
        }
    }
    
    // If redirecting, show minimal UI
    if (shouldRedirect) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                <Text style={{ color: '#fff', fontSize: 16 }}>Redirecting...</Text>
            </View>
        );
    }
    
    // Log when component mounts to verify it's being rendered
    useEffect(() => {
        console.log('🚀 AuthCallback component mounted');
        console.log('📋 Initial params:', params);
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            console.log('🌐 Current URL:', window.location.href);
            console.log('🔍 URL has code:', window.location.href.includes('code='));
            console.log('🔍 URL has access_token:', window.location.href.includes('access_token='));
            
            // CRITICAL: Check if we're on the wrong domain (Supabase redirect issue)
            // If we're on auth.hashpass.co with a path that looks like a site_url, redirect to correct callback
            const currentHost = window.location.host;
            const currentPath = window.location.pathname;
            
            // Detect if Supabase incorrectly redirected to auth.hashpass.co/{subdomain}.hashpass.tech
            // This happens when Supabase uses site_url as a relative path instead of absolute URL
            // Works with any hashpass.tech subdomain (bsl2025, event2026, etc.)
            const isIncorrectRedirect = currentHost === 'auth.hashpass.co' && 
                                       (currentPath.includes('hashpass.tech') || 
                                        currentPath.match(/\/[a-z0-9-]+\.hashpass\.tech/i));
            
            if (isIncorrectRedirect) {
                console.error('❌ Detected incorrect Supabase redirect!');
                console.error('❌ Current URL:', window.location.href.substring(0, 200));
                console.error('❌ This is a Supabase bug with custom auth domains');
                
                // Extract ALL parameters from hash (OAuth tokens are usually in hash)
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const urlParams = new URLSearchParams(window.location.search);
                
                // Check if we have auth tokens in the hash
                const hasAuthTokens = hashParams.has('access_token') || hashParams.has('code') || 
                                     window.location.hash.includes('access_token') || 
                                     window.location.hash.includes('code=');
                
                if (hasAuthTokens) {
                    console.log('✅ Found auth tokens in URL, redirecting to correct callback...');
                    
                    // Determine the correct origin - prioritize localStorage (has actual origin from OAuth)
                    let correctOrigin = '';
                    
                    // Method 1: Try localStorage FIRST (most reliable - has the actual origin from OAuth flow)
                    try {
                        const storedOrigin = localStorage.getItem('oauth_redirect_origin');
                        if (storedOrigin) {
                            correctOrigin = storedOrigin;
                            console.log('📍 Using stored origin from OAuth flow (Method 1):', correctOrigin);
                        }
                    } catch (e) {
                        console.warn('⚠️ Could not access localStorage:', e);
                    }
                    
                    // Check if we're in development mode based on stored origin or environment
                    const isDevelopment = correctOrigin?.includes('localhost') || 
                                        correctOrigin?.includes('127.0.0.1') || 
                                        correctOrigin?.includes(':8081') ||
                                        (typeof process !== 'undefined' && process.env.NODE_ENV === 'development');
                    
                    // If stored origin is production but we're in development, force localhost
                    if (isDevelopment && correctOrigin && correctOrigin.includes('hashpass.tech')) {
                        console.warn('⚠️ Stored origin is production in development, forcing localhost:8081');
                        correctOrigin = 'http://localhost:8081';
                    }
                    
                    // Method 2: If in development and no stored origin, force localhost
                    if (!correctOrigin && isDevelopment) {
                        correctOrigin = 'http://localhost:8081';
                        console.log('📍 Development mode detected, using localhost:8081 (Method 2):', correctOrigin);
                    }
                    
                    // Method 3: If no stored origin, extract from path (fallback for production)
                    if (!correctOrigin && currentPath.includes('hashpass.tech')) {
                        const domainMatch = currentPath.match(/([a-z0-9-]+\.hashpass\.tech)/i);
                        if (domainMatch) {
                            correctOrigin = `https://${domainMatch[1]}`;
                            console.log('📍 Extracted origin from path (Method 3):', correctOrigin);
                        }
                    }
                    
                    // Method 4: Try environment variable (for production only, not in development)
                    if (!correctOrigin && !isDevelopment && typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SITE_URL) {
                        correctOrigin = process.env.EXPO_PUBLIC_SITE_URL;
                        console.log('📍 Using EXPO_PUBLIC_SITE_URL (Method 4):', correctOrigin);
                    }
                    
                    // Method 4: Fallback - extract from current host or use current origin
                    if (!correctOrigin) {
                        // Try to get from current window location if available
                        if (typeof window !== 'undefined' && window.location) {
                            // If we're on a hashpass.tech subdomain, use it
                            if (window.location.hostname.includes('hashpass.tech')) {
                                correctOrigin = window.location.protocol + '//' + window.location.hostname;
                                console.log('📍 Using current hostname (Method 4):', correctOrigin);
                            } else {
                                // Fallback: try to extract from path or use a generic pattern
                                const domainMatch = currentPath.match(/([a-z0-9-]+\.hashpass\.tech)/i);
                                if (domainMatch) {
                                    correctOrigin = `https://${domainMatch[1]}`;
                                    console.log('📍 Extracted from path fallback (Method 4):', correctOrigin);
                                } else {
                                    // Last resort: use current origin
                                    correctOrigin = window.location.origin;
                                    console.log('📍 Using current origin fallback (Method 4):', correctOrigin);
                                }
                            }
                        } else {
                            // SSR fallback - extract from path
                            const domainMatch = currentPath.match(/([a-z0-9-]+\.hashpass\.tech)/i);
                            if (domainMatch) {
                                correctOrigin = `https://${domainMatch[1]}`;
                                console.log('📍 SSR fallback from path (Method 4):', correctOrigin);
                            }
                        }
                    }
                    
                    
                    // Build redirect URL with hash fragment (tokens are in hash)
                    // The hash fragment should be preserved as-is since it contains all the auth tokens
                    let redirectUrl = `${correctOrigin}/auth/callback`;
                    
                    // Add apikey as query parameter
                    const supabaseAnonKey = process.env?.EXPO_PUBLIC_SUPABASE_KEY || 
                                          (typeof window !== 'undefined' && (window as any).__SUPABASE_ANON_KEY__) ||
                                          (typeof window !== 'undefined' && (window as any).__EXPO_PUBLIC_SUPABASE_KEY__);
                    if (supabaseAnonKey) {
                        redirectUrl += `?apikey=${encodeURIComponent(supabaseAnonKey)}`;
                    }
                    
                    // Preserve the entire hash fragment (contains all OAuth tokens)
                    if (window.location.hash) {
                        redirectUrl += window.location.hash;
                    }
                    
                    // Also copy any query params from URL (not hash)
                    urlParams.forEach((value, key) => {
                        if (key !== 'apikey') {
                            const separator = redirectUrl.includes('?') ? '&' : '?';
                            redirectUrl += `${separator}${key}=${encodeURIComponent(value)}`;
                        }
                    });
                    
                    // CRITICAL: Only redirect if we're actually on the wrong domain
                    // If we're already on the correct domain, don't redirect (prevents infinite loop)
                    const currentUrl = window.location.origin + window.location.pathname;
                    const targetUrlObj = new URL(redirectUrl);
                    const targetOrigin = targetUrlObj.origin + targetUrlObj.pathname;
                    
                    if (currentUrl === targetOrigin && currentHost !== 'auth.hashpass.co') {
                        console.log('✅ Already on correct domain, skipping redirect to prevent loop');
                        // Don't redirect - we're already where we need to be, just process the callback
                    } else {
                        console.log('🔧 Redirecting to correct callback URL:', redirectUrl.substring(0, 300));
                        console.log('🔧 Hash fragment preserved:', window.location.hash.substring(0, 100) + '...');
                        
                        // Use replace to avoid adding to history - do this IMMEDIATELY
                        // Use setTimeout(0) to ensure this runs after any other redirect attempts
                        setTimeout(() => {
                            window.location.replace(redirectUrl);
                        }, 0);
                        return;
                    }
                } else {
                    console.warn('⚠️ No auth tokens found in URL, cannot redirect');
                    console.warn('📍 Full hash:', window.location.hash.substring(0, 200));
                }
            }
        }
    }, []);
    
    // Get returnTo parameter from URL for proper redirect
    const getRedirectPath = () => {
        // Check URL params first (from query string)
        const returnTo = params.returnTo as string | undefined;
        if (returnTo) {
            try {
                const decoded = decodeURIComponent(returnTo);
                // CRITICAL: Prevent redirecting to callback route (infinite loop)
                if (decoded.includes('/auth/callback')) {
                    console.warn('⚠️ returnTo points to callback route, using dashboard instead');
                    return '/(shared)/dashboard/explore';
                }
                return decoded;
            } catch (e) {
                console.warn('Failed to decode returnTo parameter:', e);
            }
        }
        
        // Check if returnTo is in the URL hash or search params
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const returnToParam = urlParams.get('returnTo') || hashParams.get('returnTo');
                if (returnToParam) {
                    const decoded = decodeURIComponent(returnToParam);
                    // CRITICAL: Prevent redirecting to callback route (infinite loop)
                    if (decoded.includes('/auth/callback')) {
                        console.warn('⚠️ returnTo in URL points to callback route, using dashboard instead');
                        return '/(shared)/dashboard/explore';
                    }
                    return decoded;
                }
            } catch (e) {
                console.warn('Failed to parse returnTo from URL:', e);
            }
        }
        
        return '/(shared)/dashboard/explore';
    };
    
    // Helper to safely navigate - prevents redirect loops
    const safeNavigate = (path: string) => {
        // CRITICAL: Never redirect to callback route (infinite loop)
        if (path.includes('/auth/callback')) {
            console.warn('⚠️ Attempted to redirect to callback route, redirecting to dashboard instead');
            router.replace('/(shared)/dashboard/explore' as any);
        } else {
            router.replace(path as any);
        }
    };
    
    // Processing guard to prevent duplicate processing
    const isProcessingRef = useRef(false);
    const hasNavigatedRef = useRef(false);
    
    // Listen for auth state changes to catch SIGNED_IN events
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log(`🔐 Callback auth event: ${event}, user: ${session?.user?.id || 'none'}`);
            
            // Handle INITIAL_SESSION event - might have session even if URL has no tokens
            if (event === 'INITIAL_SESSION') {
                console.log('🔍 INITIAL_SESSION event detected');
                if (session?.user && !hasNavigatedRef.current) {
                    console.log('✅ INITIAL_SESSION event with user detected - session may have been created server-side');
                    console.log('👤 User ID:', session.user.id);
                    
                    // Verify the session is valid
                    supabase.auth.getUser().then(({ data: { user }, error }) => {
                        if (user && !error && user.id === session.user.id) {
                            console.log('✅ Session verified from INITIAL_SESSION event');
                            hasNavigatedRef.current = true;
                            setStatus('success');
                            setMessage('✅ Authentication successful!');
                            const redirectPath = getRedirectPath();
                            safeNavigate(redirectPath);
                            isProcessingRef.current = false;
                        } else {
                            console.warn('⚠️ INITIAL_SESSION user verification failed:', error?.message);
                        }
                    });
                } else if (!session?.user) {
                    console.warn('⚠️ INITIAL_SESSION event but no session/user found');
                    console.warn('⚠️ This usually means Supabase redirected without the OAuth code');
                    console.warn('⚠️ Check Supabase Redirect URLs configuration');
                    // Try to manually retrieve session after a short delay
                    setTimeout(async () => {
                        try {
                            const { data: { session: manualSession }, error: sessionError } = await supabase.auth.getSession();
                            if (manualSession && manualSession.user) {
                                console.log('✅ Found session via manual getSession after INITIAL_SESSION:', manualSession.user.id);
                                if (!hasNavigatedRef.current) {
                                    hasNavigatedRef.current = true;
                                    setStatus('success');
                                    setMessage('✅ Authentication successful!');
                                    const redirectPath = getRedirectPath();
                                    safeNavigate(redirectPath);
                                    isProcessingRef.current = false;
                                }
                                return;
                            }
                            
                            const { data: { user: manualUser }, error: userError } = await supabase.auth.getUser();
                            if (manualUser && !userError) {
                                console.log('✅ Found user via manual getUser after INITIAL_SESSION:', manualUser.id);
                                if (!hasNavigatedRef.current) {
                                    hasNavigatedRef.current = true;
                                    setStatus('success');
                                    setMessage('✅ Authentication successful!');
                                    const redirectPath = getRedirectPath();
                                    safeNavigate(redirectPath);
                                    isProcessingRef.current = false;
                                }
                            }
                        } catch (manualError: any) {
                            console.warn('⚠️ Manual session retrieval failed after INITIAL_SESSION:', manualError?.message);
                        }
                    }, 1000);
                }
            }
            
            // If we get a SIGNED_IN event with a session, navigate immediately
            if (event === 'SIGNED_IN' && session?.user && !hasNavigatedRef.current) {
                console.log('✅ SIGNED_IN event detected in callback, navigating to dashboard');
                hasNavigatedRef.current = true;
                const redirectPath = getRedirectPath();
                safeNavigate(redirectPath);
            }
        });
        
        return () => {
            subscription.unsubscribe();
        };
    }, [router]);

    // Helper function to verify session establishment with retries
    // More lenient - accepts session if getSession() succeeds, even if getUser() fails temporarily
    const verifySessionWithRetries = async (maxRetries: number = 3, delayMs: number = 500): Promise<Session> => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`🔄 Verifying session establishment (attempt ${attempt}/${maxRetries})...`);
            
            // Wait before checking (longer delay on first attempt)
            const waitTime = attempt === 1 ? delayMs : delayMs * attempt;
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
            // First check if session exists
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (session && !sessionError && session.user) {
                // Session exists and has user - this is sufficient
                // Try to verify with getUser, but don't fail if it errors (might be temporary network issue)
                try {
                    const { data: { user }, error: userError } = await supabase.auth.getUser();
                    if (user && !userError && user.id === session.user.id) {
                        console.log(`✅ Session established and verified successfully on attempt ${attempt}`);
                        return session;
                    } else if (userError) {
                        // getUser failed, but session exists - accept it anyway (might be temporary)
                        console.log(`⚠️ getUser failed but session exists, accepting session (attempt ${attempt})`);
                        console.log(`⚠️ getUser error:`, userError.message);
                        return session;
                    }
                } catch (getUserError: any) {
                    // getUser threw an error, but session exists - accept it anyway
                    console.log(`⚠️ getUser exception but session exists, accepting session (attempt ${attempt})`);
                    console.log(`⚠️ getUser exception:`, getUserError?.message);
                    return session;
                }
                
                // If we get here, session exists but user doesn't match - this is unusual but accept session
                console.log(`⚠️ Session user mismatch but accepting session (attempt ${attempt})`);
                return session;
            } else {
                if (attempt < maxRetries) {
                    console.log(`⚠️ Session not yet established, retrying in ${waitTime}ms... (${attempt}/${maxRetries})`);
                }
            }
        }
        
        // Last attempt - check one more time and be more lenient
        const { data: { session: finalSession }, error: finalError } = await supabase.auth.getSession();
        if (finalSession && finalSession.user && !finalError) {
            console.log(`✅ Found session on final attempt, accepting it`);
            return finalSession;
        }
        
        throw new Error('Session not established after multiple verification attempts');
    };

    const handleAuthCallback = async () => {
        // Set processing flag immediately
        if (isProcessingRef.current) {
            console.log('⏭️ Already processing auth callback, skipping');
            return;
        }
        isProcessingRef.current = true;
        
        try {
            setStatus('processing');
            // Detect authentication type from URL params
            const isWalletAuth = params.type === 'magiclink' || params.token_hash || params.token;
            setMessage(isWalletAuth ? '🔍 Processing wallet authentication...' : '🔍 Processing authentication...');

            console.log('🔄 Auth callback started');
            console.log('📋 Callback params:', params);

            // Get the current URL for processing - handle SSR safely and production properly
            let currentUrl = '';

            if (Platform.OS === 'web') {
                if (typeof window !== 'undefined' && window.location) {
                    // Use the actual URL from the browser (works in production)
                    // This includes both query string and hash fragment
                    currentUrl = window.location.href;
                    console.log('🌐 Using browser URL:', currentUrl.substring(0, 150));
                    console.log('🔍 URL breakdown:', {
                        origin: window.location.origin,
                        pathname: window.location.pathname,
                        search: window.location.search.substring(0, 100),
                        hash: window.location.hash.substring(0, 100),
                        fullHref: currentUrl.substring(0, 200)
                    });
                    
                    // CRITICAL: Ensure apikey is in the URL for Supabase to process the callback
                    // Since we removed it from redirect_to, we need to add it here if missing
                    const urlParams = new URLSearchParams(window.location.search);
                    const hashParams = new URLSearchParams(window.location.hash.substring(1));
                    const hasApikeyInSearch = urlParams.has('apikey');
                    const hasApikeyInHash = hashParams.has('apikey');
                    
                    if (!hasApikeyInSearch && !hasApikeyInHash) {
                        // Try to get apikey from localStorage (we stored it earlier)
                        let apikey = '';
                        try {
                            apikey = localStorage.getItem('supabase_anon_key') || 
                                     process.env.EXPO_PUBLIC_SUPABASE_KEY || 
                                     (window as any).__SUPABASE_ANON_KEY__ ||
                                     (window as any).__EXPO_PUBLIC_SUPABASE_KEY__ || '';
                        } catch (e) {
                            console.warn('⚠️ Could not get apikey from localStorage:', e);
                        }
                        
                        if (apikey) {
                            // Add apikey to the URL as a query parameter
                            const urlObj = new URL(currentUrl);
                            urlObj.searchParams.set('apikey', apikey);
                            currentUrl = urlObj.toString();
                            console.log('✅ Added apikey to callback URL for Supabase processing');
                        } else {
                            console.warn('⚠️ No apikey found - callback may fail!');
                        }
                    } else {
                        console.log('✅ Apikey already present in URL');
                    }
                    
                    // Check if we have a code parameter in the URL
                    // If we do, we need to exchange it for a session
                    const code = urlParams.get('code') || hashParams.get('code');
                    const accessToken = hashParams.get('access_token');
                    
                    if (code) {
                        console.log('✅ Found OAuth code in URL, will exchange for session');
                        console.log('📝 Code (first 20 chars):', code.substring(0, 20) + '...');
                    } else if (accessToken) {
                        console.log('✅ Found access_token in URL hash, will set session directly');
                        console.log('📝 Access token (first 20 chars):', accessToken.substring(0, 20) + '...');
                    } else {
                        console.warn('⚠️ No code or access_token found in URL');
                        console.log('🔍 Search params:', window.location.search);
                        console.log('🔍 Hash:', window.location.hash.substring(0, 200));
                    }
                } else {
                    // Fallback for SSR - construct URL from params
                    // Try to get origin from environment or use a sensible default
                    const origin = process.env.EXPO_PUBLIC_SITE_URL || 
                                  (typeof window !== 'undefined' && window.location?.origin) ||
                                  'http://localhost:8081';
                    const baseUrl = `${origin}/(shared)/auth/callback`;
                    const searchParams = new URLSearchParams();

                    Object.entries(params).forEach(([key, value]) => {
                        if (value && key !== 'returnTo') { // Don't duplicate returnTo in URL construction
                            searchParams.append(key, Array.isArray(value) ? value[0] : value);
                        }
                    });

                    currentUrl = searchParams.toString() ? `${baseUrl}?${searchParams.toString()}` : baseUrl;
                    console.log('🔧 Constructed URL from params:', currentUrl.substring(0, 150));
                }
            } else {
                // For mobile, construct URL from params
                const baseUrl = 'hashpass://auth/callback';
                const searchParams = new URLSearchParams();

                Object.entries(params).forEach(([key, value]) => {
                    if (value) {
                        searchParams.append(key, Array.isArray(value) ? value[0] : value);
                    }
                });

                currentUrl = `${baseUrl}?${searchParams.toString()}`;
                console.log('📱 Mobile URL:', currentUrl.substring(0, 150));
            }

            if (!currentUrl) {
                throw new Error('No URL available for processing');
            }

            console.log('🎯 Processing URL:', currentUrl.substring(0, 100) + '...');
            
            // CRITICAL: Check if URL has no tokens - Supabase might have created session server-side
            const urlHasTokens = currentUrl.includes('access_token') || 
                                currentUrl.includes('code=') || 
                                currentUrl.includes('#access_token') ||
                                currentUrl.includes('?code=') ||
                                currentUrl.includes('&code=');
            
            if (!urlHasTokens) {
                console.warn('⚠️ No tokens found in callback URL - Supabase may have processed auth server-side');
                console.warn('⚠️ This can happen if Supabase redirects server-side (302) which strips hash fragments');
                console.warn('⚠️ Or if redirect_to validation failed and Supabase used Site URL instead');
                console.warn('⚠️ Checking for existing session that might have been created server-side...');
                
                // CRITICAL: Check if we have a state parameter - this might contain the OAuth flow info
                // If redirect_to validation failed, Supabase might have the code in a different place
                const urlParams = new URLSearchParams(window.location.search);
                const stateParam = urlParams.get('state');
                const codeParam = urlParams.get('code');
                
                console.log('🔍 Checking URL parameters:', {
                    hasState: !!stateParam,
                    hasCode: !!codeParam,
                    stateLength: stateParam?.length || 0,
                    codeLength: codeParam?.length || 0
                });
                
                // CRITICAL: Try to force a session refresh first
                // Supabase might have set cookies but the client hasn't detected them yet
                console.log('🔄 Attempting to force session refresh...');
                try {
                    // Try to refresh the session - this might trigger cookie detection
                    const { data: { session: refreshSession }, error: refreshError } = await supabase.auth.refreshSession();
                    if (refreshSession && refreshSession.user) {
                        console.log('✅ Session refreshed successfully:', refreshSession.user.id);
                        setStatus('success');
                        setMessage('✅ Authentication successful!');
                        if (!hasNavigatedRef.current) {
                            hasNavigatedRef.current = true;
                            const redirectPath = getRedirectPath();
                            safeNavigate(redirectPath);
                        }
                        isProcessingRef.current = false;
                        return;
                    } else if (refreshError) {
                        console.warn('⚠️ Session refresh failed (expected if no session exists):', refreshError.message);
                    }
                } catch (refreshException: any) {
                    console.warn('⚠️ Session refresh exception (expected if no session exists):', refreshException?.message);
                }
                
                // Check if there's a code in the URL query params (might be there without hash)
                // This can happen if Supabase redirects with code in query params instead of hash
                if (codeParam) {
                    console.log('✅ Found code in query params (not hash) - exchanging for session...');
                    console.log('📝 Code (first 20 chars):', codeParam.substring(0, 20) + '...');
                    try {
                        const { data: codeData, error: codeError } = await supabase.auth.exchangeCodeForSession(codeParam);
                        if (codeData?.session && codeData.session.user) {
                            console.log('✅ Session created from code in query params:', codeData.session.user.id);
                            setStatus('success');
                            setMessage('✅ Authentication successful!');
                            if (!hasNavigatedRef.current) {
                                hasNavigatedRef.current = true;
                                const redirectPath = getRedirectPath();
                                safeNavigate(redirectPath);
                            }
                            isProcessingRef.current = false;
                            return;
                        } else if (codeError) {
                            console.error('❌ Code exchange failed:', codeError.message);
                            console.error('❌ Code error details:', {
                                message: codeError.message,
                                status: (codeError as any).status,
                                name: codeError.name
                            });
                            
                            // If code exchange fails, it might be because the code was already used
                            // Check for an existing session anyway
                            console.log('🔍 Code exchange failed, checking for existing session...');
                            const { data: { session: existingSession } } = await supabase.auth.getSession();
                            if (existingSession && existingSession.user) {
                                console.log('✅ Found existing session despite code exchange error:', existingSession.user.id);
                                setStatus('success');
                                setMessage('✅ Authentication successful!');
                                if (!hasNavigatedRef.current) {
                                    hasNavigatedRef.current = true;
                                    const redirectPath = getRedirectPath();
                                    safeNavigate(redirectPath);
                                }
                                isProcessingRef.current = false;
                                return;
                            }
                        }
                    } catch (codeException: any) {
                        console.error('❌ Code exchange exception:', codeException?.message);
                    }
                } else if (stateParam) {
                    // If we have a state parameter but no code, Supabase might have already processed it
                    // The state contains the redirect_to info, so Supabase might have created a session server-side
                    console.log('🔍 Found state parameter but no code - Supabase may have processed server-side');
                    console.log('📝 State (first 50 chars):', stateParam.substring(0, 50) + '...');
                    
                    // CRITICAL: Check if we can get the code from document.referrer
                    // Supabase might have redirected from auth.hashpass.co/auth/v1/callback?code=...
                    // and the code might be in the referrer URL
                    if (Platform.OS === 'web' && typeof window !== 'undefined' && document.referrer) {
                        try {
                            const referrerUrl = new URL(document.referrer);
                            const referrerCode = referrerUrl.searchParams.get('code');
                            if (referrerCode && referrerUrl.hostname.includes('auth.hashpass.co')) {
                                console.log('✅ Found code in referrer URL from Supabase callback!');
                                console.log('📝 Referrer code (first 20 chars):', referrerCode.substring(0, 20) + '...');
                                
                                try {
                                    const { data: codeData, error: codeError } = await supabase.auth.exchangeCodeForSession(referrerCode);
                                    if (codeData?.session && codeData.session.user) {
                                        console.log('✅ Session created from code in referrer:', codeData.session.user.id);
                                        setStatus('success');
                                        setMessage('✅ Authentication successful!');
                                        if (!hasNavigatedRef.current) {
                                            hasNavigatedRef.current = true;
                                            const redirectPath = getRedirectPath();
                                            safeNavigate(redirectPath);
                                        }
                                        isProcessingRef.current = false;
                                        return;
                                    } else if (codeError) {
                                        console.error('❌ Code exchange from referrer failed:', codeError.message);
                                    }
                                } catch (codeException: any) {
                                    console.error('❌ Code exchange from referrer exception:', codeException?.message);
                                }
                            }
                        } catch (referrerError) {
                            console.warn('⚠️ Could not parse referrer URL:', referrerError);
                        }
                    }
                }
                
                // CRITICAL: Supabase might have created a session server-side via cookies
                // Try to manually trigger session detection by calling the Supabase auth endpoint
                // This forces Supabase to check for server-side sessions
                console.log('🔄 Attempting to trigger Supabase session detection...');
                try {
                    // Force Supabase to check for server-side session by calling getUser
                    // This might trigger cookie-based session detection
                    const { data: { user: triggerUser }, error: triggerError } = await supabase.auth.getUser();
                    if (triggerUser && !triggerError) {
                        console.log('✅ Found user via getUser (session may exist server-side):', triggerUser.id);
                        // Try to get the session now
                        const { data: { session: triggerSession } } = await supabase.auth.getSession();
                        if (triggerSession && triggerSession.user) {
                            console.log('✅ Session found after getUser trigger:', triggerSession.user.id);
                            setStatus('success');
                            setMessage('✅ Authentication successful!');
                            if (!hasNavigatedRef.current) {
                                hasNavigatedRef.current = true;
                                const redirectPath = getRedirectPath();
                                safeNavigate(redirectPath);
                            }
                            isProcessingRef.current = false;
                            return;
                        } else {
                            console.log('⚠️ User found but no session - will continue checking...');
                        }
                    }
                } catch (triggerException: any) {
                    console.warn('⚠️ Session trigger exception:', triggerException?.message);
                }
                
                // Wait longer for Supabase to process server-side session (server-side redirects take time)
                // Try multiple times with increasing delays
                let foundServerSideSession = false;
                for (let attempt = 1; attempt <= 5; attempt++) {
                    const waitTime = attempt * 1000; // 1s, 2s, 3s, 4s, 5s
                    console.log(`⏳ Waiting ${waitTime}ms for server-side session (attempt ${attempt}/5)...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    
                    // Check if session exists (might have been created server-side)
                    const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();
                    if (existingSession && existingSession.user && !sessionError) {
                        console.log('✅ Found existing session (likely created server-side by Supabase)');
                        console.log('👤 User ID:', existingSession.user.id);
                        
                        // Verify with getUser to ensure it's valid
                        const { data: { user }, error: userError } = await supabase.auth.getUser();
                        if (user && !userError && user.id === existingSession.user.id) {
                            console.log('✅ Session verified - authentication successful');
                            setStatus('success');
                            setMessage('✅ Authentication successful!');
                            
                            if (!hasNavigatedRef.current) {
                                hasNavigatedRef.current = true;
                                const redirectPath = getRedirectPath();
                                safeNavigate(redirectPath);
                            }
                            isProcessingRef.current = false;
                            foundServerSideSession = true;
                            return;
                        } else if (userError) {
                            console.warn(`⚠️ getUser failed on attempt ${attempt}, will retry...`);
                        }
                    }
                    
                    // Also try getUser directly - sometimes it works when getSession doesn't
                    if (!foundServerSideSession) {
                        const { data: { user: directUser }, error: directError } = await supabase.auth.getUser();
                        if (directUser && !directError) {
                            console.log(`✅ Found user via direct getUser (attempt ${attempt}):`, directUser.id);
                            // If we have a user, try to get/create session
                            const { data: { session: directSession } } = await supabase.auth.getSession();
                            if (directSession && directSession.user && directSession.user.id === directUser.id) {
                                console.log('✅ Session found via direct getUser:', directSession.user.id);
                                setStatus('success');
                                setMessage('✅ Authentication successful!');
                                if (!hasNavigatedRef.current) {
                                    hasNavigatedRef.current = true;
                                    const redirectPath = getRedirectPath();
                                    safeNavigate(redirectPath);
                                }
                                isProcessingRef.current = false;
                                foundServerSideSession = true;
                                return;
                            } else if (directSession) {
                                // Session exists but user doesn't match - still accept it
                                console.log('⚠️ Session user mismatch, accepting session anyway');
                                setStatus('success');
                                setMessage('✅ Authentication successful!');
                                if (!hasNavigatedRef.current) {
                                    hasNavigatedRef.current = true;
                                    const redirectPath = getRedirectPath();
                                    safeNavigate(redirectPath);
                                }
                                isProcessingRef.current = false;
                                foundServerSideSession = true;
                                return;
                            }
                        }
                    }
                }
                
                if (!foundServerSideSession) {
                    console.error('❌ No session found after waiting for server-side processing');
                    console.error('💡 ROOT CAUSE: Supabase redirected without the OAuth code parameter');
                    console.error('💡 This happens when redirect_to validation fails in Supabase');
                    console.error('');
                    console.error('🔍 DIAGNOSTIC INFO:');
                    console.error('   The redirect_to value sent to Supabase was:');
                    console.error('   http://localhost:8081/auth/callback');
                    console.error('   Length: 35 characters');
                    console.error('   Protocol: http://');
                    console.error('   Host: localhost:8081');
                    console.error('   Path: /auth/callback');
                    console.error('');
                    console.error('🔧 FIX INSTRUCTIONS:');
                    console.error('   1. Open Supabase Dashboard → Authentication → URL Configuration');
                    console.error('   2. Under "Redirect URLs", check if you have EXACTLY:');
                    console.error('      http://localhost:8081/auth/callback');
                    console.error('   3. If it exists, check for these common issues:');
                    console.error('      - Extra spaces before/after the URL');
                    console.error('      - Different protocol (https:// instead of http://)');
                    console.error('      - Different host (127.0.0.1 instead of localhost)');
                    console.error('      - Missing port (:8081)');
                    console.error('      - Trailing slash (/auth/callback/)');
                    console.error('      - Different path (/auth/callback vs /auth/callback/)');
                    console.error('   4. If it does NOT exist, add it EXACTLY as shown above');
                    console.error('   5. Also verify Site URL is: https://bsl2025.hashpass.tech');
                    console.error('');
                    console.error('💡 IMPORTANT: Copy the URL exactly from above (including http:// and :8081)');
                    console.error('💡 After adding/updating, wait 1-2 minutes for Supabase to propagate changes');
                    console.error('💡 Then try OAuth again');
                    
                    // Get the stored redirect origin to show in error message
                    let storedOrigin = '';
                    try {
                        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
                            storedOrigin = window.localStorage.getItem('oauth_redirect_origin') || '';
                        }
                    } catch (e) {
                        // Ignore
                    }
                    
                    const expectedRedirectUrl = storedOrigin ? `${storedOrigin}/auth/callback` : 'http://localhost:8081/auth/callback';
                    
                    // Set error status with more helpful message
                    setStatus('error');
                    setMessage(`⚠️ Authentication failed: Supabase redirected without OAuth code.\n\nDIAGNOSIS: redirect_to validation failed\n\nREQUIRED URL in Supabase:\n${expectedRedirectUrl}\n\nCheck console for detailed fix instructions.`);
                }
            }

            // Try to create session from URL with timeout
            console.log('⏱️ Starting createSessionFromUrl with 10s timeout...');
            const sessionResultPromise = createSessionFromUrl(currentUrl);
            const timeoutPromise = new Promise<{ session: null; user: null; error: Error }>((resolve) => {
                setTimeout(() => {
                    resolve({
                        session: null,
                        user: null,
                        error: new Error('createSessionFromUrl timed out after 10 seconds')
                    });
                }, 10000);
            });
            
            const sessionResult = await Promise.race([sessionResultPromise, timeoutPromise]);
            console.log('📦 Session result:', {
                hasSession: !!sessionResult.session,
                hasUser: !!sessionResult.user,
                sessionUserId: sessionResult.session?.user?.id,
                error: sessionResult.error?.message,
                timedOut: sessionResult.error?.message?.includes('timed out')
            });
            
            if (sessionResult.error?.message?.includes('timed out')) {
                console.error('❌ createSessionFromUrl timed out - checking for existing session...');
                // If it timed out, check if a session was created anyway
                const { data: { session: timeoutSession }, error: timeoutError } = await supabase.auth.getSession();
                const { data: { user: timeoutUser }, error: timeoutUserError } = await supabase.auth.getUser();
                
                if (timeoutSession && timeoutSession.user) {
                    console.log('✅ Found session despite timeout:', timeoutSession.user.id);
                    setStatus('success');
                    setMessage('✅ Authentication successful!');
                    if (!hasNavigatedRef.current) {
                        hasNavigatedRef.current = true;
                        const redirectPath = getRedirectPath();
                        safeNavigate(redirectPath);
                        return;
                    }
                } else if (timeoutUser && !timeoutUserError) {
                    console.log('✅ Found user despite timeout:', timeoutUser.id);
                    setStatus('success');
                    setMessage('✅ Authentication successful!');
                    if (!hasNavigatedRef.current) {
                        hasNavigatedRef.current = true;
                        await new Promise(resolve => setTimeout(resolve, 500));
                        const redirectPath = getRedirectPath();
                        safeNavigate(redirectPath);
                        return;
                    }
                } else {
                    console.error('❌ No session found after timeout');
                    // Continue to retry logic below
                }
            }

            // Check if we have a valid session (either from return value or session object)
            const session = sessionResult.session;
            const user = sessionResult.user || session?.user;
            
            // CRITICAL: If createSessionFromUrl didn't return a session but also didn't error,
            // check immediately for a session that might have been created asynchronously
            if (!session && !sessionResult.error) {
                console.log('⚠️ No session from createSessionFromUrl but no error - checking for async session...');
                const { data: { session: asyncSession }, error: asyncError } = await supabase.auth.getSession();
                const { data: { user: asyncUser }, error: asyncUserError } = await supabase.auth.getUser();
                
                if (asyncSession && asyncSession.user) {
                    console.log('✅ Found async session:', asyncSession.user.id);
                    setStatus('success');
                    setMessage('✅ Authentication successful!');
                    if (!hasNavigatedRef.current) {
                        hasNavigatedRef.current = true;
                        const redirectPath = getRedirectPath();
                        safeNavigate(redirectPath);
                        return;
                    }
                } else if (asyncUser && !asyncUserError) {
                    console.log('✅ Found async user:', asyncUser.id);
                    setStatus('success');
                    setMessage('✅ Authentication successful!');
                    if (!hasNavigatedRef.current) {
                        hasNavigatedRef.current = true;
                        await new Promise(resolve => setTimeout(resolve, 500));
                        const redirectPath = getRedirectPath();
                        safeNavigate(redirectPath);
                        return;
                    }
                }
            }
            
            if (session && user) {
                console.log('✅ Session created successfully:', user.id);
                setStatus('success');
                // Detect auth type from user metadata
                const authProvider = user.user_metadata?.auth_provider || 
                                   (user.user_metadata?.wallet_type ? 'wallet' : 'OAuth');
                const authType = authProvider === 'wallet' 
                    ? (user.user_metadata?.wallet_type === 'ethereum' ? 'Ethereum' : 'Solana')
                    : (authProvider === 'email' ? 'Email' : (authProvider === 'google' ? 'Google' : 'Discord'));
                setMessage(`✅ ${authType} authentication successful!`);

                if (!hasNavigatedRef.current) {
                    hasNavigatedRef.current = true;
                    
                    // For OAuth, verify session quickly and navigate
                    // Reduced wait times to prevent getting stuck
                    try {
                        // Quick verification - don't wait too long
                        let verified = false;
                        let retries = 3; // Reduced from 5
                        
                        // Check immediately first
                        const { data: { user: immediateUser }, error: immediateError } = await supabase.auth.getUser();
                        if (!immediateError && immediateUser) {
                            verified = true;
                            console.log('✅ Session verified immediately');
                        }
                        
                        // If not verified, retry quickly
                        while (retries > 0 && !verified) {
                            retries--;
                            if (retries > 0) {
                                console.log(`⏳ Session not ready, waiting... (${3 - retries}/3)`);
                                await new Promise(resolve => setTimeout(resolve, 300)); // Reduced from 800ms
                                
                                const { data: { user }, error: userError } = await supabase.auth.getUser();
                                if (!userError && user) {
                                    verified = true;
                                    console.log('✅ Session verified successfully before navigation');
                                    break;
                                }
                            }
                        }
                        
                        if (!verified) {
                            console.warn('⚠️ Session not verified but navigating anyway - auth state will handle it');
                        }
                        
                        // Navigate immediately - don't wait unnecessarily
                        const redirectPath = getRedirectPath();
                        console.log('🔄 Redirecting to:', redirectPath);
                        
                        // Use safeNavigate to prevent redirect loops
                        safeNavigate(redirectPath);
                    } catch (sessionError: any) {
                        console.error('Session error (non-fatal):', sessionError);
                        // Still navigate - session from createSessionFromUrl should be valid
                        const redirectPath = getRedirectPath();
                        console.log('🔄 Fallback redirect to:', redirectPath);
                        
                        // Use safeNavigate to prevent redirect loops
                        safeNavigate(redirectPath);
                    }
                }
            } else {
                try {
                    console.log('⚠️ No session from createSessionFromUrl - checking for existing session');
                    console.log('📋 Session result details:', {
                        hasSession: !!sessionResult.session,
                        hasError: !!sessionResult.error,
                        errorMessage: sessionResult.error?.message
                    });
                    
                    // For OAuth, the session might be set by Supabase automatically
                    // Wait and retry multiple times with increasing delays
                    let foundSession = false;
                    
                    // If we're on the callback route but don't have a code, Supabase might have
                    // already processed the OAuth and created a session server-side
                    // Check immediately for a session before retrying
                    console.log('🔍 Checking for immediate session (OAuth might have been processed server-side)...');
                    const { data: { session: immediateSession }, error: immediateError } = await supabase.auth.getSession();
                    if (immediateSession && immediateSession.user) {
                        console.log('✅ Found immediate session:', immediateSession.user.id);
                        setStatus('success');
                        setMessage('✅ Authentication successful!');
                        foundSession = true;
                        if (!hasNavigatedRef.current) {
                            hasNavigatedRef.current = true;
                                const redirectPath = getRedirectPath();
                                console.log('🔄 Redirecting to:', redirectPath);
                                safeNavigate(redirectPath);
                                return;
                        }
                    }
                    
                    // CRITICAL: Also check getUser immediately - sometimes getUser works when getSession doesn't
                    // This can happen when session is stored but not properly retrieved
                    console.log('🔍 Also checking getUser immediately (can succeed when getSession fails)...');
                    const { data: { user: immediateUser }, error: immediateUserError } = await supabase.auth.getUser();
                    if (immediateUser && !immediateUserError) {
                        console.log('✅ Found user via getUser (session may not be available but user is authenticated):', immediateUser.id);
                        setStatus('success');
                        setMessage('✅ Authentication successful!');
                        foundSession = true;
                        if (!hasNavigatedRef.current) {
                            hasNavigatedRef.current = true;
                            // Wait a moment to ensure session is fully established
                            await new Promise(resolve => setTimeout(resolve, 500));
                            const redirectPath = getRedirectPath();
                            console.log('🔄 Redirecting to:', redirectPath);
                            safeNavigate(redirectPath);
                            return;
                        }
                    } else if (immediateUserError) {
                        console.warn('⚠️ Immediate getUser failed:', immediateUserError.message);
                    }
                    const maxRetries = 5;
                    
                    for (let attempt = 1; attempt <= maxRetries; attempt++) {
                        const delay = attempt === 1 ? 500 : 1000 * attempt;
                        console.log(`⏳ Checking for session (attempt ${attempt}/${maxRetries}) after ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        
                        // Try getSession first (faster)
                        const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();
                        
                        if (existingSession && !sessionError && existingSession.user) {
                            console.log('✅ Found existing session:', existingSession.user.id);
                            setStatus('success');
                            setMessage('✅ Authentication successful!');
                            foundSession = true;

                            if (!hasNavigatedRef.current) {
                                hasNavigatedRef.current = true;
                                // Wait a bit more to ensure session is fully established
                                await new Promise(resolve => setTimeout(resolve, 500));
                                
                                // Verify with getUser before navigating
                                const { data: { user: verifiedUser }, error: verifyError } = await supabase.auth.getUser();
                                if (verifiedUser && !verifyError) {
                                    console.log('✅ Session verified with getUser before navigation');
                                    const redirectPath = getRedirectPath();
                                    console.log('🔄 Redirecting to:', redirectPath);
                                    safeNavigate(redirectPath);
                                    break;
                                } else {
                                    console.warn('⚠️ Session exists but getUser failed, navigating anyway');
                                    const redirectPath = getRedirectPath();
                                    router.replace(redirectPath as any);
                                    break;
                                }
                            }
                            break;
                        }
                        
                        // Also try getUser (more reliable but slower)
                        // CRITICAL: getUser can succeed even when getSession fails
                        // If we have a valid user, we should proceed with authentication
                        if (attempt >= 2) {
                            const { data: { user: directUser }, error: userError } = await supabase.auth.getUser();
                            if (directUser && !userError) {
                                console.log('✅ Found user via getUser:', directUser.id);
                                console.log('✅ User authenticated - proceeding even if session object not found');
                                setStatus('success');
                                setMessage('✅ Authentication successful!');
                                foundSession = true;

                                if (!hasNavigatedRef.current) {
                                    hasNavigatedRef.current = true;
                                    // Wait a moment to ensure session is fully established
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                    const redirectPath = getRedirectPath();
                                    console.log('🔄 Redirecting to:', redirectPath);
                                    safeNavigate(redirectPath);
                                    break;
                                }
                                break;
                            } else if (userError) {
                                console.warn(`⚠️ getUser failed on attempt ${attempt}:`, userError.message);
                            }
                        }
                    }
                    
                    if (!foundSession) {
                        // Still no session - try one final check with getUser
                        // Sometimes getUser works even when getSession doesn't
                        console.log('🔄 Final attempt: Checking getUser one more time...');
                        const { data: { user: finalUser }, error: finalUserError } = await supabase.auth.getUser();
                        
                        if (finalUser && !finalUserError) {
                            console.log('✅ Found user on final attempt via getUser:', finalUser.id);
                            console.log('✅ User authenticated - proceeding with authentication');
                            setStatus('success');
                            setMessage('✅ Authentication successful!');
                            foundSession = true;
                            
                            if (!hasNavigatedRef.current) {
                                hasNavigatedRef.current = true;
                                // Wait a moment to ensure everything is ready
                                await new Promise(resolve => setTimeout(resolve, 500));
                                const redirectPath = getRedirectPath();
                                console.log('🔄 Redirecting to:', redirectPath);
                                safeNavigate(redirectPath);
                            }
                        } else {
                            // Still no session - show error but don't navigate
                            console.error('❌ No session or user found after all retries');
                            console.error('❌ Final getUser error:', finalUserError?.message);
                            setStatus('error');
                            setMessage('⚠️ Authentication completed but session not found. Please try signing in again.');
                        }
                    }
                } catch (sessionError: any) {
                    console.error('Session check error (non-fatal):', sessionError);
                    // Still try to navigate - auth state change handler might process it
                    setStatus('success');
                    setMessage('✅ Authentication successful!');
                    
                    if (!hasNavigatedRef.current) {
                        hasNavigatedRef.current = true;
                        const redirectPath = getRedirectPath();
                        console.log('🔄 Fallback navigation to:', redirectPath);
                        safeNavigate(redirectPath);
                    }
                }
            }
        } catch (error: any) {
            console.error('❌ Auth callback processing error:', error);

            // Check if it's an email-related error (which is normal for Twitter)
            if (error.message?.toLowerCase().includes('email') ||
                error.message?.includes('server_error')) {
                setStatus('warning');
                setMessage('✅ Google authentication successful!\n\n⚠️ Email not provided by Google (this is normal)');

                if (!hasNavigatedRef.current) {
                    hasNavigatedRef.current = true;
                    // Navigate to the correct path (respects returnTo parameter)
                    const redirectPath = getRedirectPath();
                    console.log('🔄 Redirecting to:', redirectPath);
                    safeNavigate(redirectPath);
                }
                return;
            }

            setStatus('error');
            setMessage(`❌ Authentication failed: ${error.message}`);

            if (!hasNavigatedRef.current) {
                hasNavigatedRef.current = true;
                // Navigate after short delay to show error message
            setTimeout(() => {
                router.replace('/');
                }, 2000); // Reduced from 5000ms to 2000ms
            }
        } finally {
            isProcessingRef.current = false;
        }
    };

    useEffect(() => {
        console.log('🔄 AuthCallback useEffect triggered');
        console.log('📋 Params in useEffect:', params);
        
        // Don't clear cache if we have auth params - session might be valid
        const hasAuthParams = params.access_token || params.refresh_token || params.code || params.token_hash;
        
        console.log('🔍 Has auth params:', hasAuthParams);
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            console.log('🌐 Full URL:', window.location.href);
            console.log('🔍 URL has code:', window.location.href.includes('code='));
            console.log('🔍 URL has access_token:', window.location.href.includes('access_token='));
        }
        
        // Only clear stale cache if there are no auth params
        if (Platform.OS === 'web' && typeof window !== 'undefined' && !hasAuthParams) {
            // Only clear if we don't have auth params (not a fresh auth)
            try {
                const authKeys = Object.keys(localStorage).filter(key => 
                    key.includes('supabase') || key.includes('auth') || key.includes('session')
                );
                // Don't clear if we have auth params - session might be valid
                if (authKeys.length > 0 && !hasAuthParams) {
                    console.log('🗑️ Clearing stale auth cache (no auth params detected)');
                    authKeys.forEach(key => {
                        localStorage.removeItem(key);
                    });
                }
            } catch (e) {
                console.warn('Failed to clear auth cache:', e);
            }
        }

        // Prevent duplicate processing
        if (isProcessingRef.current || hasNavigatedRef.current) {
            console.log('⏭️ Auth callback already processing or navigated, skipping');
            return;
        }
        
        // Wait a moment for params to be fully loaded, then process
        const processCallback = async () => {
            console.log('⏳ Waiting 200ms before processing callback...');
            await new Promise(resolve => setTimeout(resolve, 200));
            console.log('🚀 Starting handleAuthCallback...');
            await handleAuthCallback();
        };
        
        // Set a timeout to prevent infinite processing (30 seconds)
        const timeoutId = setTimeout(() => {
            if (isProcessingRef.current && !hasNavigatedRef.current) {
                console.warn('⏱️ Auth callback timeout - checking for session before redirecting');
                // Check one more time for session before giving up
                supabase.auth.getSession().then(({ data: { session } }) => {
                    if (session && session.user) {
                        console.log('✅ Found session on timeout, navigating');
                        const redirectPath = getRedirectPath();
                        safeNavigate(redirectPath);
                    } else {
                        console.error('⏱️ Auth callback timeout - no session found');
                        isProcessingRef.current = false;
                        setStatus('error');
                        setMessage('❌ Authentication timeout. Please try again.');
                        setTimeout(() => {
                            router.replace('/(shared)/auth' as any);
                        }, 2000);
                    }
                }).catch(() => {
                    isProcessingRef.current = false;
                    setStatus('error');
                    setMessage('❌ Authentication timeout. Please try again.');
                    setTimeout(() => {
                        router.replace('/(shared)/auth' as any);
                    }, 2000);
                });
            }
        }, 30000); // 30 second timeout

        processCallback().finally(() => {
            clearTimeout(timeoutId);
        });
    }, [router]);

    const styles = createStyles();

    const handleContinue = () => {
        const redirectPath = getRedirectPath();
        safeNavigate(redirectPath);
    };

    if (status === 'show_download') {
        return (
            <View style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.title}>Welcome to Hashpass!</Text>
                    <Text style={styles.betaDisclaimer}>Our web app is in beta. For the best experience, please use our mobile app.</Text>
                    
                    <View style={styles.qrCodeContainer}>
                        <Image 
                            source={require('../../../assets/images/qr-one-link-hashpass.png')} 
                            style={styles.qrCode}
                            resizeMode="contain"
                        />
                    </View>

                    <Text style={styles.message}>Scan the QR code to download</Text>

                    <View style={styles.storeButtonsContainer}>
                        <TouchableOpacity 
                            style={[styles.storeButton, styles.appStoreButton]}
                            onPress={() => Linking.openURL('https://onelink.to/4px5bv')}
                        >
                            <View style={styles.storeButtonContent}>
                                <View style={styles.storeIcon}>
                                    <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                                </View>
                                <View style={styles.storeTextContainer}>
                                    <Text style={styles.storeButtonSubtext}>Download on the</Text>
                                    <Text style={styles.storeButtonMaintext}>App Store</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.storeButton, styles.googlePlayButton]}
                            onPress={() => Linking.openURL('https://onelink.to/4px5bv')}
                        >
                            <View style={styles.storeButtonContent}>
                                <View style={styles.storeIcon}>
                                    <Ionicons name="logo-google-playstore" size={20} color="#FFFFFF" />
                                </View>
                                <View style={styles.storeTextContainer}>
                                    <Text style={styles.storeButtonSubtext}>GET IT ON</Text>
                                    <Text style={styles.storeButtonMaintext}>Google Play</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={handleContinue} style={styles.continueButton}>
                        <Text style={styles.continueButtonText}>Continue to Web App</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {status === 'processing' && (
                    <>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.title}>Processing Authentication</Text>
                    </>
                )}

                {(status === 'success' || status === 'warning') && (
                    <>
                        <View style={styles.successIcon}>
                            <Check size={32} color="#fff" />
                        </View>
                        <Text style={styles.title}>Success!</Text>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <View style={styles.errorIcon}>
                            <AlertCircle size={32} color="#fff" />
                        </View>
                        <Text style={styles.title}>Authentication Error</Text>
                    </>
                )}

                <Text style={styles.message}>{message}</Text>

                {status !== 'processing' && (
                    <Text style={styles.redirectText}>
                        {t('loading.pleaseWait')}
                    </Text>
                )}
            </View>
        </View>
    );
}

const createStyles = () => StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
        padding: 20,
    },
    content: {
        alignItems: 'center',
        gap: 16,
        maxWidth: 300,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#fff',
        textAlign: 'center',
        lineHeight: 22,
    },
    redirectText: {
        fontSize: 14,
        color: '#fff',
        textAlign: 'center',
        marginTop: 8,
    },
    successIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    warningIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    betaDisclaimer: {
        fontSize: 14,
        color: '#fff',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
        opacity: 0.8,
    },
    qrCodeContainer: {
        marginVertical: 20,
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 4,
    },
    qrCode: {
        width: 200,
        height: 200,
    },
    storeButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginTop: 10,
        marginBottom: 20,
        flexWrap: 'wrap',
    },
    storeButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        minWidth: 140,
        alignItems: 'center',
        shadowColor: 'rgba(0, 0, 0, 0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 3,
    },
    appStoreButton: {
        backgroundColor: '#000000',
    },
    googlePlayButton: {
        backgroundColor: '#000000',
    },
    storeButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    storeIcon: {
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    storeTextContainer: {
        alignItems: 'flex-start',
    },
    storeButtonSubtext: {
        fontSize: 10,
        fontWeight: '400',
        color: '#FFFFFF',
        lineHeight: 12,
        letterSpacing: 0.5,
    },
    storeButtonMaintext: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        lineHeight: 18,
        letterSpacing: 0.3,
    },
    continueButton: {
        marginTop: 10,
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#333',
        borderRadius: 8,
    },
    continueButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
