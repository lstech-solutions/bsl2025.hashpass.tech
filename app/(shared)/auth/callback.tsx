import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, Image, TouchableOpacity, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createSessionFromUrl, supabase } from '../../../lib/supabase';
import { Check, AlertCircle, Info } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AuthCallback() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [status, setStatus] = useState<'processing' | 'success' | 'warning' | 'error' | 'show_download'>('processing');
    const [message, setMessage] = useState('Processing authentication...');
    
    // Get returnTo parameter from URL for proper redirect
    const getRedirectPath = () => {
        // Check URL params first (from query string)
        const returnTo = params.returnTo as string | undefined;
        if (returnTo) {
            try {
                return decodeURIComponent(returnTo);
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
                    return decodeURIComponent(returnToParam);
                }
            } catch (e) {
                console.warn('Failed to parse returnTo from URL:', e);
            }
        }
        
        return '/(shared)/dashboard/explore';
    };
    
    // Processing guard to prevent duplicate processing
    const isProcessingRef = useRef(false);
    const hasNavigatedRef = useRef(false);

    useEffect(() => {
        // Prevent duplicate processing
        if (isProcessingRef.current || hasNavigatedRef.current) {
            console.log('⏭️ Auth callback already processing or navigated, skipping');
            return;
        }
        
        handleAuthCallback();
    }, []);

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
                    currentUrl = window.location.href;
                    console.log('🌐 Using browser URL:', currentUrl.substring(0, 150));
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
            const session = await createSessionFromUrl(currentUrl);

            if (session && session.user) {
                console.log('✅ Session created successfully:', session.user.id);
                setStatus('success');
                // Detect auth type from user metadata
                const authProvider = session.user.user_metadata?.auth_provider || 
                                   session.user.user_metadata?.wallet_type ? 'wallet' : 'OAuth';
                const authType = authProvider === 'wallet' 
                    ? (session.user.user_metadata?.wallet_type === 'ethereum' ? 'Ethereum' : 'Solana')
                    : (authProvider === 'email' ? 'Email' : 'Google');
                setMessage(`✅ ${authType} authentication successful!`);

                if (!hasNavigatedRef.current) {
                    hasNavigatedRef.current = true;
                    // Wait a moment to ensure session is fully established (especially important for OTP links)
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    // Double-check session is still valid before redirecting
                    const { data: { session: verifySession } } = await supabase.auth.getSession();
                    if (!verifySession) {
                        console.warn('⚠️ Session lost after creation, retrying...');
                        // Retry once
                        await new Promise(resolve => setTimeout(resolve, 500));
                        const { data: { session: retrySession } } = await supabase.auth.getSession();
                        if (!retrySession) {
                            throw new Error('Session not established after authentication');
                        }
                    }
                    
                    // Navigate to the correct path (respects returnTo parameter)
                    const redirectPath = getRedirectPath();
                    console.log('🔄 Redirecting to:', redirectPath);
                    router.replace(redirectPath);
                }
            } else {
                console.log('⚠️ No session created but no error - checking for existing session');

                // Wait a bit for session to be established (important for OTP links)
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const { data: { session: existingSession } } = await supabase.auth.getSession();

                if (existingSession) {
                    console.log('✅ Found existing session');
                    setStatus('success');
                    setMessage('✅ Authentication successful!');

                    if (!hasNavigatedRef.current) {
                        hasNavigatedRef.current = true;
                        // Navigate to the correct path (respects returnTo parameter)
                        const redirectPath = getRedirectPath();
                        console.log('🔄 Redirecting to:', redirectPath);
                        router.replace(redirectPath);
                    }
                } else {
                    // Last retry - sometimes OTP links need more time
                    console.log('🔄 Retrying session check...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const { data: { session: retrySession } } = await supabase.auth.getSession();
                    if (retrySession) {
                        console.log('✅ Found session on retry');
                        setStatus('success');
                        setMessage('✅ Authentication successful!');
                        if (!hasNavigatedRef.current) {
                            hasNavigatedRef.current = true;
                            const redirectPath = getRedirectPath();
                            console.log('🔄 Redirecting to:', redirectPath);
                            router.replace(redirectPath);
                        }
                    } else {
                        throw new Error('No session could be established');
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
                    router.replace(redirectPath);
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

    const styles = createStyles();

    const handleContinue = () => {
        const redirectPath = getRedirectPath();
        router.replace(redirectPath);
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
                        Please wait...
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
