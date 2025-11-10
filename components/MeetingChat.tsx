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
  const [otherParticipant, setOtherParticipant] = useState<{
    id: string;
    name: string;
    avatar?: string;
  } | null>(null);

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
      
      // Load meeting details
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings')
        .select('*, speaker_id, requester_id, speaker_name, requester_name')
        .eq('id', meetingId)
        .single();

      if (meetingError) {
        console.error('Error loading meeting:', meetingError);
        showError('Error', 'Failed to load meeting information');
        return;
      }

      if (meetingData) {
        setMeeting(meetingData);
        
        // Determine other participant
        const isRequester = meetingData.requester_id === user.id;
        let otherUserId: string | null = null;
        let otherUserName: string | null = null;
        
        if (isRequester) {
          // User is requester, other is speaker
          // Get speaker's user_id from bsl_speakers
          const { data: speakerData } = await supabase
            .from('bsl_speakers')
            .select('user_id, name, imageurl')
            .eq('id', meetingData.speaker_id)
            .single();
          
          if (speakerData?.user_id) {
            otherUserId = speakerData.user_id;
            otherUserName = meetingData.speaker_name || speakerData.name;
            
            // Try to get speaker's avatar from profile
            const { data: profileData } = await supabase
              .from('profiles')
              .select('avatar_url, full_name')
              .eq('id', speakerData.user_id)
              .single();
            
            setOtherParticipant({
              id: otherUserId,
              name: otherUserName,
              avatar: profileData?.avatar_url || speakerData.imageurl || undefined,
            });
          }
        } else {
          // User is speaker, other is requester
          otherUserId = meetingData.requester_id;
          otherUserName = meetingData.requester_name;
          
          // Get requester's avatar from profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('avatar_url, full_name')
            .eq('id', meetingData.requester_id)
            .single();
          
          setOtherParticipant({
            id: otherUserId,
            name: otherUserName || profileData?.full_name || 'User',
            avatar: profileData?.avatar_url || undefined,
          });
        }
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
      {/* Real-time Chat Component */}
      <RealtimeChat
        roomName={`meeting_chat_${meetingId}`}
        username={user?.user_metadata?.full_name || user?.email || 'user'}
        meetingId={meetingId}
        otherParticipantId={otherParticipant?.id}
        otherParticipantName={otherParticipant?.name}
        otherParticipantAvatar={otherParticipant?.avatar}
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
