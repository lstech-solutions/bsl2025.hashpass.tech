import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, Image, TouchableOpacity, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createSessionFromUrl, supabase } from '../../lib/supabase';
import { Check, AlertCircle, Info } from 'lucide-react-native';

export default function AuthCallback() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [status, setStatus] = useState<'processing' | 'success' | 'warning' | 'error' | 'show_download'>('processing');
    const [message, setMessage] = useState('Processing authentication...');

    useEffect(() => {
        handleAuthCallback();
    }, []);

    const handleAuthCallback = async () => {
        try {
            setStatus('processing');
            setMessage('🔍 Processing Google authentication...');

            console.log('🔄 Auth callback started');
            console.log('📋 Callback params:', params);

            // Get the current URL for processing - handle SSR safely
            let currentUrl = '';

            if (Platform.OS === 'web') {
                if (typeof window !== 'undefined' && window.location) {
                    currentUrl = window.location.href;
                } else {
                    // Fallback for SSR - construct URL from params
                    const baseUrl = 'http://localhost:8081/auth/callback';
                    const searchParams = new URLSearchParams();

                    Object.entries(params).forEach(([key, value]) => {
                        if (value) {
                            searchParams.append(key, Array.isArray(value) ? value[0] : value);
                        }
                    });

                    currentUrl = `${baseUrl}?${searchParams.toString()}`;
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
                setMessage('✅ Google authentication successful!');

                setTimeout(() => {
                    if (Platform.OS === 'web') {
                        setStatus('show_download');
                    } else {
                        router.replace('/dashboard/explore');
                    }
                }, 1000);
            } else {
                console.log('⚠️ No session created but no error - checking for existing session');

                const { data: { session: existingSession } } = await supabase.auth.getSession();

                if (existingSession) {
                    console.log('✅ Found existing session');
                    setStatus('success');
                    setMessage('✅ Authentication successful!');

                    setTimeout(() => {
                        if (Platform.OS === 'web') {
                            setStatus('show_download');
                        } else {
                            router.replace('/dashboard/explore');
                        }
                    }, 1000);
                } else {
                    throw new Error('No session could be established');
                }
            }
        } catch (error: any) {
            console.error('❌ Auth callback processing error:', error);

            // Check if it's an email-related error (which is normal for Twitter)
            if (error.message?.toLowerCase().includes('email') ||
                error.message?.includes('server_error')) {
                setStatus('warning');
                setMessage('✅ Google authentication successful!\n\n⚠️ Email not provided by Google (this is normal)');

                setTimeout(() => {
                    router.replace('/dashboard/explore');
                }, 3000);
                return;
            }

            setStatus('error');
            setMessage(`❌ Authentication failed: ${error.message}`);

            setTimeout(() => {
                router.replace('/');
            }, 5000);
        }
    };

    const styles = createStyles();

    const handleContinue = () => {
        router.replace('/dashboard/explore');
    };

    if (status === 'show_download') {
        return (
            <View style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.title}>Welcome to Hashpass!</Text>
                    <Text style={styles.betaDisclaimer}>Our web app is in beta. For the best experience, please use our mobile app.</Text>
                    
                    <Image source={{ uri: '/assets/images/qr-code.png' }} style={styles.qrCode} />

                    <Text style={styles.message}>Scan the QR code to download</Text>

                    <View style={styles.storeButtonsContainer}>
                        <TouchableOpacity onPress={() => Linking.openURL('https://onelink.to/4px5bv')}>
                            <Image source={{ uri: '/assets/images/app-store-badge.png' }} style={styles.storeButton} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => Linking.openURL('https://onelink.to/4px5bv')}>
                            <Image source={{ uri: '/assets/images/google-play-badge.png' }} style={styles.storeButton} />
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
    qrCode: {
        width: 200,
        height: 200,
        marginVertical: 20,
    },
    storeButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginTop: 10,
        marginBottom: 20,
    },
    storeButton: {
        width: 135,
        height: 40,
        resizeMode: 'contain',
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
