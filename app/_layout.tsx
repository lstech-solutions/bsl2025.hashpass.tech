import './config/reanimated'; // CRITICAL: Ensure Reanimated is imported and configured first
import 'react-native-gesture-handler'; // Then gesture handler
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from "expo-router";
import { ThemeProvider as NavThemeProvider, DefaultTheme } from '@react-navigation/native';
import { ThemeProvider } from '../providers/ThemeProvider';
import { useTheme, useThemeProvider } from '../hooks/useTheme';
import "./global.css";

export default function RootLayout() {
  const theme = useThemeProvider();
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={theme}>
        <ThemedContent />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function ThemedContent() {
  const { colors } = useTheme();

  return (
    <NavThemeProvider value={{ ...DefaultTheme, colors }}>
      <Stack
        screenOptions={({ route }) => ({
          headerShown: false && route.name.startsWith("/"),
        })}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </NavThemeProvider>
  );
}

