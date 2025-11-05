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
import { EventProvider } from '../contexts/EventContext';
import { ToastProvider } from '../contexts/ToastContext';
import { ScrollProvider } from '../contexts/ScrollContext';
import { useTheme, useThemeProvider } from '../hooks/useTheme';
import { StatusBar } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import "./global.css";
import PWAPrompt from '../components/PWAPrompt';
import * as SplashScreen from 'expo-splash-screen';
import { I18nProvider } from '../providers/I18nProvider';

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
          <EventProvider>
            <LanguageProvider>
              <I18nProvider>
                <ToastProvider>
                  <ScrollProvider>
                    <ThemedContent />
                  </ScrollProvider>
                </ToastProvider>
              </I18nProvider>
            </LanguageProvider>
          </EventProvider>
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
  const isAuthFlow = (segments[0] === '(shared)' && segments[1] === 'auth') || pathname.startsWith('/(shared)/auth');
  const isBSLPublic = pathname.startsWith('/events/bsl2025');
  const isHomePage = pathname === '/home' || pathname === '/' || pathname === '/index';

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
      if (!isLoggedIn && !isAuthFlow && !isBSLPublic && !isHomePage) {
        router.replace('/(shared)/auth' as any);
      }
    }
  }, [isLoggedIn, isAuthFlow, isBSLPublic, isHomePage, isReady, isLoading, router]);

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
          headerStyle: {
            backgroundColor: isDark ? '#0A0A0A' : colors.background.default,
          } as any, // Type assertion to handle platform-specific styles
          headerTintColor: isDark ? '#FFFFFF' : colors.text.primary,
          headerTitleStyle: {
            color: isDark ? '#FFFFFF' : colors.text.primary,
            fontWeight: '600',
          },
          headerBackTitle: undefined,
          animation: 'slide_from_right',
          animationTypeForReplace: 'push',
        }}
      >
        {/* Always register routes to avoid linking mismatches */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(shared)/auth" options={{ headerShown: false }} />
        <Stack.Screen name="(shared)/auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="(shared)/privacy" options={{ headerShown: false }} />
        <Stack.Screen name="(shared)/terms" options={{ headerShown: false }} />
        <Stack.Screen name="privacy" options={{ headerShown: false }} />
        <Stack.Screen name="terms" options={{ headerShown: false }} />
        <Stack.Screen 
          name="(shared)/dashboard" 
          options={{ 
            headerShown: false
          }}
        />
        <Stack.Screen 
          name="(shared)/dashboard/qr-view" 
          options={{ 
            headerShown: false
          }}
        />
        <Stack.Screen 
          name="(shared)/dashboard/pass-details" 
          options={{ 
            headerShown: false
          }}
        />
        {/* Public BSL routes */}
        <Stack.Screen name="events/bsl2025/home" options={{ headerShown: false }} />
        <Stack.Screen name="events/bsl2025/speakers/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="events/bsl2025/speakers/calendar" options={{ headerShown: false }} />
        <Stack.Screen name="events/bsl2025/my-bookings" options={{ headerShown: false }} />
        <Stack.Screen name="events/bsl2025/speaker-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="events/bsl2025/admin" options={{ headerShown: false }} />
      </Stack>
      <PWAPrompt />
    </>
  );
}
