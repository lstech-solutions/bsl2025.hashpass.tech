/**
 * Redirect handler for /auth/callback/ (with trailing slash)
 * Redirects to /auth/callback (without trailing slash) to match Expo Router routing
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';

export default function AuthCallbackRedirect() {
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    // Redirect to /auth/callback (without trailing slash)
    // On web, handle trailing slash redirect immediately
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const searchParams = window.location.search;
      const hash = window.location.hash;
      
      if (currentPath === '/auth/callback/') {
        // Preserve query params and hash when redirecting
        const newUrl = `/auth/callback${searchParams}${hash}`;
        window.location.replace(newUrl);
        return;
      }
    }
    // For mobile, redirect to the callback route
    router.replace('/(shared)/auth/callback' as any);
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.default }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

