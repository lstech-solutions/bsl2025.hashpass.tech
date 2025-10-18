import { Stack } from 'expo-router';
import { useTheme } from '../../../hooks/useTheme';
import { ScrollProvider } from '../../../contexts/ScrollContext';

export default function BSL2025Layout() {
  const { isDark, colors } = useTheme();

  return (
    <ScrollProvider>
      <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background.paper,
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
        }}
      />
      <Stack.Screen 
        name="my-bookings" 
        options={{
          title: 'My Bookings',
          headerBackTitle: 'BSL2025',
        }}
      />
      <Stack.Screen 
        name="speaker-dashboard" 
        options={{
          headerShown: false, // Hide header as dashboard has its own custom header
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
        }}
      />
      <Stack.Screen 
        name="event-info" 
        options={{
          title: 'Event Information',
          headerBackTitle: 'BSL2025',
        }}
      />
      <Stack.Screen 
        name="networking" 
        options={{
          title: 'Networking Center',
          headerBackTitle: 'BSL2025',
        }}
      />
      <Stack.Screen 
        name="networking/my-requests" 
        options={{
          title: 'My Meeting Requests',
          headerBackTitle: 'Networking',
        }}
      />
      <Stack.Screen 
        name="networking/analytics" 
        options={{
          title: 'System Analytics',
          headerBackTitle: 'Networking',
        }}
      />
      <Stack.Screen 
        name="networking/schedule" 
        options={{
          title: 'My Schedule',
          headerBackTitle: 'Networking',
        }}
      />
      <Stack.Screen 
        name="networking/blocked" 
        options={{
          title: 'Blocked Users',
          headerBackTitle: 'Networking',
        }}
      />
      </Stack>
    </ScrollProvider>
  );
}
