import '../config/reanimated'; // CRITICAL: Ensure Reanimated is imported and configured first
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, useRouter } from "expo-router";
import { usePathname, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { ThemeProvider } from '../providers/ThemeProvider';
import { LanguageProvider } from '../providers/LanguageProvider';
import { useTheme, useThemeProvider } from '../hooks/useTheme';
import { StatusBar } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import "./global.css";
import PWAPrompt from './components/PWAPrompt';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const theme = useThemeProvider();

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider value={theme}>
          <StatusBar
            barStyle={theme.isDark ? 'light-content' : 'dark-content'}
            backgroundColor={theme.colors.background.default}
          />
          <LanguageProvider>
            <ThemedContent />
          </LanguageProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

function ThemedContent() {
  // All hooks must be called unconditionally at the top level
  const { colors, isDark } = useTheme();
  const pathname = usePathname();
  const segments = useSegments();
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Check if we're in the auth flow
  const isAuthFlow = segments[0] === 'auth' || pathname.startsWith('/auth');
  const isBSLPublic = pathname.startsWith('/bslatam');

  // Handle loading state and splash screen
  useEffect(() => {
    if (!isLoading) {
      setIsReady(true);
    }
  }, [isLoading]);

  // Handle splash screen hiding
  useEffect(() => {
    if (isReady) {
      const hideSplash = async () => {
        await SplashScreen.hideAsync();
        setShowSplash(false);
      };
      hideSplash();
    }
  }, [isReady]);

  // Handle auth redirection
  useEffect(() => {
    if (isReady && !isLoading) {
      if (!isLoggedIn && !isAuthFlow && !isBSLPublic) {
        router.replace('/auth');
      }
    }
  }, [isLoggedIn, isAuthFlow, isBSLPublic, isReady, isLoading, router]);

  // Show loading state
  if (isLoading || !isReady || showSplash) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.default }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: isDark ? colors.primaryDark : colors.background.paper,
          },
          animation: 'slide_from_right',
          animationTypeForReplace: 'push',
        }}
      >
        {!isLoggedIn ? (
          // Auth flow screens
          <>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
            {/* Public BSL routes */}
            <Stack.Screen name="bslatam/home" options={{ headerShown: false }} />
            <Stack.Screen name="bslatam/speakers/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="bslatam/speakers/calendar" options={{ headerShown: false }} />
            <Stack.Screen name="bslatam/my-bookings" options={{ headerShown: false }} />
            <Stack.Screen name="bslatam/speaker-dashboard" options={{ headerShown: false }} />
            <Stack.Screen name="bslatam/admin" options={{ headerShown: false }} />
          </>
        ) : (
          // Main app screens - use a single Stack.Screen
          <Stack.Screen 
            name="dashboard" 
            options={{ 
              headerShown: false
            }}
          />
        )}
      </Stack>
      <PWAPrompt />
    </>
  );
}
