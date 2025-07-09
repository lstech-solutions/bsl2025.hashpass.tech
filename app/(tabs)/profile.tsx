import React, { useState, useEffect } from 'react';
import { View, Text, Switch, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

type ThemeType = 'light' | 'dark' | 'system';
type LanguageType = 'en' | 'es' | 'fr';

export default function ProfileScreen() {
  const { user, loading, signOut } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [biometricAuth, setBiometricAuth] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageType>('en');
  const [theme, setTheme] = useState<ThemeType>('system');
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const renderSettingItem = ({
    icon,
    title,
    onPress,
    rightComponent,
  }: {
    icon: string;
    title: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
  }) => (
    <TouchableOpacity
      className="flex-row items-center justify-between py-4 px-6 border-b border-gray-100 dark:border-gray-800"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center">
        <Ionicons name={icon as any} size={22} color="#6366f1" />
        <Text className="ml-4 text-base font-medium text-gray-900 dark:text-gray-100">
          {title}
        </Text>
      </View>
      {rightComponent}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <View className="items-center py-8 bg-indigo-600 dark:bg-indigo-800">
        <View className="w-24 h-24 rounded-full bg-indigo-500 items-center justify-center mb-3">
          {user?.user_metadata?.avatar_url ? (
            <Image
              source={{ uri: user.user_metadata.avatar_url }}
              className="w-full h-full rounded-full"
            />
          ) : (
            <Text className="text-3xl font-bold text-white">
              {user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </Text>
          )}
        </View>
        <Text className="text-xl font-bold text-white">
          {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
        </Text>
        <Text className="text-indigo-100">{user?.email}</Text>
      </View>

      {/* App Settings */}
      <View className="mt-6 mb-4">
        <Text className="px-6 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">
          APP SETTINGS
        </Text>
        
        {renderSettingItem({
          icon: 'moon-outline',
          title: 'Dark Mode',
          rightComponent: (
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#e5e7eb', true: '#818cf8' }}
              thumbColor={darkMode ? '#4f46e5' : '#f3f4f6'}
            />
          ),
        })}

        {renderSettingItem({
          icon: 'notifications-outline',
          title: 'Notifications',
          rightComponent: (
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#e5e7eb', true: '#818cf8' }}
              thumbColor={notifications ? '#4f46e5' : '#f3f4f6'}
            />
          ),
        })}

        {renderSettingItem({
          icon: 'finger-print-outline',
          title: 'Biometric Authentication',
          rightComponent: (
            <Switch
              value={biometricAuth}
              onValueChange={setBiometricAuth}
              trackColor={{ false: '#e5e7eb', true: '#818cf8' }}
              thumbColor={biometricAuth ? '#4f46e5' : '#f3f4f6'}
            />
          ),
        })}
      </View>

      {/* Account Settings */}
      <View className="mb-4">
        <Text className="px-6 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">
          ACCOUNT
        </Text>
        
        {renderSettingItem({
          icon: 'language-outline',
          title: 'Language',
          onPress: () => {
            // Navigate to language selection
          },
          rightComponent: (
            <View className="flex-row items-center">
              <Text className="text-gray-500 dark:text-gray-400 mr-2">
                {selectedLanguage === 'en' ? 'English' : 
                 selectedLanguage === 'es' ? 'Español' : 'Français'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </View>
          ),
        })}

        {renderSettingItem({
          icon: 'lock-closed-outline',
          title: 'Change Password',
          onPress: () => {
            // Navigate to change password
          },
        })}
      </View>

      {/* Actions */}
      <View className="mt-auto mb-8 px-6">
        <TouchableOpacity
          className="py-3 bg-indigo-600 rounded-lg items-center"
          onPress={handleSignOut}
        >
          <Text className="text-white font-medium">Sign Out</Text>
        </TouchableOpacity>
        
        <Text className="text-center mt-4 text-xs text-gray-500 dark:text-gray-400">
          HashPass v1.0.0
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
