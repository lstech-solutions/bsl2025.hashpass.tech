import React from 'react';
import { Tabs } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Custom Scan Button Component
const ScanButton = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity
      onPress={() => router.push('/scan')} // Navigate to the dedicated scan screen
      style={[styles.scanButton, { bottom: insets.bottom + 10 }]} // Adjust position based on safe area
    >
      <Ionicons name="qr-code-sharp" size={32} color="#FFFFFF" />
    </TouchableOpacity>
  );
};

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#9E7FFF', // Primary color from palette
        tabBarInactiveTintColor: '#A3A3A3', // Secondary text color from palette
        tabBarStyle: {
          backgroundColor: '#171717', // Background color from palette
          borderTopWidth: 1,
          borderTopColor: '#2F2F2F', // Border color from palette
          height: 80, // Increased height for better spacing
          paddingBottom: 10, // Add padding for safe area
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
        }}
      />
      {/* Placeholder for the central scan button */}
      <Tabs.Screen
        name="scan-placeholder" // This screen won't render anything, just provides the button
        options={{
          title: "", // No label
          tabBarButton: (props) => <ScanButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Wallet",
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scanButton: {
    backgroundColor: '#f472b6', // Accent color from palette
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -30, // Adjust to float above the tab bar
    alignSelf: 'center',
    shadowColor: '#f472b6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 4,
    borderColor: '#171717', // Background color to create a "cutout" effect
  },
});
