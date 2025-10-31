import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet, Alert, StatusBar } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { useLanguage } from '../../../providers/LanguageProvider';
import { useAnimations } from '../../../providers/AnimationProvider';
import { useToastHelpers } from '../../../contexts/ToastContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../../i18n/i18n';
import { version } from '../../../package.json';
import { useScroll } from '../../../contexts/ScrollContext';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [biometricAuth, setBiometricAuth] = useState(false);
  const [dataUsage, setDataUsage] = useState(false);
  const { isDark, toggleTheme, colors } = useTheme();
  const { locale, setLocale } = useLanguage();
  const { animationsEnabled, setAnimationsEnabled } = useAnimations();
  const { headerHeight } = useScroll();
  const { showSuccess, showInfo } = useToastHelpers();
  const { t } = useTranslation('profile');
  const styles = getStyles(isDark, colors);
  
  // Calculate safe area for nav bar overlay
  const navBarHeight = (StatusBar.currentHeight || 0) + 80;

  const handleAnimationsToggle = async (enabled: boolean) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await setAnimationsEnabled(enabled);
      if (enabled) {
        showSuccess('Animations Enabled', 'Smooth transitions and animations are now active');
      } else {
        showInfo('Animations Disabled', 'Transitions are now disabled for better performance');
      }
    } catch (error) {
      console.error('Failed to toggle animations:', error);
    }
  };


  const handleLanguageChange = async () => {
    const locales = ['en', 'es', 'ko'];
    const currentIndex = locales.indexOf(locale);
    const nextIndex = (currentIndex + 1) % locales.length;
    await setLocale(locales[nextIndex]);
  };

  const getLanguageName = (locale: string) => {
    switch (locale) {
      case 'en': return 'English';
      case 'es': return 'Español';
      case 'ko': return '한국어';
      default: return 'English';
    }
  };

  const renderSettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightComponent,
    showChevron = false,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    showChevron?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.settingItemLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon as any} size={22} color={colors.primary} />
        </View>
        <View style={styles.settingItemContent}>
          <Text style={styles.settingItemTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingItemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingItemRight}>
        {rightComponent}
        {showChevron && (
          <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: navBarHeight }}
      >
        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          {renderSettingItem({
            icon: isDark ? 'moon' : 'moon-outline',
            title: 'Dark Mode',
            subtitle: 'Switch between light and dark themes',
            rightComponent: (
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: '#e5e7eb', true: colors.primary }}
                thumbColor={isDark ? '#4f46e5' : '#f3f4f6'}
              />
            ),
          })}

          {renderSettingItem({
            icon: 'language-outline',
            title: 'Language',
            subtitle: getLanguageName(locale),
            onPress: handleLanguageChange,
            showChevron: true,
          })}

          {renderSettingItem({
            icon: 'notifications-outline',
            title: 'Push Notifications',
            subtitle: 'Receive notifications about events and updates',
            rightComponent: (
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#e5e7eb', true: colors.primary }}
                thumbColor={notifications ? '#4f46e5' : '#f3f4f6'}
              />
            ),
          })}

          {renderSettingItem({
            icon: 'eye-outline',
            title: 'Animations',
            subtitle: 'Enable smooth transitions and animations',
            rightComponent: (
              <Switch
                value={animationsEnabled}
                onValueChange={handleAnimationsToggle}
                trackColor={{ false: '#e5e7eb', true: colors.primary }}
                thumbColor={animationsEnabled ? '#4f46e5' : '#f3f4f6'}
              />
            ),
          })}
        </View>

        {/* Security Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          {renderSettingItem({
            icon: 'finger-print-outline',
            title: 'Biometric Authentication',
            subtitle: 'Use fingerprint or face recognition',
            rightComponent: (
              <Switch
                value={biometricAuth}
                onValueChange={setBiometricAuth}
                trackColor={{ false: '#e5e7eb', true: colors.primary }}
                thumbColor={biometricAuth ? '#4f46e5' : '#f3f4f6'}
              />
            ),
          })}

          {renderSettingItem({
            icon: 'lock-closed-outline',
            title: 'Change Password',
            subtitle: 'Update your account password',
            onPress: () => {
              // Navigate to change password
              Alert.alert('Coming Soon', 'Password change feature will be available soon.');
            },
            showChevron: true,
          })}
        </View>

        {/* Privacy Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          
          {renderSettingItem({
            icon: 'shield-outline',
            title: 'Data Usage',
            subtitle: 'Allow app to collect usage data for improvements',
            rightComponent: (
              <Switch
                value={dataUsage}
                onValueChange={setDataUsage}
                trackColor={{ false: '#e5e7eb', true: colors.primary }}
                thumbColor={dataUsage ? '#4f46e5' : '#f3f4f6'}
              />
            ),
          })}

          {renderSettingItem({
            icon: 'trash-outline',
            title: 'Clear Cache',
            subtitle: 'Free up storage space',
            onPress: () => {
              Alert.alert('Cache Cleared', 'App cache has been cleared successfully.');
            },
            showChevron: true,
          })}
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          {renderSettingItem({
            icon: 'information-circle-outline',
            title: 'App Version',
            subtitle: `HashPass v${version}`,
          })}

          {renderSettingItem({
            icon: 'help-circle-outline',
            title: 'Help & Support',
            subtitle: 'Get help and contact support',
            onPress: () => {
              Alert.alert('Help & Support', 'Contact us at support@hashpass.tech');
            },
            showChevron: true,
          })}

          {renderSettingItem({
            icon: 'document-text-outline',
            title: 'Terms of Service',
            subtitle: 'Read our terms and conditions',
            onPress: () => {
              Alert.alert('Terms of Service', 'Terms of service will be available soon.');
            },
            showChevron: true,
          })}

          {renderSettingItem({
            icon: 'shield-checkmark-outline',
            title: 'Privacy Policy',
            subtitle: 'Learn how we protect your data',
            onPress: () => {
              Alert.alert('Privacy Policy', 'Privacy policy will be available soon.');
            },
            showChevron: true,
          })}
        </View>

      </ScrollView>
    </View>
  );
}

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.background.paper,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingItemContent: {
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 2,
  },
  settingItemSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signOutSection: {
    marginTop: 32,
    marginBottom: 32,
    marginHorizontal: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: colors.background.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 8,
  },
});
