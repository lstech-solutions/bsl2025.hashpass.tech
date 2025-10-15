import { Stack } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';

export default function EventsLayout() {
  const { isDark, colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background.paper,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
          shadowColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        headerBackTitleStyle: {
          fontSize: 16,
        },
        contentStyle: {
          backgroundColor: colors.background.default,
        },
        animation: 'slide_from_right',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen 
        name="bsl2025" 
        options={{
          headerShown: false, // Let bsl2025/_layout.tsx handle its own headers
        }}
      />
    </Stack>
  );
}
