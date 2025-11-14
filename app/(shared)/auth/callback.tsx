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
            
            // Method 2: If no stored origin, extract from path (fallback for production)
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
                    
                    // Method 2: If no stored origin, extract from path (fallback for production)
                    if (!correctOrigin && currentPath.includes('hashpass.tech')) {
                        const domainMatch = currentPath.match(/([a-z0-9-]+\.hashpass\.tech)/i);
                        if (domainMatch) {
                            correctOrigin = `https://${domainMatch[1]}`;
                            console.log('📍 Extracted origin from path (Method 2):', correctOrigin);
                        }
                    }
                    
                    // Method 3: Try environment variable (for production)
                    if (!correctOrigin && typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SITE_URL) {
                        correctOrigin = process.env.EXPO_PUBLIC_SITE_URL;
                        console.log('📍 Using EXPO_PUBLIC_SITE_URL (Method 3):', correctOrigin);
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
                    
                    // Check if we have a code parameter in the URL
                    // If we do, we need to exchange it for a session
                    const urlParams = new URLSearchParams(window.location.search);
                    const hashParams = new URLSearchParams(window.location.hash.substring(1));
                    const code = urlParams.get('code') || hashParams.get('code');
                    
                    if (code) {
                        console.log('✅ Found OAuth code in URL, will exchange for session');
                        console.log('📝 Code (first 20 chars):', code.substring(0, 20) + '...');
                    } else {
                        console.warn('⚠️ No code parameter found in URL');
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

            // Try to create session from URL
            const sessionResult = await createSessionFromUrl(currentUrl);
            console.log('📦 Session result:', {
                hasSession: !!sessionResult.session,
                hasUser: !!sessionResult.user,
                sessionUserId: sessionResult.session?.user?.id,
                error: sessionResult.error?.message
            });

            // Check if we have a valid session (either from return value or session object)
            const session = sessionResult.session;
            const user = sessionResult.user || session?.user;
            
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
                    
                    // For OAuth, wait for session to be fully established before navigating
                    // This prevents the layout from redirecting back to /auth
                    try {
                        // Wait longer to ensure session is fully established (especially for custom auth domains)
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        
                        // Verify session is actually established before navigating
                        let verified = false;
                        let retries = 5;
                        
                        while (retries > 0 && !verified) {
                            const { data: { user }, error: userError } = await supabase.auth.getUser();
                            if (!userError && user) {
                                verified = true;
                                console.log('✅ Session verified successfully before navigation');
                                break;
                            }
                            
                            retries--;
                            if (retries > 0) {
                                console.log(`⏳ Session not ready, waiting... (${5 - retries}/5)`);
                                await new Promise(resolve => setTimeout(resolve, 800));
                            }
                        }
                        
                        if (!verified) {
                            console.warn('⚠️ Session not verified but navigating anyway - auth state will handle it');
                            // Wait a bit more before navigating if not verified
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                        
                        // Navigate after session is verified
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
                        if (attempt >= 2) {
                            const { data: { user: directUser }, error: userError } = await supabase.auth.getUser();
                            if (directUser && !userError) {
                                console.log('✅ Found user via getUser:', directUser.id);
                                setStatus('success');
                                setMessage('✅ Authentication successful!');
                                foundSession = true;

                                if (!hasNavigatedRef.current) {
                                    hasNavigatedRef.current = true;
                                    const redirectPath = getRedirectPath();
                                    console.log('🔄 Redirecting to:', redirectPath);
                                    safeNavigate(redirectPath);
                                    break;
                                }
                                break;
                            }
                        }
                    }
                    
                    if (!foundSession) {
                        // Still no session - show error but don't navigate
                        console.error('❌ No session found after all retries');
                        setStatus('error');
                        setMessage('⚠️ Authentication completed but session not found. Please try signing in again.');
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
