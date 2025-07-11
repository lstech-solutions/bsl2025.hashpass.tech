import './config/reanimated'; // CRITICAL: Ensure Reanimated is imported and configured first
import 'react-native-gesture-handler'; // Then gesture handler
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useLocalSearchParams, usePathname } from "expo-router";
import React from 'react';
import { ThemeProvider as NavThemeProvider, DefaultTheme } from '@react-navigation/native';
import { ThemeProvider } from '../providers/ThemeProvider';
import { LanguageProvider } from '../contexts/LanguageContext';
import { useTheme, useThemeProvider } from '../hooks/useTheme';
import { StatusBar } from 'react-native';
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


  return (
    <NavThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background.default,
          },
          animation: 'slide_from_right',
          animationTypeForReplace: 'push',
          headerTintColor: colors.text.primary as string, // Explicit type assertion
          headerTitleStyle: {
            fontWeight: '600',
            color: colors.text.primary as string, // Explicit type assertion
          },
          headerShadowVisible: false,
        }}
        initialRouteName="index"
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="+not-found" 
          options={{
            title: 'Not Found',
            headerShown: true,
          }}
        />
      </Stack>
    </NavThemeProvider>
  );
}

