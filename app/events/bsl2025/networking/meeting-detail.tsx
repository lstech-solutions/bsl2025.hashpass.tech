import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { MaterialIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useToastHelpers } from '@/contexts/ToastContext';
import SpeakerAvatar from '@/components/SpeakerAvatar';

export default function MeetingDetailScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { showError } = useToastHelpers();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState<any>(null);
  const [isSpeaker, setIsSpeaker] = useState(params.isSpeaker === 'true');
  const styles = getStyles(isDark, colors);

  useEffect(() => {
    const loadMeetingDetails = async () => {
      try {
        setLoading(true);
        
        // If we have all params from navigation, use them
        if (params.meetingId) {
          setMeeting({
            id: params.meetingId,
            speaker_name: params.speakerName,
            speaker_image: params.speakerImage,
            speaker_company: params.speakerCompany,
            status: params.status,
            message: params.message,
            scheduled_at: params.scheduledAt,
            location: params.location,
            duration: params.duration,
            notes: params.message,
            requester_name: isSpeaker ? 'You' : params.requesterName,
            speaker_id: params.speakerId,
            requester_id: params.requesterId
          });
        }
      } catch (error) {
        console.error('Error loading meeting details:', error);
        showError('Error', 'Failed to load meeting details');
      } finally {
        setLoading(false);
      }
    };

    loadMeetingDetails();
  }, [params.meetingId]);

  const handleBack = () => {
    router.back();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested': return '#FF9800';
      case 'accepted': return '#4CAF50';
      case 'rejected': return '#F44336';
      case 'cancelled': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'requested': return 'schedule';
      case 'accepted': return 'check-circle';
      case 'rejected': return 'cancel';
      case 'cancelled': return 'block';
      default: return 'help';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading meeting details...</Text>
      </View>
    );
  }

  if (!meeting) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Meeting not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Meeting Request Details',
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerBackVisible: false,
          gestureEnabled: true,
          gestureDirection: 'vertical',
        }} 
      />
      
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Meeting Request Details</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="close" size={24} color={colors.text?.primary || (isDark ? '#ffffff' : '#000000')} />
        </TouchableOpacity>
      </View>

      {meeting && (
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Speaker</Text>
            <View style={styles.speakerDetail}>
              <SpeakerAvatar
                name={meeting.speaker_name}
                imageUrl={meeting.speaker_image}
                size={60}
                showBorder={true}
              />
              <View style={styles.speakerDetailInfo}>
                <Text style={styles.speakerDetailName}>{meeting.speaker_name}</Text>
                <Text style={styles.speakerDetailTitle}>Speaker</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Status</Text>
            <View style={[styles.statusDetail, { backgroundColor: getStatusColor(meeting.status) }]}>
              <MaterialIcons name={getStatusIcon(meeting.status) as any} size={20} color="white" />
              <Text style={styles.statusDetailText}>{meeting.status.toUpperCase()}</Text>
            </View>
          </View>

          {meeting.message && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Message</Text>
              <Text style={styles.detailValue}>
                {meeting.message || 'No message provided'}
              </Text>
            </View>
          )}

          {meeting.notes && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Intentions</Text>
              <Text style={styles.detailValue}>{meeting.notes}</Text>
            </View>
          )}

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Meeting Details</Text>
            <View style={styles.meetingDetails}>
              {meeting.scheduled_at && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Scheduled:</Text>
                  <Text style={styles.detailRowValue}>
                    {format(parseISO(meeting.scheduled_at), 'EEEE, MMMM d, yyyy \a\t h:mm a')}
                  </Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailRowLabel}>Duration:</Text>
                <Text style={styles.detailRowValue}>{meeting.duration || 30} minutes</Text>
              </View>
              {meeting.location && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Location:</Text>
                  <Text style={styles.detailRowValue}>{meeting.location}</Text>
                </View>
              )}
            </View>
          </View>

          {meeting.scheduled_at && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Timeline</Text>
              <View style={styles.timeline}>
                {meeting.scheduled_at && (
                  <View style={styles.timelineItem}>
                    <Text style={styles.timelineDate}>{formatDate(meeting.scheduled_at)}</Text>
                    <Text style={styles.timelineText}>Meeting scheduled</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => {
                // Handle join meeting action
              }}
            >
              <MaterialIcons name="video-call" size={20} color="white" />
              <Text style={styles.buttonText}>Join Meeting</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => {
                router.push({
                  pathname: "/events/bsl2025/networking/meeting-chat",
                  params: { 
                    meetingId: meeting.id,
                    title: `Chat with ${isSpeaker ? meeting.requester_name : meeting.speaker_name}`,
                    speakerName: meeting.speaker_name,
                    speakerImage: meeting.speaker_image
                  }
                });
              }}
            >
              <MaterialIcons name="chat" size={20} color={colors.primary} />
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Message</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background?.default || (isDark ? '#000000' : '#ffffff'),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#404040' : '#e0e0e0',
    backgroundColor: colors.card?.default || (isDark ? '#1e1e1e' : '#ffffff'),
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 16,
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
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: colors.error?.main || '#ff4444',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
    lineHeight: 22,
  },
  speakerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speakerDetailInfo: {
    marginLeft: 16,
  },
  speakerDetailName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
  },
  speakerDetailTitle: {
    fontSize: 14,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
    marginTop: 2,
  },
  statusDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusDetailText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  meetingDetails: {
    backgroundColor: colors.card?.default || (isDark ? '#2a2a2a' : '#f5f5f5'),
    padding: 12,
    borderRadius: 8,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? '#404040' : 'transparent',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailRowLabel: {
    fontSize: 14,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
  },
  detailRowValue: {
    fontSize: 14,
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
    fontWeight: '500',
  },
  timeline: {
    backgroundColor: colors.card?.default || (isDark ? '#2a2a2a' : '#f5f5f5'),
    padding: 12,
    borderRadius: 8,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? '#404040' : 'transparent',
  },
  timelineItem: {
    marginBottom: 8,
  },
  timelineDate: {
    fontSize: 12,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
    fontWeight: '600',
  },
  timelineText: {
    fontSize: 14,
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  secondaryButtonText: {
    color: colors.primary,
  },
  closeButton: {
    padding: 8,
  },
});
