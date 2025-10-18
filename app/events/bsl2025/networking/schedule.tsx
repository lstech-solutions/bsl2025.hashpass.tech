import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../../hooks/useTheme';
import { useAuth } from '../../../../hooks/useAuth';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../../lib/supabase';
import { useToastHelpers } from '../../../../contexts/ToastContext';
import SpeakerAvatar from '../../../../components/SpeakerAvatar';

interface ScheduledMeeting {
  id: string;
  speaker_id: string;
  speaker_name: string;
  speaker_imageurl?: string;
  requester_name: string;
  requester_company: string;
  meeting_type: string;
  message: string;
  note: string;
  duration_minutes: number;
  status: string;
  created_at: string;
  speaker_response_at: string;
  scheduled_time?: string;
}

export default function ScheduleView() {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToastHelpers();
  const styles = getStyles(isDark, colors);

  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadScheduledMeetings();
  }, []);

  const loadScheduledMeetings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('🔄 Loading scheduled meetings...');

      // Get accepted/approved meeting requests
      const { data, error } = await supabase
        .from('meeting_requests')
        .select(`
          *,
          speakers:speaker_id (
            id,
            name,
            title,
            imageurl
          )
        `)
        .eq('requester_id', user.id)
        .in('status', ['accepted', 'approved'])
        .order('speaker_response_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading meetings:', error);
        throw error;
      }

      console.log('📋 Scheduled meetings loaded:', data?.length || 0);
      setMeetings(data || []);

    } catch (error) {
      console.error('❌ Error loading scheduled meetings:', error);
      showError('Error Loading Schedule', 'Failed to load your scheduled meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadScheduledMeetings();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMeetingStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return '#4CAF50';
      case 'approved': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const renderMeetingCard = (meeting: ScheduledMeeting) => (
    <View key={meeting.id} style={styles.meetingCard}>
      <View style={styles.meetingHeader}>
        <View style={styles.speakerInfo}>
          <SpeakerAvatar
            speaker={{
              id: meeting.speaker_id,
              name: meeting.speaker_name,
              imageurl: meeting.speakers?.imageurl || null,
            }}
            size={50}
          />
          <View style={styles.speakerDetails}>
            <Text style={styles.speakerName}>{meeting.speaker_name}</Text>
            <Text style={styles.meetingType}>{meeting.meeting_type}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getMeetingStatusColor(meeting.status) }]}>
          <MaterialIcons name="check-circle" size={16} color="white" />
          <Text style={styles.statusText}>SCHEDULED</Text>
        </View>
      </View>

      <View style={styles.meetingContent}>
        <Text style={styles.meetingMessage} numberOfLines={2}>
          {meeting.message || 'No message provided'}
        </Text>
        
        {meeting.note && (
          <View style={styles.intentionsContainer}>
            <Text style={styles.intentionsLabel}>Intentions:</Text>
            <Text style={styles.intentionsText} numberOfLines={2}>
              {meeting.note}
            </Text>
          </View>
        )}

        <View style={styles.meetingMeta}>
          <View style={styles.metaItem}>
            <MaterialIcons name="schedule" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>{meeting.duration_minutes} minutes</Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="event" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              {formatDate(meeting.speaker_response_at)}
            </Text>
          </View>
        </View>

        <View style={styles.meetingActions}>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="videocam" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Join Meeting</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="message" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialIcons name="schedule" size={48} color={colors.primary} />
        <Text style={styles.loadingText}>Loading your schedule...</Text>
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
        <Text style={styles.headerTitle}>My Schedule</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {meetings.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="schedule" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Scheduled Meetings</Text>
            <Text style={styles.emptyDescription}>
              You don't have any scheduled meetings yet. Send meeting requests to speakers to get started!
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push('/events/bsl2025/speakers')}
            >
              <Text style={styles.browseButtonText}>Browse Speakers</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Meeting Summary</Text>
              <View style={styles.summaryStats}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{meetings.length}</Text>
                  <Text style={styles.summaryLabel}>Scheduled</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                    {meetings.filter(m => m.status === 'approved').length}
                  </Text>
                  <Text style={styles.summaryLabel}>Confirmed</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#FF9800' }]}>
                    {meetings.filter(m => m.status === 'accepted').length}
                  </Text>
                  <Text style={styles.summaryLabel}>Pending</Text>
                </View>
              </View>
            </View>

            {meetings.map(renderMeetingCard)}
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
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  meetingCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  meetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  speakerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  speakerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  speakerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  meetingType: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  meetingContent: {
    flex: 1,
  },
  meetingMessage: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  intentionsContainer: {
    marginBottom: 8,
  },
  intentionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  intentionsText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  meetingMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  meetingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});
