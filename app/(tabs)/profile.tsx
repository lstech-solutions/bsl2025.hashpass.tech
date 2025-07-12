import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../providers/LanguageProvider';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation} from '../../i18n/i18n';
import { version } from '../../package.json';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [biometricAuth, setBiometricAuth] = useState(false);
  const { locale, setLocale } = useLanguage();
  const router = useRouter();
  const { isDark, toggleTheme, colors } = useTheme();
  const { t } = useTranslation('profile');
  const styles = getStyles(isDark, colors);

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
        <Text className="ml-4 text-base font-medium" style={styles.settingItemText}>
          {title}
        </Text>
      </View>
      {rightComponent}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1" style={styles.container}>
      <View className="items-center py-8" style={styles.header}>
        <View className="w-24 h-24 rounded-full bg-indigo-500 items-center justify-center mb-3" >
          {user?.user_metadata?.avatar_url ? (
            <Image
              source={{ uri: user.user_metadata.avatar_url }}
              className="w-full h-full rounded-full"
            />
          ) : (
            <Text className="text-3xl font-bold" style={styles.headerText}>
              {user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </Text>
          )}
        </View>
        <Text className="text-xl font-bold" style={styles.headerText}>
          {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
        </Text>
        <Text style={styles.headerText}>{user?.email}</Text>
      </View>

      {/* App Settings */}
      <View className="mt-6 mb-4">
        <Text className="px-6 py-2 text-sm font-medium" style={styles.settingsTitle}>
          {t('settings.title')}
        </Text>

        {renderSettingItem({
          icon: isDark ? 'moon' : 'moon-outline',
          title: t('settings.darkMode'),
          rightComponent: (
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#e5e7eb', true: '#818cf8' }}
              thumbColor={isDark ? '#4f46e5' : '#f3f4f6'}
            />
          ),
        })}

        {renderSettingItem({
          icon: 'notifications-outline',
          title: t('settings.notifications'),
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
          {t('settings.account')}
        </Text>

        {renderSettingItem({
          icon: 'language-outline',
          title: t('settings.language'),
          onPress: () => {
            const locales = ['en', 'es', 'ko'];
            const currentIndex = locales.indexOf(locale);
            const nextIndex = (currentIndex + 1) % locales.length;
            setLocale(locales[nextIndex]);
          }, rightComponent: (
            <View className="flex-row items-center">
              <Text className="text-gray-500 dark:text-gray-400 mr-2">
                {locale === 'en' ? 'English' :
                  locale === 'es' ? 'Español' :
                  locale === 'ko' ? '한국어' : 'English'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </View>
          ),
        })}

        {renderSettingItem({
          icon: 'lock-closed-outline',
          title: t('settings.changePassword'),
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
          <Text className="text-white font-medium">{t('signOut')}</Text>
        </TouchableOpacity>

        <Text className="text-center mt-4 text-xs text-gray-500 dark:text-gray-400">
          HashPass v{version}
        </Text>
      </View>
    </View>
  );
}


const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: isDark ? colors.background.default : colors.background.paper,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '500',
    color: isDark ? colors.text.primary : colors.text.primary,
  },
  settingsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? colors.text.secondary : colors.text.secondary,
  },
  settingItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: isDark ? colors.text.primary : colors.text.primary,
  },
  settingItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? colors.divider : colors.divider,
  },
});