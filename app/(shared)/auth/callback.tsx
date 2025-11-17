import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createSessionFromUrl, supabase } from '../../../lib/supabase';
import { Check, AlertCircle } from 'lucide-react-native';

export default function AuthCallback() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('Processing authentication...');
    
    // Track if we've already navigated to prevent duplicate navigation
    const hasNavigatedRef = useRef(false);
    
    // Get redirect path from URL params
    const getRedirectPath = () => {
        const returnTo = params.returnTo as string | undefined;
        if (returnTo) {
            try {
                const decoded = decodeURIComponent(returnTo);
                // Prevent redirecting to callback route
                if (decoded.includes('/auth/callback')) {
                    return '/(shared)/dashboard/explore';
                }
                return decoded;
            } catch (e) {
                console.warn('Failed to decode returnTo parameter:', e);
            }
        }
        return '/(shared)/dashboard/explore';
    };
    
    // Safe navigation function
    const safeNavigate = (path: string) => {
        if (path.includes('/auth/callback')) {
            console.warn('⚠️ Attempted to redirect to callback route, redirecting to dashboard instead');
            router.replace('/(shared)/dashboard/explore' as any);
        } else {
            router.replace(path as any);
        }
    };
    
    // Track processing state to prevent multiple simultaneous executions
    const isProcessingRef = useRef(false);
    
    // Simplified auth callback handler with reduced delays
    useEffect(() => {
        const handleAuthCallback = async () => {
            // Prevent multiple simultaneous executions
            if (hasNavigatedRef.current || isProcessingRef.current) {
                console.log('⏭️ Already processing or navigated, skipping');
                return;
            }
            
            isProcessingRef.current = true;
            
            try {
                setStatus('processing');
                setMessage('Processing authentication...');
                
                console.log('🔄 Auth callback started');
                console.log('📋 Callback params:', params);
                
                // Check if URL has auth tokens/code before processing
                let hasAuthData = false;
                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    const url = window.location.href;
                    hasAuthData = url.includes('#access_token=') || 
                                  url.includes('#code=') || 
                                  url.includes('?code=') ||
                                  url.includes('&code=') ||
                                  url.includes('access_token=');
                } else {
                    // For mobile, check params
                    hasAuthData = !!(params.code || params.access_token);
                }
                
                if (!hasAuthData) {
                    console.log('⚠️ No auth data in URL, checking for existing session...');
                    // Check if user is already authenticated
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session && session.user) {
                        console.log('✅ Found existing session, navigating');
                        setStatus('success');
                        setMessage('✅ Authentication successful!');
                        hasNavigatedRef.current = true;
                        isProcessingRef.current = false;
                        safeNavigate(getRedirectPath());
                        return;
                    }
                    // If no auth data and no session, this might be a direct navigation to callback
                    console.warn('⚠️ No auth data and no session, redirecting to auth');
                    hasNavigatedRef.current = true;
                    isProcessingRef.current = false;
                    router.replace('/(shared)/auth' as any);
                    return;
                }
                
                // Get the current URL for processing
                let currentUrl = '';
                
                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    currentUrl = window.location.href;
                    console.log('🌐 Using browser URL:', currentUrl.substring(0, 150));
                    
                    // Don't modify URL - Supabase should handle it automatically
                    // The URL from OAuth provider already has the necessary tokens
                } else {
                    // For mobile, construct URL from params
                    const baseUrl = 'hashpass://auth/callback';
                    const searchParams = new URLSearchParams();
                    
                    Object.entries(params).forEach(([key, value]) => {
                        if (value && key !== 'returnTo') {
                            searchParams.append(key, Array.isArray(value) ? value[0] : value);
                        }
                    });
                    
                    currentUrl = searchParams.toString() ? `${baseUrl}?${searchParams.toString()}` : baseUrl;
                    console.log('📱 Mobile URL:', currentUrl.substring(0, 150));
                }
                
                if (!currentUrl) {
                    throw new Error('No URL available for processing');
                }
                
                console.log('🎯 Processing URL:', currentUrl.substring(0, 100) + '...');
                
                // Try Supabase auto-detection first (Supabase should handle URL automatically)
                console.log('🔄 Letting Supabase auto-detect session from URL...');
                
                // Wait a bit for Supabase to process the URL automatically
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Check session immediately
                let { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (session && session.user && !sessionError) {
                    console.log('✅ Supabase auto-detected session:', session.user.id);
                    
                    // Clean URL to prevent re-processing (only on web)
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                        // Remove hash and OAuth params from URL to prevent re-processing
                        const cleanUrl = window.location.origin + window.location.pathname;
                        window.history.replaceState({}, '', cleanUrl);
                        console.log('🧹 Cleaned URL to prevent re-processing');
                    }
                    
                    setStatus('success');
                    setMessage('✅ Authentication successful!');
                    hasNavigatedRef.current = true;
                    isProcessingRef.current = false;
                    safeNavigate(getRedirectPath());
                    return;
                }
                
                // If auto-detection fails, try manual processing
                console.log('🔄 Auto-detection failed, trying manual URL processing...');
                const result = await createSessionFromUrl(currentUrl);
                
                if (result.error) {
                    console.error('❌ Error creating session from URL:', result.error);
                    
                    // Check if session was created despite error
                    const { data: { session: fallbackSession } } = await supabase.auth.getSession();
                    if (fallbackSession && fallbackSession.user) {
                        console.log('✅ Found session despite error:', fallbackSession.user.id);
                        
                        // Clean URL to prevent re-processing (only on web)
                        if (Platform.OS === 'web' && typeof window !== 'undefined') {
                            const cleanUrl = window.location.origin + window.location.pathname;
                            window.history.replaceState({}, '', cleanUrl);
                            console.log('🧹 Cleaned URL to prevent re-processing');
                        }
                        
                        setStatus('success');
                        setMessage('✅ Authentication successful!');
                        hasNavigatedRef.current = true;
                        isProcessingRef.current = false;
                        safeNavigate(getRedirectPath());
                        return;
                    }
                    
                    throw result.error;
                }
                
                if (result.session && result.session.user) {
                    console.log('✅ Session created successfully:', result.session.user.id);
                    
                    // Clean URL to prevent re-processing (only on web)
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                        // Remove hash and OAuth params from URL to prevent re-processing
                        const cleanUrl = window.location.origin + window.location.pathname;
                        window.history.replaceState({}, '', cleanUrl);
                        console.log('🧹 Cleaned URL to prevent re-processing');
                    }
                    
                    setStatus('success');
                    setMessage('✅ Authentication successful!');
                    hasNavigatedRef.current = true;
                    isProcessingRef.current = false;
                    safeNavigate(getRedirectPath());
                } else {
                    // One final check with a short delay
                    console.log('🔄 No session from URL, doing final check...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    const { data: { session: finalSession } } = await supabase.auth.getSession();
                    if (finalSession && finalSession.user) {
                        console.log(`✅ Found session on final check:`, finalSession.user.id);
                        
                        // Clean URL to prevent re-processing (only on web)
                        if (Platform.OS === 'web' && typeof window !== 'undefined') {
                            const cleanUrl = window.location.origin + window.location.pathname;
                            window.history.replaceState({}, '', cleanUrl);
                            console.log('🧹 Cleaned URL to prevent re-processing');
                        }
                        
                        setStatus('success');
                        setMessage('✅ Authentication successful!');
                        hasNavigatedRef.current = true;
                        isProcessingRef.current = false;
                        safeNavigate(getRedirectPath());
                        return;
                    }
                    
                    throw new Error('Authentication completed but session not found. Please try signing in again.');
                }
                
            } catch (error: any) {
                console.error('❌ Auth callback error:', error);
                setStatus('error');
                setMessage(error.message || 'Authentication failed. Please try again.');
                
                // After error, redirect back to auth page after a delay
                setTimeout(() => {
                    if (!hasNavigatedRef.current) {
                        hasNavigatedRef.current = true;
                        isProcessingRef.current = false;
                        router.replace('/(shared)/auth' as any);
                    }
                }, 2000);
            } finally {
                isProcessingRef.current = false;
            }
        };
        
        handleAuthCallback();
    }, [params, router]);
    
    // Listen for auth state changes as backup (only if not already processing)
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log(`🔐 Callback auth event: ${event}, user: ${session?.user?.id || 'none'}`);
            
            // Only handle SIGNED_IN if we haven't navigated and we're not currently processing
            if (event === 'SIGNED_IN' && session?.user && !hasNavigatedRef.current && !isProcessingRef.current) {
                console.log('✅ SIGNED_IN event detected, navigating');
                
                // Clean URL to prevent re-processing (only on web)
                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    const cleanUrl = window.location.origin + window.location.pathname;
                    window.history.replaceState({}, '', cleanUrl);
                    console.log('🧹 Cleaned URL to prevent re-processing');
                }
                
                hasNavigatedRef.current = true;
                setStatus('success');
                setMessage('✅ Authentication successful!');
                safeNavigate(getRedirectPath());
            }
        });
        
        return () => {
            subscription.unsubscribe();
        };
    }, [router]);
    
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {status === 'processing' && (
                    <>
                        <ActivityIndicator size="large" color="#3B82F6" />
                        <Text style={styles.message}>{message}</Text>
                    </>
                )}
                
                {status === 'success' && (
                    <>
                        <Check size={48} color="#10B981" />
                        <Text style={styles.successMessage}>{message}</Text>
                    </>
                )}
                
                {status === 'error' && (
                    <>
                        <AlertCircle size={48} color="#EF4444" />
                        <Text style={styles.errorMessage}>{message}</Text>
                        <Text style={styles.redirectInfo}>Redirecting to login page...</Text>
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
        padding: 20,
    },
    content: {
        alignItems: 'center',
        maxWidth: 300,
    },
    message: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
        lineHeight: 22,
    },
    successMessage: {
        color: '#10B981',
        fontSize: 18,
        textAlign: 'center',
        marginTop: 20,
        fontWeight: '600',
        lineHeight: 24,
    },
    errorMessage: {
        color: '#EF4444',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
        lineHeight: 22,
    },
    redirectInfo: {
        color: '#9CA3AF',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 20,
    },
});
