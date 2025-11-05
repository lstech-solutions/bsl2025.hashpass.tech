import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/i18n';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
// Removed reanimated imports - not needed for auth screen
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import * as Linking from 'expo-linking';
import ThemeAndLanguageSwitcher from '../../components/ThemeAndLanguageSwitcher';
import { OptimizedSplashCursor } from '../../components/OptimizedSplashCursor';
import { useTheme } from '../../hooks/useTheme';

export default function AuthScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation('auth');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const styles = getStyles(isDark, colors);

  // Removed unused animation to improve performance

  useEffect(() => {
    const handleAuthChange = async (event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        // Check if this is a new user
        if (event === 'SIGNED_IN') {
          try {
            // Create a default pass for the new user
            const { data: pass, error } = await supabase
              .rpc('create_default_pass', {
                p_user_id: session.user.id,
                p_pass_type: 'general'
              });
              
            if (error) {
              console.error('Error creating default pass:', error);
              // Still let them in even if pass creation fails
              router.replace('/(shared)/dashboard/explore');
            } else {
              console.log('Default pass created:', pass);
              router.replace('/(shared)/dashboard/explore');
            }
          } catch (error) {
            console.error('Error in pass creation:', error);
            // Still let them in even if pass creation fails
            router.replace('/(shared)/dashboard/explore');
          }
        } else {
          // Existing user signing in
          router.replace('/(shared)/dashboard/explore');
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithOAuth = async (provider: 'google') => {
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
        Alert.alert('Authentication Error', error.message);
      } else if (data.url) {
        Linking.openURL(data.url);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
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

          <TouchableOpacity
            style={[styles.button, styles.googleButton]}
            onPress={() => signInWithOAuth('google')}
            disabled={loading}
            accessibilityLabel="Sign in with Google"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="logo-google" size={28} color={isDark ? "#fff" : "#000"} />
                <Text style={styles.buttonText}>{t('signInWithGoogle')}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.privacyContainer} pointerEvents="box-none">
            <Text style={styles.privacyText}>{t('privacy.text')} </Text>
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => {
                try {
                  router.push('/(shared)/terms');
                } catch (error) {
                  console.error('Navigation error:', error);
                }
              }}
              style={styles.linkButton}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text style={styles.linkText}>
                {t('privacy.terms')}
              </Text>
            </TouchableOpacity>
            <Text style={styles.privacyText}> and </Text>
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => {
                try {
                  router.push('/(shared)/privacy');
                } catch (error) {
                  console.error('Navigation error:', error);
                }
              }}
              style={styles.linkButton}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text style={styles.linkText}>
                {t('privacy.privacy')}
              </Text>
            </TouchableOpacity>
            <Text style={styles.privacyText}>.</Text>
          </View>
        </View>
      </SafeAreaView>
  );
}

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    zIndex: 10,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    position: 'absolute',
    top: 200,
    zIndex: 100,
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
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 16,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  googleLogo: {
    width: 24,
    height: 24,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#fff' : '#121212',
    textShadowColor: isDark ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  googleButton: {
    backgroundColor: '#DB4437',
    shadowColor: '#DB4437',
  },
  twitterButton: {
    backgroundColor: '#1DA1F2',
    shadowColor: '#1DA1F2',
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
  },
  privacyText: {
    fontSize: 14,
    color: isDark ? '#FFFFFF' : '#121212',
    textAlign: 'center',
    lineHeight: 20,
  },
  logo: {
    width: 200,
    height: 80,
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
  tagline: {
    fontSize: 18,
    color: isDark ? '#FFFFFF' : '#121212',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  }
});
