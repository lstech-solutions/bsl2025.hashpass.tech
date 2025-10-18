import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../../hooks/useTheme';
import { useAuth } from '../../../../hooks/useAuth';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../../lib/supabase';
import { useToastHelpers } from '../../../../contexts/ToastContext';

interface BlockedUser {
  id: string;
  blocked_user_id: string;
  blocked_user_email: string;
  reason?: string;
  created_at: string;
}

export default function BlockedUsersView() {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToastHelpers();
  const styles = getStyles(isDark, colors);

  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('🔄 Loading blocked users...');

      // Get blocked users for the current user
      const { data, error } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading blocked users:', error);
        throw error;
      }

      console.log('📋 Blocked users loaded:', data?.length || 0);
      setBlockedUsers(data || []);

    } catch (error) {
      console.error('❌ Error loading blocked users:', error);
      showError('Error Loading Blocked Users', 'Failed to load your blocked users list');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBlockedUsers();
    setRefreshing(false);
  };

  const handleUnblockUser = (blockedUser: BlockedUser) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${blockedUser.blocked_user_email}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: () => unblockUser(blockedUser.id),
        },
      ]
    );
  };

  const unblockUser = async (blockId: string) => {
    try {
      console.log('🔄 Unblocking user:', blockId);

      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('id', blockId)
        .eq('blocker_id', user?.id);

      if (error) {
        console.error('❌ Error unblocking user:', error);
        throw error;
      }

      showSuccess('User Unblocked', 'The user has been unblocked successfully');
      await loadBlockedUsers();

    } catch (error) {
      console.error('❌ Error unblocking user:', error);
      showError('Unblock Failed', 'Failed to unblock user. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderBlockedUserCard = (blockedUser: BlockedUser) => (
    <View key={blockedUser.id} style={styles.blockedUserCard}>
      <View style={styles.userInfo}>
        <View style={styles.userAvatar}>
          <MaterialIcons name="person" size={24} color={colors.textSecondary} />
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userEmail}>{blockedUser.blocked_user_email}</Text>
          <Text style={styles.blockDate}>
            Blocked on {formatDate(blockedUser.created_at)}
          </Text>
          {blockedUser.reason && (
            <Text style={styles.blockReason}>
              Reason: {blockedUser.reason}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.unblockButton}
        onPress={() => handleUnblockUser(blockedUser)}
      >
        <MaterialIcons name="lock-open" size={20} color="#4CAF50" />
        <Text style={styles.unblockButtonText}>Unblock</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialIcons name="block" size={48} color={colors.primary} />
        <Text style={styles.loadingText}>Loading blocked users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {blockedUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="block" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Blocked Users</Text>
            <Text style={styles.emptyDescription}>
              You haven't blocked any users yet. Blocked users won't be able to send you meeting requests.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Blocked Users Summary</Text>
              <View style={styles.summaryStats}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{blockedUsers.length}</Text>
                  <Text style={styles.summaryLabel}>Total Blocked</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#F44336' }]}>
                    {blockedUsers.filter(u => u.reason).length}
                  </Text>
                  <Text style={styles.summaryLabel}>With Reasons</Text>
                </View>
              </View>
            </View>

            {blockedUsers.map(renderBlockedUserCard)}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: colors.card,
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  blockedUserCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  blockDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  blockReason: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  unblockButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});
