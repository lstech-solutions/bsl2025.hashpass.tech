import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useToastHelpers } from '../contexts/ToastContext';
import MeetingChat from './MeetingChat';

interface Meeting {
  id: string;
  meeting_request_id: string;
  speaker_id: string;
  requester_id: string;
  speaker_name: string;
  requester_name: string;
  requester_company?: string;
  requester_title?: string;
  meeting_type: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  scheduled_at?: string;
  duration_minutes: number;
  location?: string;
  meeting_link?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface MeetingsListProps {
  onClose: () => void;
}

export default function MeetingsList({ onClose }: MeetingsListProps) {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const { showError } = useToastHelpers();
  const styles = getStyles(isDark, colors);

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .or(`requester_id.eq.${user.id},speaker_id.in.(${await getSpeakerIds()})`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading meetings:', error);
        showError('Error', 'Failed to load meetings');
        return;
      }

      setMeetings(data || []);
    } catch (error) {
      console.error('Error loading meetings:', error);
      showError('Error', 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const getSpeakerIds = async () => {
    if (!user) return '';
    
    const { data } = await supabase
      .from('bsl_speakers')
      .select('id')
      .eq('user_id', user.id);
    
    return data?.map(s => s.id).join(',') || '';
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMeetings();
    setRefreshing(false);
  };

  const handleMeetingPress = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
  };

  const handleCloseChat = () => {
    setSelectedMeeting(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#f59e0b';
      case 'confirmed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'completed': return '#6b7280';
      case 'cancelled': return '#ef4444';
      case 'no_show': return '#f97316';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return 'schedule';
      case 'confirmed': return 'check-circle';
      case 'in_progress': return 'play-circle';
      case 'completed': return 'done';
      case 'cancelled': return 'cancel';
      case 'no_show': return 'person-off';
      default: return 'help';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMeeting = (meeting: Meeting) => {
    const isSpeaker = meeting.speaker_id !== user?.id;
    const otherPersonName = isSpeaker ? meeting.speaker_name : meeting.requester_name;

    return (
      <TouchableOpacity
        key={meeting.id}
        style={styles.meetingCard}
        onPress={() => handleMeetingPress(meeting)}
      >
        <View style={styles.meetingHeader}>
          <View style={styles.meetingInfo}>
            <Text style={styles.meetingTitle}>
              Meeting with {otherPersonName}
            </Text>
            <Text style={styles.meetingSubtitle}>
              {meeting.meeting_type} • {meeting.duration_minutes} min
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(meeting.status) }]}>
            <MaterialIcons 
              name={getStatusIcon(meeting.status) as any} 
              size={16} 
              color="white" 
            />
            <Text style={styles.statusText}>{meeting.status}</Text>
          </View>
        </View>

        <View style={styles.meetingDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="schedule" size={16} color={colors.text.secondary} />
            <Text style={styles.detailText}>{formatDate(meeting.scheduled_at)}</Text>
          </View>
          
          {meeting.location && (
            <View style={styles.detailRow}>
              <MaterialIcons name="location-on" size={16} color={colors.text.secondary} />
              <Text style={styles.detailText}>{meeting.location}</Text>
            </View>
          )}
          
          {meeting.meeting_link && (
            <View style={styles.detailRow}>
              <MaterialIcons name="link" size={16} color={colors.text.secondary} />
              <Text style={styles.detailText}>Meeting link available</Text>
            </View>
          )}
        </View>

        <View style={styles.meetingFooter}>
          <Text style={styles.meetingDate}>
            Created {new Date(meeting.created_at).toLocaleDateString()}
          </Text>
          <MaterialIcons name="chevron-right" size={20} color={colors.text.secondary} />
        </View>
      </TouchableOpacity>
    );
  };

  if (selectedMeeting) {
    return (
      <MeetingChat 
        meetingId={selectedMeeting.id} 
        onClose={handleCloseChat}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading meetings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialIcons name="close" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Meetings</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Meetings List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {meetings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="event-busy" size={48} color={colors.text.secondary} />
            <Text style={styles.emptyTitle}>No Meetings Yet</Text>
            <Text style={styles.emptySubtitle}>
              When you accept meeting requests, they will appear here
            </Text>
          </View>
        ) : (
          meetings.map(renderMeeting)
        )}
      </ScrollView>
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
    marginTop: 12,
    fontSize: 16,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333333' : '#f0f0f0',
    backgroundColor: colors.background?.paper || (isDark ? '#1a1a1a' : '#ffffff'),
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  meetingCard: {
    backgroundColor: colors.background?.paper || (isDark ? '#1a1a1a' : '#ffffff'),
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDark ? '#333333' : '#f0f0f0',
  },
  meetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  meetingInfo: {
    flex: 1,
    marginRight: 12,
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
    marginBottom: 4,
  },
  meetingSubtitle: {
    fontSize: 14,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
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
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  meetingDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
    marginLeft: 8,
  },
  meetingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#333333' : '#f0f0f0',
  },
  meetingDate: {
    fontSize: 12,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
    textAlign: 'center',
    lineHeight: 20,
  },
});
