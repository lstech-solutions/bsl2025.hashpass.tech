import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useTheme } from '../../../../hooks/useTheme';
import { useAuth } from '../../../../hooks/useAuth';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../../lib/supabase';
import { useToastHelpers } from '../../../../contexts/ToastContext';
import SpeakerAvatar from '../../../../components/SpeakerAvatar';
import MeetingChat from '../../../../components/MeetingChat';

interface ScheduledMeeting {
  id: string;
  meeting_request_id?: string;
  speaker_id: string;
  requester_id: string;
  speaker_name: string;
  requester_name: string;
  requester_company?: string;
  requester_title?: string;
  meeting_type?: string;
  scheduled_at?: string;
  location?: string;
  meeting_link?: string;
  notes?: string;
  status: string;
  created_at: string;
  updated_at: string;
  is_speaker: boolean; // Whether current user is the speaker
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
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadScheduledMeetings();
    }
  }, [user]);

  const loadScheduledMeetings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Loading scheduled meetings...');

      // Try RPC function first
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_user_meetings', { p_user_id: user.id });

      if (rpcError) {
        console.warn('⚠️ RPC function failed, trying direct query:', rpcError);
        
        // Fallback to direct query
        const { data: directData, error: directError } = await supabase
          .from('meetings')
          .select('*')
          .or(`requester_id.eq.${user.id},speaker_id.in.(SELECT id FROM bsl_speakers WHERE user_id.eq.${user.id})`)
          .order('created_at', { ascending: false });

        if (directError) {
          console.error('❌ Direct query also failed:', directError);
          throw directError;
        }

        // Process direct query results
        const meetingsWithSpeakerStatus = await Promise.all((directData || []).map(async (m: any) => {
          const { data: speakerData } = await supabase
            .from('bsl_speakers')
            .select('user_id')
            .eq('id', m.speaker_id)
            .single();

          return {
            ...m,
            is_speaker: speakerData?.user_id === user.id,
          };
        }));

        console.log('📋 Scheduled meetings loaded via direct query:', meetingsWithSpeakerStatus.length);
        setMeetings(meetingsWithSpeakerStatus);
        return;
      }

      // Process RPC results
      if (rpcData && rpcData.success && rpcData.meetings) {
        const meetingsWithSpeakerStatus = await Promise.all(rpcData.meetings.map(async (m: any) => {
          const { data: speakerData } = await supabase
            .from('bsl_speakers')
            .select('user_id')
            .eq('id', m.speaker_id)
            .single();

          return {
            ...m,
            is_speaker: speakerData?.user_id === user.id,
          };
        }));

        console.log('📋 Scheduled meetings loaded via RPC:', meetingsWithSpeakerStatus.length);
        setMeetings(meetingsWithSpeakerStatus);
      } else {
        console.log('📋 No meetings found');
        setMeetings([]);
      }

    } catch (error) {
      console.error('❌ Error loading scheduled meetings:', error);
      showError('Error Loading Schedule', 'Failed to load your scheduled meetings. Please try again.');
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadScheduledMeetings();
    setRefreshing(false);
  };

  const handleOpenChat = (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    setShowChatModal(true);
  };

  const handleCloseChat = () => {
    setShowChatModal(false);
    setSelectedMeetingId(null);
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
      case 'scheduled': return '#2196F3';
      case 'confirmed': return '#4CAF50';
      case 'completed': return '#9E9E9E';
      case 'cancelled': return '#F44336';
      default: return '#FF9800';
    }
  };

  const renderMeetingCard = (meeting: ScheduledMeeting) => (
    <View key={meeting.id} style={styles.meetingCard}>
      <View style={styles.meetingHeader}>
        <View style={styles.speakerInfo}>
          <SpeakerAvatar
            name={meeting.is_speaker ? meeting.requester_name : meeting.speaker_name}
            imageUrl={null}
            size={50}
          />
          <View style={styles.speakerDetails}>
            <Text style={styles.speakerName}>
              {meeting.is_speaker ? meeting.requester_name : meeting.speaker_name}
            </Text>
            <Text style={styles.meetingType}>
              {meeting.is_speaker ? 'Meeting with attendee' : 'Meeting with speaker'}
            </Text>
            {meeting.meeting_type && (
              <Text style={styles.meetingTypeDetail}>{meeting.meeting_type}</Text>
            )}
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getMeetingStatusColor(meeting.status) }]}>
          <MaterialIcons name="check-circle" size={16} color="white" />
          <Text style={styles.statusText}>{meeting.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.meetingContent}>
        {meeting.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText} numberOfLines={2}>
              {meeting.notes}
            </Text>
          </View>
        )}

        <View style={styles.meetingMeta}>
          {meeting.scheduled_at && (
            <View style={styles.metaItem}>
              <MaterialIcons name="schedule" size={16} color={colors.textSecondary} />
              <Text style={styles.metaText}>
                {formatDate(meeting.scheduled_at)}
              </Text>
            </View>
          )}
          {meeting.location && (
            <View style={styles.metaItem}>
              <MaterialIcons name="location-on" size={16} color={colors.textSecondary} />
              <Text style={styles.metaText}>{meeting.location}</Text>
            </View>
          )}
          {meeting.meeting_link && (
            <View style={styles.metaItem}>
              <MaterialIcons name="link" size={16} color={colors.textSecondary} />
              <Text style={styles.metaText}>Meeting Link Available</Text>
            </View>
          )}
        </View>

        <View style={styles.meetingActions}>
          {meeting.meeting_link && (
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="videocam" size={20} color={colors.primary} />
              <Text style={styles.actionButtonText}>Join Meeting</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.actionButton, styles.chatButton]}
            onPress={() => handleOpenChat(meeting.id)}
          >
            <MaterialIcons name="chat" size={20} color="white" />
            <Text style={[styles.actionButtonText, { color: 'white' }]}>Open Chat</Text>
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
      <Stack.Screen 
        options={{ 
          title: 'My Schedule',
          headerBackTitle: 'Networking',
        }} 
      />

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
                    {meetings.filter(m => m.status === 'confirmed').length}
                  </Text>
                  <Text style={styles.summaryLabel}>Confirmed</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#FF9800' }]}>
                    {meetings.filter(m => m.status === 'scheduled').length}
                  </Text>
                  <Text style={styles.summaryLabel}>Scheduled</Text>
                </View>
              </View>
            </View>

            {meetings.map(renderMeetingCard)}
          </>
        )}
      </ScrollView>

      {/* Meeting Chat Modal */}
      {showChatModal && selectedMeetingId && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={showChatModal}
          onRequestClose={handleCloseChat}
        >
          <MeetingChat
            meetingId={selectedMeetingId}
            onClose={handleCloseChat}
          />
        </Modal>
      )}
    </View>
  );
}

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background?.default || (isDark ? '#000000' : '#ffffff'),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background?.default || (isDark ? '#000000' : '#ffffff'),
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
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
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
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
    backgroundColor: colors.card?.default || (isDark ? '#1a1a1a' : '#ffffff'),
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: isDark ? '#000000' : '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
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
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
    marginTop: 4,
  },
  meetingCard: {
    backgroundColor: colors.card?.default || (isDark ? '#1a1a1a' : '#ffffff'),
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: isDark ? '#000000' : '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
  },
  meetingType: {
    fontSize: 12,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
    marginTop: 2,
  },
  meetingTypeDetail: {
    fontSize: 10,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
    marginTop: 1,
    fontStyle: 'italic',
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
  notesContainer: {
    marginBottom: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
    marginBottom: 2,
  },
  notesText: {
    fontSize: 12,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
    fontStyle: 'italic',
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
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
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
    backgroundColor: colors.background?.paper || (isDark ? '#2a2a2a' : '#f5f5f5'),
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
  chatButton: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
});
