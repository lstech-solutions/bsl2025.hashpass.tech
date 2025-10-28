import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useToastHelpers } from '../contexts/ToastContext';
import RealtimeChat from './RealtimeChat';
import { TouchableOpacity } from 'react-native';

interface Meeting {
  id: string;
  speaker_name: string;
  requester_name: string;
  status: string;
  scheduled_at: string;
  location?: string;
  meeting_link?: string;
}

interface MeetingChatProps {
  meetingId: string;
  onClose: () => void;
}

export default function MeetingChat({ meetingId, onClose }: MeetingChatProps) {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const { showError } = useToastHelpers();
  const styles = getStyles(isDark, colors);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeetingInfo();
  }, [meetingId]);

  const loadMeetingInfo = async () => {
    if (!user?.id) {
      console.error('No user ID available for loading meeting info');
      showError('Error', 'User not authenticated');
      setLoading(false);
      return;
    }

    if (!meetingId) {
      console.error('No meeting ID provided');
      showError('Error', 'Meeting ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_meeting_chat_messages', {
          p_meeting_id: meetingId,
          p_user_id: user.id
        });

      if (error) {
        console.error('Error loading meeting info:', error);
        showError('Error', 'Failed to load meeting information');
        return;
      }

      if (data && data.success) {
        setMeeting(data.meeting);
      }
    } catch (error) {
      console.error('Error loading meeting info:', error);
      showError('Error', 'Failed to load meeting information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading chat...</Text>
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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Meeting Chat</Text>
          {meeting && (
            <Text style={styles.headerSubtitle}>
              {meeting.speaker_name} & {meeting.requester_name}
            </Text>
          )}
        </View>
      </View>

      {/* Real-time Chat Component */}
      <RealtimeChat
        roomName={`meeting_chat_${meetingId}`}
        username={user?.email || 'user'}
        meetingId={meetingId}
      />
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333333' : '#f0f0f0',
    backgroundColor: colors.background?.paper || (isDark ? '#1a1a1a' : '#ffffff'),
  },
  closeButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
    marginTop: 2,
  },
});
