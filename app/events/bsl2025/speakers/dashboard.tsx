import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useTheme } from '../../../../hooks/useTheme';
import { useAuth } from '../../../../hooks/useAuth';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../../lib/supabase';
import { useToastHelpers } from '../../../../contexts/ToastContext';
import SpeakerAvatar from '../../../../components/SpeakerAvatar';

interface MeetingRequest {
  id: string;
  requester_id: string;
  requester_name: string;
  requester_company: string;
  requester_title: string;
  requester_ticket_type: string;
  meeting_type: string;
  message: string;
  note: string;
  boost_amount: number;
  duration_minutes: number;
  status: string;
  created_at: string;
  expires_at: string;
  meeting_id?: string; // Link to the created meeting
  has_meeting?: boolean; // Boolean to check if meeting exists
  meeting_status?: string; // Status of the linked meeting
}

export default function SpeakerDashboard() {
  const { isDark, colors } = useTheme();
  const { user, isLoggedIn, isLoading } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToastHelpers();
  const styles = getStyles(isDark, colors);

  const [meetingRequests, setMeetingRequests] = useState<MeetingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MeetingRequest | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseType, setResponseType] = useState<'accepted' | 'declined'>('accepted');
  const [speakerMessage, setSpeakerMessage] = useState('');
  const [responding, setResponding] = useState(false);
  const [speakerId, setSpeakerId] = useState<string | null>(null);

  const getSpeakerId = async () => {
    if (!user) {
      console.log('❌ No user found in getSpeakerId');
      return null;
    }

    console.log('🔍 Getting speaker ID for user:', user.id, user.email);

    try {
      const { data: speakerData, error } = await supabase
        .from('bsl_speakers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      console.log('📊 Speaker query result:', { speakerData, error });

      if (!error && speakerData) {
        console.log('✅ Speaker found:', speakerData.id);
        setSpeakerId(speakerData.id);
        return speakerData.id;
      } else {
        console.error('❌ Error getting speaker ID:', error);
        return null;
      }
    } catch (error) {
      console.error('❌ Exception in getSpeakerId:', error);
      return null;
    }
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      console.log('🚀 Initializing speaker dashboard...');
      console.log('👤 User state:', { user: user?.id, email: user?.email, isLoggedIn, isLoading });
      
      // Wait for authentication to complete
      if (isLoading) {
        console.log('⏳ Authentication still loading, waiting...');
        return;
      }
      
      // Check if user is authenticated
      if (!user || !isLoggedIn) {
        console.log('❌ User not authenticated, redirecting...');
        showError('Authentication Required', 'Please log in to access the speaker dashboard.');
        router.back();
        return;
      }
      
      const currentSpeakerId = await getSpeakerId();
      console.log('🎯 Speaker ID result:', currentSpeakerId);
      
      if (currentSpeakerId) {
        console.log('✅ Speaker authorized, loading meeting requests...');
        loadMeetingRequests(currentSpeakerId);
      } else {
        console.log('❌ Speaker not authorized, showing error...');
        showError('Access Denied', 'You are not authorized to access the speaker dashboard.');
        router.back();
      }
    };

    initializeDashboard();
  }, [user, isLoggedIn, isLoading]);

  const loadMeetingRequests = async (currentSpeakerId?: string) => {
    const idToUse = currentSpeakerId || speakerId;
    if (!user || !idToUse) return;

    try {
      setLoading(true);
      console.log('🔄 Loading meeting requests for speaker...');

      const { data, error } = await supabase
        .rpc('get_meeting_requests_for_speaker', {
          p_speaker_id: idToUse,
          p_user_id: user.id
        });

      if (error) {
        console.error('❌ Error loading meeting requests:', error);
        throw error;
      }

      console.log('📋 Meeting requests loaded:', data);

      if (data && data.success) {
        setMeetingRequests(data.requests || []);
      } else {
        setMeetingRequests([]);
      }
    } catch (error) {
      console.error('❌ Error loading meeting requests:', error);
      showError('Error Loading Requests', 'Failed to load meeting requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMeetingRequests();
    setRefreshing(false);
  };

  const handleRespondToRequest = (request: MeetingRequest, response: 'accepted' | 'declined') => {
    setSelectedRequest(request);
    setResponseType(response);
    setSpeakerMessage('');
    setShowResponseModal(true);
  };

  const handleOpenChat = (meetingId: string) => {
    // Navigate to meeting chat - using replace to avoid back button issues
    router.push('/events/bsl2025/networking' as any);
    // TODO: Implement proper meeting chat navigation
    console.log('Opening chat for meeting:', meetingId);
  };

  const confirmResponse = async () => {
    if (!selectedRequest || !user || !speakerId) return;

    setResponding(true);
    try {
      console.log('🔄 Responding to meeting request:', selectedRequest.id, 'with:', responseType);

      let data, error;

      if (responseType === 'accepted') {
        // Accept the meeting request and create a meeting
        const result = await supabase
          .rpc('accept_meeting_request', {
            p_meeting_request_id: selectedRequest.id,
            p_speaker_id: speakerId,
            p_scheduled_at: null, // Will default to tomorrow
            p_location: null,
            p_meeting_link: null,
            p_notes: speakerMessage || null
          });
        
        data = result.data;
        error = result.error;
      } else {
        // Decline the meeting request
        const result = await supabase
          .rpc('decline_meeting_request', {
            p_meeting_request_id: selectedRequest.id,
            p_speaker_id: speakerId,
            p_reason: speakerMessage || null
          });
        
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('❌ Error responding to request:', error);
        throw error;
      }

      console.log('📋 Response result:', data);

      if (data && data.success) {
        if (responseType === 'accepted') {
          // Add initial chat message after meeting is created
          try {
            const { data: chatData, error: chatError } = await supabase
              .rpc('add_meeting_chat_message', {
                p_meeting_id: data.meeting_id,
                p_sender_id: user.id,
                p_message: 'Meeting accepted! You can now coordinate the details here.',
                p_message_type: 'system'
              });

            if (chatError) {
              console.warn('⚠️ Could not add initial chat message:', chatError);
            }
          } catch (chatError) {
            console.warn('⚠️ Could not add initial chat message:', chatError);
          }

          showSuccess('Meeting Accepted!', `Meeting created successfully. You can now coordinate details in the meeting chat.`);
        } else {
          showSuccess('Request Declined', 'Meeting request declined successfully');
        }

        // Refresh the requests list
        await loadMeetingRequests();
      } else {
        throw new Error(data?.error || 'Failed to respond to request');
      }
    } catch (error) {
      console.error('❌ Error responding to request:', error);
      showError(
        'Response Failed',
        error instanceof Error ? error.message : 'Failed to respond to meeting request. Please try again.'
      );
    } finally {
      setResponding(false);
      setShowResponseModal(false);
      setSelectedRequest(null);
      setSpeakerMessage('');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b'; // warning color
      case 'accepted':
      case 'approved': return '#10b981'; // success color
      case 'declined': return '#ef4444'; // error color
      default: return '#6b7280'; // secondary text color
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'schedule';
      case 'accepted':
      case 'approved': return 'check-circle';
      case 'declined': return 'cancel';
      default: return 'help';
    }
  };

  const getTicketTypeIcon = (ticketType: string) => {
    switch (ticketType) {
      case 'vip': return 'star';
      case 'business': return 'business';
      default: return 'person';
    }
  };

  const getTicketTypeColor = (ticketType: string) => {
    switch (ticketType) {
      case 'vip': return '#FFD700';
      case 'business': return '#4CAF50';
      default: return colors.text.secondary;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading authentication...</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading meeting requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Speaker Dashboard',
          headerBackTitle: 'Networking',
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerRefreshButton}
              onPress={handleRefresh}
              disabled={refreshing}
            >
              <MaterialIcons 
                name="refresh" 
                size={24} 
                color={refreshing ? colors.text.secondary : colors.primary} 
              />
            </TouchableOpacity>
          ),
        }} 
      />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{meetingRequests.length}</Text>
            <Text style={styles.statLabel}>Total Requests</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {meetingRequests.filter(r => r.status === 'pending').length}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {meetingRequests.filter(r => r.status === 'accepted' || r.status === 'approved').length}
            </Text>
            <Text style={styles.statLabel}>Accepted</Text>
          </View>
        </View>

        {meetingRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inbox" size={64} color={colors.text.secondary} />
            <Text style={styles.emptyTitle}>No Meeting Requests</Text>
            <Text style={styles.emptyMessage}>
              You don't have any meeting requests yet. When attendees request meetings with you, they'll appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.requestsContainer}>
            {meetingRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.requesterInfo}>
                    <SpeakerAvatar
                      name={request.requester_name}
                      size={40}
                      style={styles.requesterAvatar}
                    />
                    <View style={styles.requesterDetails}>
                      <Text style={styles.requesterName}>{request.requester_name}</Text>
                      <Text style={styles.requesterCompany}>{request.requester_company}</Text>
                      <Text style={styles.requesterTitle}>{request.requester_title}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.requestMeta}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(request.status) + '20' }
                    ]}>
                      <MaterialIcons 
                        name={getStatusIcon(request.status)} 
                        size={16} 
                        color={getStatusColor(request.status)} 
                      />
                      <Text style={[
                        styles.statusText,
                        { color: getStatusColor(request.status) }
                      ]}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Text>
                    </View>
                    
                    <View style={styles.ticketTypeBadge}>
                      <MaterialIcons 
                        name={getTicketTypeIcon(request.requester_ticket_type)} 
                        size={14} 
                        color={getTicketTypeColor(request.requester_ticket_type)} 
                      />
                      <Text style={[
                        styles.ticketTypeText,
                        { color: getTicketTypeColor(request.requester_ticket_type) }
                      ]}>
                        {request.requester_ticket_type.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.requestContent}>
                  <Text style={styles.requestMessage}>{request.message}</Text>
                  
                  {request.note && (
                    <View style={styles.intentionsContainer}>
                      <Text style={styles.intentionsLabel}>Meeting Intentions:</Text>
                      <Text style={styles.intentionsText}>{request.note}</Text>
                    </View>
                  )}
                  
                  <View style={styles.requestDetails}>
                    <Text style={styles.requestDetail}>
                      <MaterialIcons name="schedule" size={14} color={colors.text.secondary} />
                      {' '}{request.duration_minutes} minutes
                    </Text>
                    <Text style={styles.requestDetail}>
                      <MaterialIcons name="event" size={14} color={colors.text.secondary} />
                      {' '}{new Date(request.created_at).toLocaleDateString()}
                    </Text>
                    {request.boost_amount > 0 && (
                      <Text style={styles.requestDetail}>
                        <MaterialIcons name="flash-on" size={14} color="#FF6B35" />
                        {' '}+{request.boost_amount} BOOST
                      </Text>
                    )}
                  </View>
                </View>

                {request.status === 'pending' && (
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => handleRespondToRequest(request, 'accepted')}
                    >
                      <MaterialIcons name="check" size={20} color="white" />
                      <Text style={styles.actionButtonText}>Accept</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.declineButton]}
                      onPress={() => handleRespondToRequest(request, 'declined')}
                    >
                      <MaterialIcons name="close" size={20} color="white" />
                      <Text style={styles.actionButtonText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {request.status === 'accepted' && request.has_meeting && request.meeting_id && (
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.chatButton]}
                      onPress={() => handleOpenChat(request.meeting_id!)}
                    >
                      <MaterialIcons name="chat" size={20} color="white" />
                      <Text style={styles.actionButtonText}>Open Chat</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Response Modal */}
      <Modal
        visible={showResponseModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowResponseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {responseType === 'accepted' ? 'Accept' : 'Decline'} Meeting Request
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowResponseModal(false)}
              >
                <MaterialIcons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <>
                <View style={styles.modalRequestInfo}>
                  <Text style={styles.modalRequesterName}>{selectedRequest.requester_name}</Text>
                  <Text style={styles.modalRequesterCompany}>{selectedRequest.requester_company}</Text>
                  <Text style={styles.modalRequestMessage}>"{selectedRequest.message}"</Text>
                </View>

                <View style={styles.modalMessageContainer}>
                  <Text style={styles.modalMessageLabel}>
                    {responseType === 'accepted' ? 'Optional message to requester:' : 'Optional reason for declining:'}
                  </Text>
                  <TextInput
                    style={styles.modalMessageInput}
                    value={speakerMessage}
                    onChangeText={setSpeakerMessage}
                    placeholder={responseType === 'accepted' 
                      ? "Great! I'd love to meet with you. Let's schedule a time..."
                      : "I appreciate your interest, but I'm unable to meet at this time..."
                    }
                    multiline
                    numberOfLines={3}
                    placeholderTextColor={colors.text.secondary}
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowResponseModal(false)}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.modalConfirmButton,
                      responseType === 'accepted' ? styles.acceptButton : styles.declineButton,
                      responding && styles.modalConfirmButtonDisabled
                    ]}
                    onPress={confirmResponse}
                    disabled={responding}
                  >
                    {responding ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <MaterialIcons 
                          name={responseType === 'accepted' ? 'check' : 'close'} 
                          size={20} 
                          color="white" 
                        />
                        <Text style={styles.modalConfirmButtonText}>
                          {responseType === 'accepted' ? 'Accept' : 'Decline'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.default,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 16,
  },
  headerRefreshButton: {
    padding: 8,
    marginRight: 8,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background.paper,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  requestsContainer: {
    padding: 16,
    gap: 16,
  },
  requestCard: {
    backgroundColor: colors.background.paper,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requesterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requesterAvatar: {
    marginRight: 12,
  },
  requesterDetails: {
    flex: 1,
  },
  requesterName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  requesterCompany: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  requesterTitle: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 1,
  },
  requestMeta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ticketTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketTypeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  requestContent: {
    marginBottom: 12,
  },
  requestMessage: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
    marginBottom: 8,
  },
  intentionsContainer: {
    backgroundColor: colors.background.default,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  intentionsLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  intentionsText: {
    fontSize: 12,
    color: colors.text.primary,
    lineHeight: 16,
  },
  requestDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  requestDetail: {
    fontSize: 12,
    color: colors.text.secondary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  declineButton: {
    backgroundColor: colors.error.main,
  },
  chatButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: colors.background.paper,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalRequestInfo: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.background.default,
    borderRadius: 8,
  },
  modalRequesterName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalRequesterCompany: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  modalRequestMessage: {
    fontSize: 14,
    color: colors.text.primary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  modalMessageContainer: {
    marginBottom: 20,
  },
  modalMessageLabel: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
    marginBottom: 8,
  },
  modalMessageInput: {
    backgroundColor: colors.background.default,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.divider,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  modalConfirmButtonDisabled: {
    opacity: 0.6,
  },
  modalConfirmButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
