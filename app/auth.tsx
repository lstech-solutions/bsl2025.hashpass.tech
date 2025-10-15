import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/i18n';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import * as Linking from 'expo-linking';
import ThemeAndLanguageSwitcher from './components/ThemeAndLanguageSwitcher';
import { SplashCursor } from './components/SplashBackground';
import { useTheme } from '../hooks/useTheme';

export default function AuthScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation('auth');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const styles = getStyles(isDark, colors);

  // Animated header state
  const headerScale = useSharedValue(1);
  
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: headerScale.value }
      ]
    };
  });

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (session) {
          router.replace('/dashboard/explore');
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signInWithOAuth = async (provider: 'google') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: Linking.createURL('/auth/callback'),
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
        <SplashCursor
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: -1
          }}
        />
        <ThemeAndLanguageSwitcher />
        <TouchableOpacity
          style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}
          onPress={() => router.push('/')}
          accessibilityLabel="Go Back"
        >
          <Ionicons name="arrow-back" size={28} color={isDark ? "#fff" : "#000"} />
        </TouchableOpacity>
        <View style={styles.content}>
          <View style={styles.overlay} />
          <Text style={styles.title}>{t('title')}</Text>
          <Animated.View style={[styles.logoContainer, headerAnimatedStyle]}>            
            <Image
              source={isDark
                ? require('../assets/logos/logo-full-hashpass-black.svg')
                : require('../assets/logos/logo-full-hashpass-white.svg')
              }
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
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

          <Text style={styles.privacyText}>
            {t('privacy.text')} <Text style={styles.linkText}>{t('privacy.terms')}</Text> and <Text style={styles.linkText}>{t('privacy.privacy')}</Text>.
          </Text>
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
  privacyText: {
    fontSize: 14,
    color: isDark ? '#FFFFFF' : '#121212',
    marginTop: 20,
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
  },
  tagline: {
    fontSize: 18,
    color: isDark ? '#FFFFFF' : '#121212',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  }
});
