import React, { useState, useEffect } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import * as Linking from 'expo-linking';

export default function AuthScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (session) {
          // User is logged in, navigate to home or dashboard
          router.replace('/(tabs)/home'); // Navigate back to the main app
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
          // This redirectTo URL must be configured in your Supabase project's Auth -> URL Configuration
          // For Expo Go, it's typically `exp://<your-ip-address>:<port>`
          // For standalone apps, it's your app's scheme, e.g., `myapp://auth-callback` (from app.json)
          // Linking.createURL will generate the correct URL for the current platform/environment.
          redirectTo: Linking.createURL('/auth/callback'),
          skipBrowserRedirect: false, // Ensures the browser opens for OAuth flow
        },
      });

      if (error) {
        Alert.alert('Authentication Error', error.message);
      } else if (data.url) {
        // data.url is the URL to open for the OAuth flow.
        // signInWithOAuth with skipBrowserRedirect: false handles opening the browser automatically.
        // The onAuthStateChange listener will detect the session after the redirect.
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={{ uri: 'https://images.pexels.com/photos/7096461/pexels-photo-7096461.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }} // Reusing hero image for consistency
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <TouchableOpacity
          style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}
          onPress={() => router.back()}
          accessibilityLabel="Go Back"
        >
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.overlay} />
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to HashPass</Text>
          <Text style={styles.subtitle}>Sign in to unlock your digital life.</Text>

          <TouchableOpacity
            style={[styles.button, styles.googleButton]}
            onPress={() => signInWithOAuth('google')}
            disabled={loading}
            accessibilityLabel="Sign in with Google"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Sign in with Google</Text>
            )}
          </TouchableOpacity>


          <Text style={styles.privacyText}>
            By signing in, you agree to our <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>.
          </Text>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Dark overlay for readability
  },
  content: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(38, 38, 38, 0.9)', // Semi-transparent surface color
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: '#2F2F2F',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#A3A3A3',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    flexDirection: 'row', // For potential icons
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  googleButton: {
    backgroundColor: '#DB4437', // Google red
    shadowColor: '#DB4437',
  },
  twitterButton: {
    backgroundColor: '#1DA1F2', // Twitter blue
    shadowColor: '#1DA1F2',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8, // For potential icons
  },
  privacyText: {
    fontSize: 14,
    color: '#A3A3A3',
    marginTop: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  linkText: {
    color: '#9E7FFF', // Primary color for links
    fontWeight: 'bold',
  },
});
