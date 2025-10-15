import { Stack } from 'expo-router';
import { useTheme } from '../../../hooks/useTheme';

export default function BSL2025Layout() {
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
        name="home" 
        options={{
          title: 'BSL2025',
          headerShown: false, // Hide header for home as it has its own
        }}
      />
      <Stack.Screen 
        name="admin" 
        options={{
          title: 'Admin Panel',
          headerBackTitle: 'BSL2025',
          headerBackTitleVisible: true,
        }}
      />
      <Stack.Screen 
        name="my-bookings" 
        options={{
          title: 'My Bookings',
          headerBackTitle: 'BSL2025',
          headerBackTitleVisible: true,
        }}
      />
      <Stack.Screen 
        name="speaker-dashboard" 
        options={{
          title: 'Speaker Dashboard',
          headerBackTitle: 'BSL2025',
          headerBackTitleVisible: true,
        }}
      />
      <Stack.Screen 
        name="speakers" 
        options={{
          headerShown: false, // Let speakers/_layout.tsx handle its own headers
        }}
      />
      <Stack.Screen 
        name="agenda" 
        options={{
          title: 'Event Agenda',
          headerBackTitle: 'BSL2025',
          headerBackTitleVisible: true,
        }}
      />
      <Stack.Screen 
        name="event-info" 
        options={{
          title: 'Event Information',
          headerBackTitle: 'BSL2025',
          headerBackTitleVisible: true,
        }}
      />
    </Stack>
  );
}
