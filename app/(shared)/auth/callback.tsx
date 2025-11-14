import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createSessionFromUrl, supabase } from '../../../lib/supabase';
import { Check, AlertCircle } from 'lucide-react-native';
import type { Session } from '@supabase/supabase-js';
import { useTranslation } from '../../../i18n/i18n';

export default function AuthCallback() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { t } = useTranslation('common');
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
    
    // Simplified auth callback handler with reduced delays
    useEffect(() => {
        const handleAuthCallback = async () => {
            if (hasNavigatedRef.current) {
                console.log('⏭️ Already navigated from callback, skipping');
                return;
            }
            
            try {
                setStatus('processing');
                setMessage('Processing authentication...');
                
                console.log('🔄 Auth callback started');
                console.log('📋 Callback params:', params);
                
                // Get the current URL for processing
                let currentUrl = '';
                
                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    currentUrl = window.location.href;
                    console.log('🌐 Using browser URL:', currentUrl.substring(0, 150));
                    
                    // Ensure apikey is in the URL for Supabase processing
                    const urlParams = new URLSearchParams(window.location.search);
                    const hashParams = new URLSearchParams(window.location.hash.substring(1));
                    
                    if (!urlParams.has('apikey') && !hashParams.has('apikey')) {
                        const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
                        if (supabaseAnonKey) {
                            const urlObj = new URL(currentUrl);
                            urlObj.searchParams.set('apikey', supabaseAnonKey);
                            currentUrl = urlObj.toString();
                            console.log('✅ Added apikey to callback URL');
                        }
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
                    
                    currentUrl = searchParams.toString() ? `${baseUrl}?${searchParams.toString()}` : baseUrl;
                    console.log('📱 Mobile URL:', currentUrl.substring(0, 150));
                }
                
                if (!currentUrl) {
                    throw new Error('No URL available for processing');
                }
                
                console.log('🎯 Processing URL:', currentUrl.substring(0, 100) + '...');
                
                // Simplified: Try Supabase auto-detection first with shorter delays
                console.log('🔄 Letting Supabase auto-detect session from URL...');
                
                // Reduced attempts and delays for faster response
                for (let attempt = 1; attempt <= 3; attempt++) {
                    const delay = attempt * 500; // 0.5s, 1s, 1.5s
                    console.log(`⏳ Auto-detection attempt ${attempt}/3 after ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    
                    const { data: { session }, error } = await supabase.auth.getSession();
                    if (session && session.user && !error) {
                        console.log(`✅ Supabase auto-detected session on attempt ${attempt}:`, session.user.id);
                        setStatus('success');
                        setMessage('✅ Authentication successful!');
                        hasNavigatedRef.current = true;
                        safeNavigate(getRedirectPath());
                        return;
                    }
                }
                
                // If auto-detection fails, try manual processing
                console.log('🔄 Auto-detection failed, trying manual URL processing...');
                const { session, error } = await createSessionFromUrl(currentUrl);
                
                if (error) {
                    console.error('❌ Error creating session from URL:', error);
                    
                    // Check if session was created despite error
                    const { data: { session: fallbackSession } } = await supabase.auth.getSession();
                    if (fallbackSession && fallbackSession.user) {
                        console.log('✅ Found session despite error:', fallbackSession.user.id);
                        setStatus('success');
                        setMessage('✅ Authentication successful!');
                        hasNavigatedRef.current = true;
                        safeNavigate(getRedirectPath());
                        return;
                    }
                    
                    throw error;
                }
                
                if (session && session.user) {
                    console.log('✅ Session created successfully:', session.user.id);
                    setStatus('success');
                    setMessage('✅ Authentication successful!');
                    hasNavigatedRef.current = true;
                    safeNavigate(getRedirectPath());
                } else {
                    // One final check
                    console.log('🔄 No session from URL, doing final check...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    const { data: { session: finalSession } } = await supabase.auth.getSession();
                    if (finalSession && finalSession.user) {
                        console.log(`✅ Found session on final check:`, finalSession.user.id);
                        setStatus('success');
                        setMessage('✅ Authentication successful!');
                        hasNavigatedRef.current = true;
                        safeNavigate(getRedirectPath());
                        return;
                    }
                    
                    throw new Error('Authentication completed but session not found. Please try signing in again.');
                }
                
            } catch (error: any) {
                console.error('❌ Auth callback error:', error);
                setStatus('error');
                setMessage(error.message || 'Authentication failed. Please try again.');
                
                // After error, redirect back to auth page after a shorter delay
                setTimeout(() => {
                    if (!hasNavigatedRef.current) {
                        hasNavigatedRef.current = true;
                        router.replace('/(shared)/auth' as any);
                    }
                }, 2000); // Reduced from 3 seconds to 2
            }
        };
        
        handleAuthCallback();
    }, [params, router]);
    
    // Listen for auth state changes as backup
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log(`🔐 Callback auth event: ${event}, user: ${session?.user?.id || 'none'}`);
            
            if (event === 'SIGNED_IN' && session?.user && !hasNavigatedRef.current) {
                console.log('✅ SIGNED_IN event detected, navigating');
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
