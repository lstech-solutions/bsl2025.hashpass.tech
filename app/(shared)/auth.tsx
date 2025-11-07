import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/i18n';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Platform, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import * as Linking from 'expo-linking';
import ThemeAndLanguageSwitcher from '../../components/ThemeAndLanguageSwitcher';
import { OptimizedSplashCursor } from '../../components/OptimizedSplashCursor';
import { useTheme } from '../../hooks/useTheme';
import { isEthereumWalletAvailable, isSolanaWalletAvailable } from '../../lib/wallet-auth';
import { useToastHelpers } from '../../contexts/ToastContext';
import { getEmailProviderUrl, openEmailProvider } from '../../lib/email-provider';
import PrivacyTermsModal from '../../components/PrivacyTermsModal';

type AuthMethod = 'magiclink' | 'otp';

export default function AuthScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation('auth');
  const router = useRouter();
  const { showError, showSuccess, showWarning, showInfo } = useToastHelpers();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('magiclink');
  const [emailError, setEmailError] = useState('');
  const [ethereumAvailable, setEthereumAvailable] = useState(false);
  const [solanaAvailable, setSolanaAvailable] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'privacy' | 'terms'>('privacy');
  const styles = getStyles(isDark, colors);

  // Check wallet availability on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      setEthereumAvailable(isEthereumWalletAvailable());
      setSolanaAvailable(isSolanaWalletAvailable());
    }
  }, []);

  useEffect(() => {
    const handleAuthChange = async (event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        if (event === 'SIGNED_IN') {
          try {
            console.log('🎫 Creating default pass for user:', session.user.id);
            const { data: passId, error } = await supabase
              .rpc('create_default_pass', {
                p_user_id: session.user.id,
                p_pass_type: 'general'
              });
              
            if (error) {
              console.error('❌ Error creating default pass:', error);
              // Continue to dashboard even if pass creation fails
              router.replace('/(shared)/dashboard/explore');
            } else if (passId) {
              console.log('✅ Default pass created successfully:', passId);
              router.replace('/(shared)/dashboard/explore');
            } else {
              console.warn('⚠️ Pass creation returned null - pass may already exist or creation failed silently');
              // Check if pass already exists
              const { data: existingPass } = await supabase
                .from('passes')
                .select('id')
                .eq('user_id', session.user.id)
                .eq('event_id', 'bsl2025')
                .eq('status', 'active')
                .limit(1)
                .maybeSingle();
              
              if (existingPass) {
                console.log('✅ User already has an active pass:', existingPass.id);
              } else {
                console.warn('⚠️ No pass found - user may need to create one manually');
              }
              router.replace('/(shared)/dashboard/explore');
            }
          } catch (error) {
            console.error('❌ Error in pass creation:', error);
            // Continue to dashboard even if pass creation fails
            router.replace('/(shared)/dashboard/explore');
          }
        } else {
          router.replace('/(shared)/dashboard/explore');
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const sendMagicLinkOrOTP = async () => {
    if (!email) {
      setEmailError('Email required');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please provide a valid email');
      return;
    }

    setEmailError('');
    setLoading(true);
    try {
      const redirectTo = Platform.OS === 'web' 
        ? (typeof window !== 'undefined' ? window.location.origin + '/(shared)/auth/callback' : Linking.createURL('/(shared)/auth/callback'))
        : Linking.createURL('/(shared)/auth/callback');

      if (authMethod === 'otp') {
        // For OTP, use our custom API endpoint that sends the actual code
        try {
          const apiUrl = Platform.OS === 'web' 
            ? (typeof window !== 'undefined' ? window.location.origin : '')
            : '';
          
          const response = await fetch(`${apiUrl}/api/auth/otp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email.trim() }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to send OTP code');
          }

          setOtpSent(true);
          
          // Get email provider to add a link in the toast
          const emailProvider = getEmailProviderUrl(email.trim());
          const providerName = emailProvider?.name || 'your email';
          
          showSuccess(
            'Code Sent',
            `Please check ${providerName} for the 6-digit verification code.`,
            10000, // 10 seconds duration
            emailProvider ? {
              label: `Open ${emailProvider.name}`,
              onPress: async () => await openEmailProvider(email.trim()),
            } : undefined
          );
          setLoading(false);
          return;
        } catch (apiError: any) {
          console.error('OTP API error:', apiError);
          // Fallback to Supabase's method if custom API fails
          const { error } = await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: {
              shouldCreateUser: true,
            },
          });

          if (error) {
            showError('Authentication Error', error.message);
            setLoading(false);
            return;
          }

          setOtpSent(true);
          
          // Get email provider to add a link in the toast
          const emailProvider = getEmailProviderUrl(email.trim());
          const providerName = emailProvider?.name || 'your email';
          
          showSuccess(
            'Code Sent',
            `Please check ${providerName} for the verification code.`,
            10000, // 10 seconds duration
            emailProvider ? {
              label: `Open ${emailProvider.name}`,
              onPress: async () => await openEmailProvider(email.trim()),
            } : undefined
          );
          setLoading(false);
          return;
        }
      } else {
        // For Magic Link, include the redirect URL
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: redirectTo,
          },
        });

        if (error) {
          showError('Authentication Error', error.message);
          setLoading(false);
          return;
        }

        // Get email provider to add a link in the toast
        const emailProvider = getEmailProviderUrl(email.trim());
        const providerName = emailProvider?.name || 'your email';
        
        showSuccess(
          'Magic Link Sent',
          `Please check ${providerName} and click the link to sign in.`,
          10000, // 10 seconds duration
          emailProvider ? {
            label: `Open ${emailProvider.name}`,
            onPress: async () => await openEmailProvider(email.trim()),
          } : undefined
        );
      }
      setLoading(false);
    } catch (error: any) {
      showError('Error', error.message || 'Failed to send authentication email.');
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      showError('Invalid Code', 'Please enter the 6-digit code from your email.');
      return;
    }

    setLoading(true);
    try {
      // Try standard Supabase verification first
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode,
        type: 'email',
      });

      if (error) {
        // If standard verification fails, try our custom API endpoint
        try {
          const apiUrl = Platform.OS === 'web' 
            ? (typeof window !== 'undefined' ? window.location.origin : '')
            : '';
          
          const response = await fetch(`${apiUrl}/api/auth/otp/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              email: email.trim(), 
              code: otpCode 
            }),
          });

          const verifyData = await response.json();

          if (!response.ok) {
            throw new Error(verifyData.error || 'Verification failed');
          }

          if (verifyData.token_hash) {
            // Verify the token_hash using client-side Supabase
            // Only token_hash and type should be provided (no email)
            const { data: verifyResult, error: verifyErr } = await supabase.auth.verifyOtp({
              token_hash: verifyData.token_hash,
              type: 'magiclink',
            });

            if (verifyErr) {
              // Try with type 'email'
              const { data: emailVerifyResult, error: emailVerifyErr } = await supabase.auth.verifyOtp({
                token_hash: verifyData.token_hash,
                type: 'email',
              });

              if (emailVerifyErr || !emailVerifyResult?.session) {
                throw new Error(emailVerifyErr?.message || 'Verification failed');
              }

              showSuccess('Authentication Successful', 'Welcome! You have been signed in.');
              await new Promise(resolve => setTimeout(resolve, 500));
              router.replace('/(shared)/dashboard/explore');
              return;
            }

            if (verifyResult?.session) {
              showSuccess('Authentication Successful', 'Welcome! You have been signed in.');
              await new Promise(resolve => setTimeout(resolve, 500));
              router.replace('/(shared)/dashboard/explore');
              return;
            }
          }
        } catch (apiError: any) {
          console.error('Custom OTP verification error:', apiError);
          showError('Verification Failed', apiError.message || 'Invalid code. Please try again.');
          setLoading(false);
          return;
        }
      } else if (data?.session) {
        showSuccess('Authentication Successful', 'Welcome! You have been signed in.');
        await new Promise(resolve => setTimeout(resolve, 500));
        router.replace('/(shared)/dashboard/explore');
      } else {
        showError('Verification Failed', 'Unable to create session. Please try again.');
        setLoading(false);
      }
    } catch (error: any) {
      showError('Error', error.message || 'Failed to verify code.');
      setLoading(false);
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'discord') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: Linking.createURL('/(shared)/auth/callback'),
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        showError('Authentication Error', error.message);
        setLoading(false);
      } else if (data.url) {
        Linking.openURL(data.url);
      }
    } catch (error: any) {
      showError('Error', error.message);
      setLoading(false);
    }
  };

  const signInWithEthereum = async () => {
    setLoading(true);
    try {
      const { authenticateWithEthereum } = await import('../../lib/wallet-auth');
      const authData = await authenticateWithEthereum();
      
      if (authData.tokenHash) {
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: authData.tokenHash,
          type: 'magiclink'
        });
        
        if (!verifyError && verifyData?.session) {
          setLoading(false);
          showSuccess('Authentication Successful', 'Welcome! You have been signed in with your Ethereum wallet.');
          await new Promise(resolve => setTimeout(resolve, 100));
          router.replace('/(shared)/dashboard/explore');
          return;
        }
      }
      
      if (authData.magicLink || authData.redirectUrl) {
        const linkToUse = authData.magicLink || authData.redirectUrl;
        
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          try {
            const url = new URL(linkToUse);
            const token = url.searchParams.get('token_hash') || url.searchParams.get('token');
            
            if (token) {
              const { data: retryData, error: retryError } = await supabase.auth.verifyOtp({
                token_hash: token,
                type: 'magiclink'
              });
              
              if (!retryError && retryData?.session) {
                setLoading(false);
                showSuccess('Authentication Successful', 'Welcome! You have been signed in with your Ethereum wallet.');
                await new Promise(resolve => setTimeout(resolve, 100));
                router.replace('/(shared)/dashboard/explore');
                return;
              }
            }
            
            setLoading(false);
            window.location.href = linkToUse;
            return;
          } catch (urlError) {
            console.error('❌ Error processing magic link:', urlError);
            setLoading(false);
            throw urlError;
          }
        } else {
          setLoading(false);
          Linking.openURL(linkToUse);
          return;
        }
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setLoading(false);
        showSuccess('Authentication Successful', 'Welcome! You have been signed in with your Ethereum wallet.');
        router.replace('/(shared)/dashboard/explore');
        return;
      }
      
      setLoading(false);
      throw new Error('Failed to establish session. Please try again.');
    } catch (error: any) {
      console.error('❌ Ethereum auth error:', error);
      setLoading(false);
      
      const errorMessage = error.message || 'Failed to authenticate with Ethereum wallet';
      
      if (errorMessage.includes('Too many authentication attempts')) {
        showError('Rate Limit Exceeded', 'Please wait a few minutes before trying again.');
      } else if (errorMessage.includes('timed out') || errorMessage.includes('check if MetaMask popup')) {
        showWarning('MetaMask Popup Not Appearing', 'Please check your MetaMask extension - the popup may be hidden.');
      } else if (errorMessage.includes('rejected')) {
        showWarning('Request Rejected', 'You rejected the wallet request. Please try again.');
      } else if (errorMessage.includes('wallet not found')) {
        showError('Wallet Not Found', 'Please install MetaMask or another Ethereum wallet extension.');
      } else {
        showError('Authentication Failed', errorMessage);
      }
    }
  };

  const signInWithSolana = async () => {
    setLoading(true);
    try {
      const { authenticateWithSolana } = await import('../../lib/wallet-auth');
      const authData = await authenticateWithSolana();
      
      if (authData.tokenHash) {
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: authData.tokenHash,
          type: 'magiclink'
        });
        
        if (!verifyError && verifyData?.session) {
          setLoading(false);
          showSuccess('Authentication Successful', 'Welcome! You have been signed in with your Solana wallet.');
          await new Promise(resolve => setTimeout(resolve, 100));
          router.replace('/(shared)/dashboard/explore');
          return;
        }
      }
      
      if (authData.magicLink || authData.redirectUrl) {
        const linkToUse = authData.magicLink || authData.redirectUrl;
        
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          try {
            const url = new URL(linkToUse);
            const token = url.searchParams.get('token_hash') || url.searchParams.get('token');
            
            if (token) {
              const { data: retryData, error: retryError } = await supabase.auth.verifyOtp({
                token_hash: token,
                type: 'magiclink'
              });
              
              if (!retryError && retryData?.session) {
                setLoading(false);
                showSuccess('Authentication Successful', 'Welcome! You have been signed in with your Solana wallet.');
                await new Promise(resolve => setTimeout(resolve, 100));
                router.replace('/(shared)/dashboard/explore');
                return;
              }
            }
            
            setLoading(false);
            window.location.href = linkToUse;
            return;
          } catch (urlError) {
            console.error('❌ Error processing magic link:', urlError);
            setLoading(false);
            throw urlError;
          }
        } else {
          setLoading(false);
          Linking.openURL(linkToUse);
          return;
        }
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setLoading(false);
        showSuccess('Authentication Successful', 'Welcome! You have been signed in with your Solana wallet.');
        router.replace('/(shared)/dashboard/explore');
        return;
      }
      
      setLoading(false);
      throw new Error('Failed to establish session. Please try again.');
    } catch (error: any) {
      console.error('❌ Solana auth error:', error);
      setLoading(false);
      
      const errorMessage = error.message || 'Failed to authenticate with Solana wallet';
      
      if (errorMessage.includes('Too many authentication attempts')) {
        showError('Rate Limit Exceeded', 'Please wait a few minutes before trying again.');
      } else if (errorMessage.includes('timed out') || errorMessage.includes('check if')) {
        showWarning('Wallet Popup Not Appearing', 'Please check your wallet extension - the popup may be hidden.');
      } else if (errorMessage.includes('rejected')) {
        showWarning('Request Rejected', 'You rejected the wallet request. Please try again.');
      } else if (errorMessage.includes('wallet not found')) {
        showError('Wallet Not Found', 'Please install Phantom or another Solana wallet extension.');
      } else {
        showError('Authentication Failed', errorMessage);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <OptimizedSplashCursor
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -1
        }}
        SIM_RESOLUTION={32}
        DYE_RESOLUTION={256}
        CAPTURE_RESOLUTION={128}
        DENSITY_DISSIPATION={5.0}
        VELOCITY_DISSIPATION={3.0}
        PRESSURE={0.1}
        PRESSURE_ITERATIONS={5}
        CURL={1}
        SPLAT_RADIUS={0.1}
        SPLAT_FORCE={2000}
        SHADING={false}
        COLOR_UPDATE_SPEED={3}
      />
      <ThemeAndLanguageSwitcher />
      <TouchableOpacity
        style={{ position: 'absolute', top: 20, left: 20, zIndex: 1001 }}
        onPress={() => router.push('/home')}
        accessibilityLabel="Go Back"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="arrow-back" size={28} color={isDark ? "#fff" : "#000"} />
      </TouchableOpacity>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.overlay} pointerEvents="none" />
          <Text style={styles.title}>{t('title')}</Text>
        <View style={styles.logoContainer}>            
          <Image
            source={isDark
              ? require('../../assets/logos/hashpass/logo-full-hashpass-black.svg')
              : require('../../assets/logos/hashpass/logo-full-hashpass-white.svg')
            }
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.tagline}>{t('subtitle')}</Text>

        {/* Primary Auth Method: Email (Magic Link/OTP) */}
        <View style={styles.primaryAuthContainer}>
          {!otpSent ? (
            <>
              <View>
                <View style={[styles.emailInputContainer, emailError && styles.emailInputContainerError]}>
                  <Ionicons 
                    name="mail-outline" 
                    size={20} 
                    color={emailError ? '#F44336' : (isDark ? '#999' : '#666')} 
                    style={styles.inputIcon} 
                  />
                  <TextInput
                    style={[styles.emailInput, emailError && styles.emailInputError]}
                    placeholder="Enter your email"
                    placeholderTextColor={isDark ? '#999' : '#666'}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (emailError) {
                        setEmailError('');
                      }
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    onFocus={() => {
                      if (emailError) {
                        setEmailError('');
                      }
                    }}
                  />
                </View>
                {emailError ? (
                  <Text style={styles.emailErrorText}>{emailError}</Text>
                ) : null}
              </View>

              {/* Method Toggle */}
              <View style={styles.methodToggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.methodToggle, 
                    authMethod === 'magiclink' && styles.methodToggleActive,
                    loading && styles.methodToggleDisabled
                  ]}
                  onPress={() => {
                    if (!loading) {
                      setAuthMethod('magiclink');
                      // Clear any email errors when switching
                      if (emailError) {
                        setEmailError('');
                      }
                    }
                  }}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name="link" 
                    size={16} 
                    color={
                      loading 
                        ? (isDark ? '#666' : '#999')
                        : authMethod === 'magiclink' 
                          ? (isDark ? '#fff' : '#000') 
                          : (isDark ? '#999' : '#666')
                    } 
                  />
                  <Text style={[
                    styles.methodToggleText, 
                    authMethod === 'magiclink' && styles.methodToggleTextActive,
                    loading && styles.methodToggleTextDisabled
                  ]}>
                    Magic Link
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.methodToggle, 
                    authMethod === 'otp' && styles.methodToggleActive,
                    loading && styles.methodToggleDisabled
                  ]}
                  onPress={() => {
                    if (!loading) {
                      setAuthMethod('otp');
                      // Clear any email errors when switching
                      if (emailError) {
                        setEmailError('');
                      }
                    }
                  }}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name="keypad" 
                    size={16} 
                    color={
                      loading 
                        ? (isDark ? '#666' : '#999')
                        : authMethod === 'otp' 
                          ? (isDark ? '#fff' : '#000') 
                          : (isDark ? '#999' : '#666')
                    } 
                  />
                  <Text style={[
                    styles.methodToggleText, 
                    authMethod === 'otp' && styles.methodToggleTextActive,
                    loading && styles.methodToggleTextDisabled
                  ]}>
                    OTP Code
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                onPress={sendMagicLinkOrOTP}
                disabled={loading}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.primaryButtonContent}>
                    <Ionicons 
                      name={authMethod === 'magiclink' ? 'mail' : 'keypad'} 
                      size={20} 
                      color="#FFFFFF" 
                    />
                    <Text style={styles.primaryButtonText}>
                      {authMethod === 'magiclink' ? 'Send Magic Link' : 'Send Code'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.otpInstructions}>
                Enter the 6-digit code sent to{'\n'}
                <Text style={styles.otpEmail}>{email}</Text>
              </Text>
              <View style={styles.otpInputContainer}>
                <TextInput
                  style={styles.otpInput}
                  placeholder="000000"
                  placeholderTextColor={isDark ? '#999' : '#666'}
                  value={otpCode}
                  onChangeText={(text) => setOtpCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  editable={!loading}
                />
              </View>
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                onPress={verifyOTP}
                disabled={loading || otpCode.length !== 6}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.primaryButtonContent}>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Verify Code</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.backToEmailButton}
                onPress={() => {
                  setOtpSent(false);
                  setOtpCode('');
                }}
                disabled={loading}
              >
                <Text style={styles.backToEmailText}>← Back to email</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Optional Auth Methods - Circular Buttons */}
        <View style={styles.optionalAuthContainer}>
          <TouchableOpacity
            style={[styles.circularButton, styles.googleButton]}
            onPress={() => signInWithOAuth('google')}
            disabled={loading}
            accessibilityLabel="Sign in with Google"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="logo-google" size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.circularButton, styles.discordButton]}
            onPress={() => signInWithOAuth('discord')}
            disabled={loading}
            accessibilityLabel="Sign in with Discord"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="logo-discord" size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          {Platform.OS === 'web' && ethereumAvailable && (
            <TouchableOpacity
              style={[styles.circularButton, styles.ethereumButton]}
              onPress={signInWithEthereum}
              disabled={loading}
              accessibilityLabel="Sign in with Ethereum"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="logo-bitcoin" size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          )}

          {Platform.OS === 'web' && solanaAvailable && (
            <TouchableOpacity
              style={[styles.circularButton, styles.solanaButton]}
              onPress={signInWithSolana}
              disabled={loading}
              accessibilityLabel="Sign in with Solana"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="logo-bitcoin" size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.privacyContainer}>
          <Text style={styles.privacyText}>{t('privacy.text')} </Text>
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => {
              setModalType('terms');
              setModalVisible(true);
            }}
            style={styles.linkButton}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <Text style={styles.linkText}>{t('privacy.terms')}</Text>
          </TouchableOpacity>
          <Text style={styles.privacyText}> and </Text>
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => {
              setModalType('privacy');
              setModalVisible(true);
            }}
            style={styles.linkButton}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <Text style={styles.linkText}>{t('privacy.privacy')}</Text>
          </TouchableOpacity>
          <Text style={styles.privacyText}>.</Text>
        </View>
      </View>
      </ScrollView>
      <PrivacyTermsModal
        visible={modalVisible}
        type={modalType}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    minHeight: '100%',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 20,
    width: '100%',
    maxWidth: 400,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    zIndex: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: isDark ? '#fff' : '#121212',
    marginBottom: 0,
    textAlign: 'center',
    textShadowColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  logo: {
    width: 200,
    height: 80,
  },
  tagline: {
    fontSize: 18,
    color: isDark ? '#FFFFFF' : '#121212',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  // Primary Auth Styles
  primaryAuthContainer: {
    width: '100%',
    marginBottom: 24,
  },
  emailInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  },
  emailInputContainerError: {
    borderColor: '#F44336',
    borderWidth: 2,
    backgroundColor: isDark ? 'rgba(244, 67, 54, 0.1)' : 'rgba(244, 67, 54, 0.05)',
  },
  inputIcon: {
    marginRight: 12,
  },
  emailInput: {
    flex: 1,
    fontSize: 16,
    color: isDark ? '#fff' : '#121212',
  },
  emailInputError: {
    color: isDark ? '#fff' : '#121212',
  },
  emailErrorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 4,
    fontWeight: '500',
  },
  methodToggleContainer: {
    flexDirection: 'row',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  methodToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  methodToggleActive: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
  },
  methodToggleText: {
    fontSize: 14,
    color: isDark ? '#999' : '#666',
    fontWeight: '500',
  },
  methodToggleTextActive: {
    color: isDark ? '#fff' : '#121212',
    fontWeight: '600',
  },
  methodToggleDisabled: {
    opacity: 0.5,
  },
  methodToggleTextDisabled: {
    opacity: 0.5,
  },
  primaryButton: {
    backgroundColor: colors.primary || '#7A5ECC',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: colors.primary || '#7A5ECC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
    backgroundColor: isDark ? 'rgba(122, 94, 204, 0.3)' : 'rgba(122, 94, 204, 0.3)',
  },
  primaryButtonTextDisabled: {
    color: '#999',
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // OTP Styles
  otpInstructions: {
    fontSize: 14,
    color: isDark ? '#fff' : '#121212',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  otpEmail: {
    fontWeight: '600',
    color: colors.primary || '#7A5ECC',
  },
  otpInputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  otpInput: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 8,
    color: isDark ? '#fff' : '#121212',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  },
  backToEmailButton: {
    marginTop: 12,
    paddingVertical: 8,
  },
  backToEmailText: {
    fontSize: 14,
    color: colors.primary || '#7A5ECC',
    textAlign: 'center',
  },
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: isDark ? '#999' : '#666',
  },
  // Optional Auth Styles - Circular Buttons
  optionalAuthContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  circularButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  googleButton: {
    backgroundColor: '#DB4437',
  },
  discordButton: {
    backgroundColor: '#5865F2',
  },
  ethereumButton: {
    backgroundColor: '#627EEA',
  },
  solanaButton: {
    backgroundColor: '#14F195',
  },
  privacyContainer: {
    marginTop: 20,
    paddingHorizontal: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
    position: 'relative',
    pointerEvents: 'auto',
  },
  privacyText: {
    fontSize: 14,
    color: isDark ? '#FFFFFF' : '#121212',
    textAlign: 'center',
    lineHeight: 20,
  },
  linkText: {
    color: isDark ? '#FFFFFF' : '#7A5ECC',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  linkButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    zIndex: 201,
    position: 'relative',
  },
});
