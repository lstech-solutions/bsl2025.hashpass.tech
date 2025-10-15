import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../../i18n/i18n';
import { version } from '../../../package.json';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { isDark, colors } = useTheme();
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


  return (
    <View className="flex-1" style={styles.container}>

      <View className="items-center py-8" style={styles.header}>
        <View className="w-24 h-24 rounded-full bg-indigo-500 items-center justify-center mb-3 relative" >
        
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

      {/* Profile Content */}
      <ScrollView className="flex-1" style={styles.scrollView}>
        {/* Account Information */}
        <View className="mb-6">
          <Text className="px-6 py-2 text-sm font-medium" style={styles.settingsTitle}>
            Account Information
          </Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>
                  {user?.user_metadata?.full_name || 'Not provided'}
                </Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </Text>
              </View>
            </View>
          </View>
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
      </ScrollView>
    </View>
  );
}

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? colors.background.default : colors.background.paper,
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
  scrollView: {
    flex: 1,
    backgroundColor: isDark ? colors.background.paper : colors.background.paper,
  },
  infoCard: {
    backgroundColor: isDark ? colors.background.default : colors.background.paper,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: isDark ? colors.divider : colors.divider,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: isDark ? colors.text.secondary : colors.text.secondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '400',
    color: isDark ? colors.text.primary : colors.text.primary,
  },
});