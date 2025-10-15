import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, Image, TouchableOpacity, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createSessionFromUrl, supabase } from '../../lib/supabase';
import { Check, AlertCircle, Info } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';

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
                    
                    <View style={styles.qrCodeContainer}>
                        <Image 
                            source={require('../../assets/images/qr-one-link-hashpass.png')} 
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
