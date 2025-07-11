import './config/reanimated'; // CRITICAL: Ensure Reanimated is imported and configured first
import 'react-native-gesture-handler'; // Then gesture handler
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from "expo-router";
import { ThemeProvider as NavThemeProvider, DefaultTheme } from '@react-navigation/native';
import { ThemeProvider } from '../providers/ThemeProvider';
import { useTheme, useThemeProvider } from '../hooks/useTheme';
import { StatusBar, ViewStyle, StyleSheet } from 'react-native';
import "./global.css";

export default function RootLayout() {
  const theme = useThemeProvider();
  
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ThemeProvider value={theme}>
        <StatusBar 
          barStyle={theme.isDark ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />
        <ThemedContent />
      </ThemeProvider>
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
      background: colors.background,
      card: colors.card || colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.notification,
    },
  };

  // Create styles with proper typing
  const styles = StyleSheet.create({
    header: {
      backgroundColor: colors.card || colors.surface,
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 0,
    },
  });

  return (
    <NavThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
          animation: 'slide_from_right',
          animationTypeForReplace: 'push',
          headerStyle: styles.header,
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '600',
            color: colors.text,
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen 
          name="(tabs)" 
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

