import '../config/reanimated'; // CRITICAL: Ensure Reanimated is imported and configured first
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, usePathname, useRouter } from "expo-router";
import React, { useEffect, useState } from 'react';
import { ThemeProvider } from '../providers/ThemeProvider';
import { LanguageProvider } from '../providers/LanguageProvider';
import { useTheme, useThemeProvider } from '../hooks/useTheme';
import { StatusBar, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import "./global.css";
import PWAPrompt from './components/PWAPrompt';
import { ActivityIndicator } from 'react-native';
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
  const { colors, isDark } = useTheme();
  const pathname = usePathname();
  const { isLoggedIn, isLoading } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      setIsReady(true);
    }
  }, [isLoading]);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);


  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.default }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={({ route }) => ({
          headerShown: (route.name !== 'index' && route.name !== 'auth') && false,
          contentStyle: {
            backgroundColor: isDark ? colors.primaryDark : colors.background.paper,
          },
          animation: 'slide_from_right',
          animationTypeForReplace: 'push',
          headerTintColor: colors.text.primary as string,
          headerTitleStyle: {
            fontWeight: '600',
            color: colors.text.primary as string,
          },
          headerShadowVisible: false,
        })}
      >
        <Stack.Protected guard={isLoggedIn}>
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
              title: 'Tabs',
            }}

          />
        </Stack.Protected>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
      </Stack>
      <PWAPrompt />
    </>
  );
}
