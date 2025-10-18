import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../hooks/useAuth';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useToastHelpers } from '../../../contexts/ToastContext';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.8;
const CARD_SPACING = 16;

interface NetworkingStats {
  totalRequests: number;
  pendingRequests: number;
  acceptedRequests: number;
  declinedRequests: number;
  cancelledRequests: number;
  blockedUsers: number;
  scheduledMeetings: number;
}

interface QuickAccessItem {
  id: string;
  title: string;
  icon: string;
  color: string;
  route: string;
  description: string;
}

export default function NetworkingView() {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToastHelpers();
  const styles = getStyles(isDark, colors);

  const [stats, setStats] = useState<NetworkingStats>({
    totalRequests: 0,
    pendingRequests: 0,
    acceptedRequests: 0,
    declinedRequests: 0,
    cancelledRequests: 0,
    blockedUsers: 0,
    scheduledMeetings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const quickAccessItems: QuickAccessItem[] = [
    {
      id: 'my-requests',
      title: 'My Requests',
      icon: 'mail',
      color: '#4CAF50',
      route: '/events/bsl2025/networking/my-requests',
      description: 'View all your meeting requests',
    },
    {
      id: 'speaker-dashboard',
      title: 'Speaker Dashboard',
      icon: 'dashboard',
      color: '#2196F3',
      route: '/events/bsl2025/speakers/dashboard',
      description: 'Manage incoming requests',
    },
    {
      id: 'find-speakers',
      title: 'Find Speakers',
      icon: 'search',
      color: '#FF9800',
      route: '/events/bsl2025/speakers',
      description: 'Browse all speakers',
    },
    {
      id: 'my-schedule',
      title: 'My Schedule',
      icon: 'event-note',
      color: '#9C27B0',
      route: '/events/bsl2025/networking/schedule',
      description: 'View scheduled meetings',
    },
    {
      id: 'blocked-users',
      title: 'Blocked Users',
      icon: 'block',
      color: '#F44336',
      route: '/events/bsl2025/networking/blocked',
      description: 'Manage blocked users',
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: 'bar-chart',
      color: '#607D8B',
      route: '/events/bsl2025/networking/analytics',
      description: 'View networking statistics',
    },
  ];

  useEffect(() => {
    loadNetworkingStats();
  }, []);

  const loadNetworkingStats = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('🔄 Loading networking stats...');

      // Get user's meeting request statistics
      const { data: userStats, error: userError } = await supabase
        .rpc('get_user_meeting_request_counts', { p_user_id: user.id });

      if (userError) {
        console.error('❌ Error loading user stats:', userError);
      }

      // Get speaker statistics if user is a speaker
      let speakerStats = null;
      if (user.email === 'ecalderon@unal.edu.co') {
        const { data: speakerData, error: speakerError } = await supabase
          .rpc('get_speaker_meeting_requests', { p_speaker_id: 'edward-calderon-speaker' });

        if (!speakerError && speakerData?.success) {
          speakerStats = speakerData;
        }
      }

      // Get blocked users count
      const { data: blockedData, error: blockedError } = await supabase
        .from('user_blocks')
        .select('id', { count: 'exact' })
        .eq('blocker_id', user.id);

      const blockedCount = blockedError ? 0 : (blockedData?.length || 0);

      // Calculate total stats
      const totalRequests = userStats?.total_requests || 0;
      const pendingRequests = userStats?.pending_requests || 0;
      const acceptedRequests = userStats?.approved_requests || 0;
      const declinedRequests = userStats?.declined_requests || 0;
      const cancelledRequests = userStats?.cancelled_requests || 0;

      setStats({
        totalRequests,
        pendingRequests,
        acceptedRequests,
        declinedRequests,
        cancelledRequests,
        blockedUsers: blockedCount,
        scheduledMeetings: acceptedRequests, // Assuming accepted = scheduled
      });

    } catch (error) {
      console.error('❌ Error loading networking stats:', error);
      showError('Error Loading Stats', 'Failed to load networking statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNetworkingStats();
    setRefreshing(false);
  };

  const handleQuickAccess = (item: QuickAccessItem) => {
    // Check if user is trying to access speaker dashboard
    if (item.id === 'speaker-dashboard' && user?.email !== 'ecalderon@unal.edu.co') {
      showError('Access Denied', 'Only speakers can access the speaker dashboard');
      return;
    }

    router.push(item.route as any);
  };

  const renderQuickAccessCard = (item: QuickAccessItem, index: number) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.quickAccessCard, { marginLeft: index === 0 ? 0 : CARD_SPACING }]}
      onPress={() => handleQuickAccess(item)}
    >
      <View style={[styles.cardIcon, { backgroundColor: item.color }]}>
        <MaterialIcons name={item.icon as any} size={32} color="white" />
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDescription}>{item.description}</Text>
    </TouchableOpacity>
  );

  const renderStatsCard = (title: string, value: number, icon: string, color: string) => (
    <View style={styles.statsCard}>
      <View style={[styles.statsIcon, { backgroundColor: color }]}>
        <MaterialIcons name={icon as any} size={24} color="white" />
      </View>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialIcons name="network-check" size={48} color={colors.primary} />
        <Text style={styles.loadingText}>Loading Networking Center...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <MaterialIcons name="people-alt" size={32} color={colors.primary} />
        <Text style={styles.headerTitle}>Networking Center</Text>
        <Text style={styles.headerSubtitle}>Connect with speakers and attendees</Text>
      </View>

      {/* Quick Access Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {quickAccessItems.map((item, index) => renderQuickAccessCard(item, index))}
        </ScrollView>
      </View>

      {/* Statistics Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Networking Stats</Text>
        <View style={styles.statsGrid}>
          {renderStatsCard('Total Requests', stats.totalRequests, 'send', '#4CAF50')}
          {renderStatsCard('Pending', stats.pendingRequests, 'schedule', '#FF9800')}
          {renderStatsCard('Accepted', stats.acceptedRequests, 'check-circle', '#4CAF50')}
          {renderStatsCard('Declined', stats.declinedRequests, 'cancel', '#F44336')}
          {renderStatsCard('Cancelled', stats.cancelledRequests, 'close', '#9E9E9E')}
          {renderStatsCard('Scheduled', stats.scheduledMeetings, 'event', '#2196F3')}
          {renderStatsCard('Blocked', stats.blockedUsers, 'block', '#F44336')}
        </View>
      </View>

      {/* Recent Activity Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityCard}>
          <MaterialIcons name="history" size={24} color={colors.primary} />
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>Your Networking Journey</Text>
            <Text style={styles.activityDescription}>
              You've sent {stats.totalRequests} meeting requests and have {stats.pendingRequests} pending responses.
            </Text>
          </View>
        </View>
      </View>

      {/* Tips Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Networking Tips</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          <View style={[styles.tipCard, { marginLeft: 0 }]}>
            <MaterialIcons name="lightbulb" size={24} color="#FFC107" />
            <Text style={styles.tipTitle}>Be Specific</Text>
            <Text style={styles.tipDescription}>Include clear intentions in your meeting requests</Text>
          </View>
          <View style={[styles.tipCard, { marginLeft: CARD_SPACING }]}>
            <MaterialIcons name="schedule" size={24} color="#4CAF50" />
            <Text style={styles.tipTitle}>Follow Up</Text>
            <Text style={styles.tipDescription}>Send follow-up messages for pending requests</Text>
          </View>
          <View style={[styles.tipCard, { marginLeft: CARD_SPACING }]}>
            <MaterialIcons name="people" size={24} color="#2196F3" />
            <Text style={styles.tipTitle}>Network Smart</Text>
            <Text style={styles.tipDescription}>Focus on quality connections over quantity</Text>
          </View>
        </ScrollView>
      </View>
    </ScrollView>
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
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  horizontalScroll: {
    paddingRight: 20,
  },
  quickAccessCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsCard: {
    width: '30%',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statsTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  tipCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
