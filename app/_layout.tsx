import '../config/reanimated'; // CRITICAL: Ensure Reanimated is imported and configured first
import 'react-native-gesture-handler'; // Then gesture handler
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, usePathname, useRouter } from "expo-router";
import React from 'react';
import { ThemeProvider as NavThemeProvider, DefaultTheme } from '@react-navigation/native';
import { ThemeProvider } from '../providers/ThemeProvider';
import { LanguageProvider } from '../providers/LanguageProvider';
import { useTheme, useThemeProvider } from '../hooks/useTheme';
import { StatusBar } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import "./global.css";

export default function RootLayout() {
  const theme = useThemeProvider();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background.default }}>
      <LanguageProvider>
        <ThemeProvider value={theme}>
            <StatusBar 
              barStyle={theme.isDark ? 'light-content' : 'dark-content'}
              backgroundColor={theme.colors.background.default}
            />
            <ThemedContent />
          </ThemeProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}

function ThemedContent() {
  const { colors, isDark } = useTheme();
  const pathname = usePathname();
  const { user } = useAuth();
  const router = useRouter();

  const navigationTheme = {
    ...DefaultTheme,
    dark: isDark,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.primary,
      background: colors.background.default,
      card: colors.background.paper,
      text: colors.text.primary,
      border: colors.divider,
      notification: colors.error.main,
    },
  };

  React.useEffect(() => {
    if (!user && (pathname !== '/auth' && pathname !== '/')) {
      supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
        if (!session) {
          supabase.auth.signOut();
          router.replace('/auth');
        }
      });
    }
  }, [user, pathname]);

  return (
    <NavThemeProvider value={navigationTheme}>
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
        <Stack.Screen 
          name="(tabs)"
          options={{
            headerShown: false,
            title: 'Tabs',
          }}
        />
        <Stack.Screen 
          name="auth"
          options={{
            headerShown: false,
            title: 'Sign In',
          }}
        />
        <Stack.Screen 
          name="+not-found" 
          options={{
            title: 'Not Found',
            headerShown: false,
          }}
        />
      </Stack>
    </NavThemeProvider>
  );
}

