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
import { useRouter } from 'expo-router';
import { useTheme } from '../../../../hooks/useTheme';
import { useAuth } from '../../../../hooks/useAuth';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../../lib/supabase';
import { useToastHelpers } from '../../../../contexts/ToastContext';
import SpeakerAvatar from '../../../../components/SpeakerAvatar';

interface MeetingRequest {
  id: string;
  speaker_id: string;
  speaker_name: string;
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
  updated_at: string;
  expires_at: string;
  speaker_response?: string;
  speaker_response_at?: string;
}

export default function MyRequestsView() {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToastHelpers();
  const styles = getStyles(isDark, colors);

  const [requests, setRequests] = useState<MeetingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MeetingRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadMyRequests();
  }, []);

  const loadMyRequests = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('🔄 Loading my meeting requests...');

      // Get all meeting requests sent by the user
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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading requests:', error);
        throw error;
      }

      console.log('📋 My requests loaded:', data?.length || 0);
      setRequests(data || []);

    } catch (error) {
      console.error('❌ Error loading my requests:', error);
      showError('Error Loading Requests', 'Failed to load your meeting requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMyRequests();
    setRefreshing(false);
  };

  const handleRequestPress = (request: MeetingRequest) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  const handleCancelRequest = async (request: MeetingRequest) => {
    try {
      console.log('🔄 Cancelling request:', request.id);

      const { data, error } = await supabase
        .rpc('cancel_meeting_request', {
          p_request_id: request.id.toString(),
          p_user_id: user?.id.toString()
        });

      if (error) {
        console.error('❌ Error cancelling request:', error);
        throw error;
      }

      if (data?.success) {
        showSuccess('Request Cancelled', 'Your meeting request has been cancelled');
        await loadMyRequests();
        setShowDetailModal(false);
      } else {
        throw new Error(data?.error || 'Failed to cancel request');
      }

    } catch (error) {
      console.error('❌ Error cancelling request:', error);
      showError('Cancellation Failed', 'Failed to cancel meeting request');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'accepted': return '#4CAF50';
      case 'approved': return '#4CAF50';
      case 'declined': return '#F44336';
      case 'cancelled': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'schedule';
      case 'accepted': return 'check-circle';
      case 'approved': return 'check-circle';
      case 'declined': return 'cancel';
      case 'cancelled': return 'close';
      default: return 'help';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderRequestCard = (request: MeetingRequest) => (
    <TouchableOpacity
      key={request.id}
      style={styles.requestCard}
      onPress={() => handleRequestPress(request)}
    >
      <View style={styles.requestHeader}>
        <View style={styles.speakerInfo}>
          <SpeakerAvatar
            speaker={{
              id: request.speaker_id,
              name: request.speaker_name,
              imageurl: request.speakers?.imageurl || null,
            }}
            size={40}
          />
          <View style={styles.speakerDetails}>
            <Text style={styles.speakerName}>{request.speaker_name}</Text>
            <Text style={styles.requestDate}>{formatDate(request.created_at)}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
          <MaterialIcons name={getStatusIcon(request.status) as any} size={16} color="white" />
          <Text style={styles.statusText}>{request.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.requestContent}>
        <Text style={styles.requestMessage} numberOfLines={2}>
          {request.message || 'No message provided'}
        </Text>
        
        {request.note && (
          <View style={styles.intentionsContainer}>
            <Text style={styles.intentionsLabel}>Intentions:</Text>
            <Text style={styles.intentionsText} numberOfLines={2}>
              {request.note}
            </Text>
          </View>
        )}

        <View style={styles.requestMeta}>
          <View style={styles.metaItem}>
            <MaterialIcons name="business" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>{request.requester_company}</Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="schedule" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>{request.duration_minutes} min</Text>
          </View>
          {request.boost_amount > 0 && (
            <View style={styles.metaItem}>
              <MaterialIcons name="flash-on" size={16} color="#FFC107" />
              <Text style={styles.metaText}>{request.boost_amount} boost</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderDetailModal = () => (
    <Modal
      visible={showDetailModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Meeting Request Details</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowDetailModal(false)}
          >
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {selectedRequest && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Speaker</Text>
              <View style={styles.speakerDetail}>
                <SpeakerAvatar
                  speaker={{
                    id: selectedRequest.speaker_id,
                    name: selectedRequest.speaker_name,
                    imageurl: selectedRequest.speakers?.imageurl || null,
                  }}
                  size={60}
                />
                <View style={styles.speakerDetailInfo}>
                  <Text style={styles.speakerDetailName}>{selectedRequest.speaker_name}</Text>
                  <Text style={styles.speakerDetailTitle}>Speaker</Text>
                </View>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Status</Text>
              <View style={[styles.statusDetail, { backgroundColor: getStatusColor(selectedRequest.status) }]}>
                <MaterialIcons name={getStatusIcon(selectedRequest.status) as any} size={20} color="white" />
                <Text style={styles.statusDetailText}>{selectedRequest.status.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Message</Text>
              <Text style={styles.detailValue}>
                {selectedRequest.message || 'No message provided'}
              </Text>
            </View>

            {selectedRequest.note && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Intentions</Text>
                <Text style={styles.detailValue}>{selectedRequest.note}</Text>
              </View>
            )}

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Meeting Details</Text>
              <View style={styles.meetingDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Duration:</Text>
                  <Text style={styles.detailRowValue}>{selectedRequest.duration_minutes} minutes</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Type:</Text>
                  <Text style={styles.detailRowValue}>{selectedRequest.meeting_type}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Boost:</Text>
                  <Text style={styles.detailRowValue}>{selectedRequest.boost_amount} points</Text>
                </View>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Timeline</Text>
              <View style={styles.timeline}>
                <View style={styles.timelineItem}>
                  <Text style={styles.timelineDate}>{formatDate(selectedRequest.created_at)}</Text>
                  <Text style={styles.timelineText}>Request sent</Text>
                </View>
                {selectedRequest.updated_at !== selectedRequest.created_at && (
                  <View style={styles.timelineItem}>
                    <Text style={styles.timelineDate}>{formatDate(selectedRequest.updated_at)}</Text>
                    <Text style={styles.timelineText}>Status updated</Text>
                  </View>
                )}
                {selectedRequest.expires_at && (
                  <View style={styles.timelineItem}>
                    <Text style={styles.timelineDate}>{formatDate(selectedRequest.expires_at)}</Text>
                    <Text style={styles.timelineText}>Expires</Text>
                  </View>
                )}
              </View>
            </View>

            {selectedRequest.speaker_response && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Speaker Response</Text>
                <Text style={styles.detailValue}>{selectedRequest.speaker_response}</Text>
                {selectedRequest.speaker_response_at && (
                  <Text style={styles.responseDate}>
                    {formatDate(selectedRequest.speaker_response_at)}
                  </Text>
                )}
              </View>
            )}

            {selectedRequest.status === 'pending' && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancelRequest(selectedRequest)}
              >
                <MaterialIcons name="cancel" size={20} color="white" />
                <Text style={styles.cancelButtonText}>Cancel Request</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialIcons name="send" size={48} color={colors.primary} />
        <Text style={styles.loadingText}>Loading your requests...</Text>
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
        <Text style={styles.headerTitle}>My Meeting Requests</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="send" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Meeting Requests</Text>
            <Text style={styles.emptyDescription}>
              You haven't sent any meeting requests yet. Start networking by browsing speakers!
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
              <Text style={styles.summaryTitle}>Request Summary</Text>
              <View style={styles.summaryStats}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{requests.length}</Text>
                  <Text style={styles.summaryLabel}>Total</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#FF9800' }]}>
                    {requests.filter(r => r.status === 'pending').length}
                  </Text>
                  <Text style={styles.summaryLabel}>Pending</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                    {requests.filter(r => r.status === 'accepted' || r.status === 'approved').length}
                  </Text>
                  <Text style={styles.summaryLabel}>Accepted</Text>
                </View>
              </View>
            </View>

            {requests.map(renderRequestCard)}
          </>
        )}
      </ScrollView>

      {renderDetailModal()}
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
  requestCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  requestHeader: {
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
  requestDate: {
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
  requestContent: {
    flex: 1,
  },
  requestMessage: {
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
  requestMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    color: colors.text,
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
    color: colors.text,
  },
  speakerDetailTitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailRowLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailRowValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  timeline: {
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
  },
  timelineItem: {
    marginBottom: 8,
  },
  timelineDate: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  timelineText: {
    fontSize: 14,
    color: colors.text,
    marginTop: 2,
  },
  responseDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
