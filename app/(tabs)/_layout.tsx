import React from 'react';
import { Tabs } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, StyleSheet, View, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { themeShadows, themeSpacing, themeBorderRadius } from '../../lib/theme';

// Custom Scan Button Component
const ScanButton = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.scanButtonContainer, { bottom: insets.bottom + themeSpacing.sm }]}>
      <TouchableOpacity
        onPress={() => router.push('/scan')}
        style={[
          styles.scanButton,
          { 
            backgroundColor: colors.secondary,
            ...themeShadows.medium,
            shadowColor: colors.secondary,
          }
        ]}
        activeOpacity={0.8}
      >
        <Ionicons name="qr-code-sharp" size={28} color={colors.primaryContrastText} />
      </TouchableOpacity>
    </View>
  );
};

export default function Layout() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar 
        barStyle={colors.background.default === '#121212' ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.background.default}
      />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.text.primary,
          tabBarStyle: {
            backgroundColor: colors.background.default,
            borderTopWidth: 0,
            height: 60,
            paddingBottom: 0,
            ...themeShadows.small,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontFamily: 'Inter-SemiBold',
            marginBottom: themeSpacing.xs,
          },
          tabBarItemStyle: {
            paddingVertical: themeSpacing.xs,
          },
          tabBarIconStyle: {
            marginBottom: -themeSpacing.xs,
          },
        }}
      >
        <Tabs.Screen
          name="explore"
          options={{
            title: "Explore",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="compass-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="scan-placeholder"
          options={{
            title: "",
            tabBarButton: () => <ScanButton />,
          }}
        />
        <Tabs.Screen
          name="wallet"
          options={{
            title: "Wallet",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="wallet-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  scanButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  scanButton: {
    width: 60,
    height: 60,
    borderRadius: themeBorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    top: -themeSpacing.md,
    borderWidth: 4,
    borderColor: 'transparent',
  },
});
