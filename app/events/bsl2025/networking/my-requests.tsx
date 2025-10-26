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

interface MeetingRequest {
  id: string;
  speaker_id: string;
  speaker_name: string;
  speaker_image?: string;
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
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date'); // 'date', 'speaker', 'status'

  useEffect(() => {
    console.log('🔄 useEffect triggered, user:', user ? 'present' : 'null');
    if (user) {
      console.log('🔄 User found, calling loadMyRequests...');
      loadMyRequests();
    } else {
      console.log('⚠️ No user found, setting loading to false');
      setLoading(false);
    }
    
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ My requests loading timeout, setting empty state');
        setLoading(false);
        setRequests([]);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [user]);

  const loadMyRequests = async () => {
    if (!user) {
      console.log('No user found, skipping requests load');
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 Starting loadMyRequests...');
      setLoading(true);
      console.log('Loading my meeting requests for user:', user.id);
      console.log('User ID type:', typeof user.id);
      console.log('User email:', user.email);

      // First, let's check what's in the database
      const { data: allRequests, error: allError } = await supabase
        .from('meeting_requests')
        .select('id, requester_id, speaker_id, status, created_at')
        .limit(10);

      console.log('All meeting requests in DB (sample):', allRequests);
      console.log('All requests error:', allError);

      // Try different query approaches
      console.log('Trying query with user.id as string...');
      const { data: data1, error: error1 } = await supabase
        .from('meeting_requests')
        .select('*')
        .eq('requester_id', user.id.toString())
        .order('created_at', { ascending: false });

      console.log('String query result:', data1);
      console.log('String query error:', error1);

      console.log('Trying query with user.id as UUID...');
      const { data: data2, error: error2 } = await supabase
        .from('meeting_requests')
        .select('*')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });

      console.log('UUID query result:', data2);
      console.log('UUID query error:', error2);

      // Use whichever query worked (prioritize non-empty results)
      const data = (data1 && data1.length > 0) ? data1 : data2;
      const error = (data1 && data1.length > 0) ? error1 : error2;

      if (error) {
        console.error('Error loading requests:', error);
        showError('Database Error', `Failed to load requests: ${error.message}`);
        setRequests([]);
        return;
      }

      // If no data found, check if there are any requests at all
      if (!data || data.length === 0) {
        console.log('No requests found for user, checking if any requests exist...');
        
        // Try a broader search to see if there are any requests
        const { data: broadData, error: broadError } = await supabase
          .from('meeting_requests')
          .select('id, requester_id, speaker_id, status, created_at')
          .limit(5);

        console.log('Broad search result:', broadData);
        console.log('Broad search error:', broadError);
        
        if (broadData && broadData.length > 0) {
          console.log('Found requests in database but none match current user');
          console.log('Sample requester IDs:', broadData.map(req => req.requester_id));
          console.log('Current user ID:', user.id);
        }
      }

      console.log('My requests loaded:', data?.length || 0, 'requests');
      console.log('Sample request data:', data?.[0] || 'No requests found');
      console.log('User ID used for query:', user.id);
      console.log('Full data response:', data);
      
      // Fetch speaker images for each request
      if (data && data.length > 0) {
        console.log('Fetching speaker images...');
        const requestsWithImages = await Promise.all(
          data.map(async (request) => {
            try {
              // Get speaker image from bsl_speakers table
              const { data: speakerData, error: speakerError } = await supabase
                .from('bsl_speakers')
                .select('imageurl')
                .eq('id', request.speaker_id)
                .single();

              if (speakerError) {
                console.log(`No speaker image found for ${request.speaker_name}:`, speakerError.message);
                return request;
              }

              return {
                ...request,
                speaker_image: speakerData?.imageurl || null
              };
            } catch (error) {
              console.log(`Error fetching image for ${request.speaker_name}:`, error);
              return request;
            }
          })
        );
        
        console.log('Requests with images loaded:', requestsWithImages.length);
        setRequests(requestsWithImages);
      } else {
        setRequests(data || []);
      }

    } catch (error) {
      console.error('❌ Error loading my requests:', error);
      showError('Error Loading Requests', 'Failed to load your meeting requests');
      setRequests([]);
    } finally {
      console.log('✅ Setting loading to false in finally block');
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

  const getFilteredAndSortedRequests = () => {
    let filtered = requests;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = requests.filter(request => request.status === filterStatus);
    }

    // Sort by selected criteria
    switch (sortBy) {
      case 'speaker':
        filtered = [...filtered].sort((a, b) => a.speaker_name.localeCompare(b.speaker_name));
        break;
      case 'status':
        filtered = [...filtered].sort((a, b) => a.status.localeCompare(b.status));
        break;
      case 'date':
      default:
        filtered = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    return filtered;
  };

  const getStatusCounts = () => {
    return {
      all: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      accepted: requests.filter(r => r.status === 'accepted' || r.status === 'approved').length,
      declined: requests.filter(r => r.status === 'declined').length,
      cancelled: requests.filter(r => r.status === 'cancelled').length,
    };
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
            name={request.speaker_name}
            imageUrl={request.speaker_image}
            size={40}
            showBorder={false}
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
            <MaterialIcons name="business" size={16} color={colors.text?.secondary || (isDark ? '#cccccc' : '#666666')} />
            <Text style={styles.metaText}>{request.requester_company}</Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="schedule" size={16} color={colors.text?.secondary || (isDark ? '#cccccc' : '#666666')} />
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
            <MaterialIcons name="close" size={24} color={colors.text?.primary || (isDark ? '#ffffff' : '#000000')} />
          </TouchableOpacity>
        </View>

        {selectedRequest && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Speaker</Text>
              <View style={styles.speakerDetail}>
                <SpeakerAvatar
                  name={selectedRequest.speaker_name}
                  imageUrl={selectedRequest.speaker_image}
                  size={60}
                  showBorder={true}
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
    console.log('🔄 Rendering loading state...');
    return (
      <View style={styles.loadingContainer}>
        <MaterialIcons name="send" size={48} color={colors.primary} />
        <Text style={styles.loadingText}>Loading your requests...</Text>
        <Text style={styles.loadingSubtext}>Please wait while we fetch your data</Text>
        <Text style={styles.loadingSubtext}>User: {user?.email || 'No user'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'My Meeting Requests',
          headerBackTitle: 'Back'
        }} 
      />
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="send" size={64} color={colors.secondary} />
            <Text style={styles.emptyTitle}>No Meeting Requests</Text>
            <Text style={styles.emptyDescription}>
              You haven't sent any meeting requests yet. Start networking by browsing speakers and requesting meetings!
            </Text>
            <Text style={styles.emptyInstructions}>
              💡 To create a meeting request: Go to a speaker's profile and tap "Request Meeting"
            </Text>
            <View style={styles.emptyActions}>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => router.push('/events/bsl2025/speakers')}
              >
                <MaterialIcons name="search" size={20} color="white" />
                <Text style={styles.browseButtonText}>Browse Speakers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => router.push('/events/bsl2025/explore')}
              >
                <MaterialIcons name="explore" size={20} color={colors.primary} />
                <Text style={styles.exploreButtonText}>Explore Events</Text>
              </TouchableOpacity>
            </View>
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

            {/* Filter and Sort Controls */}
            <View style={styles.controlsContainer}>
              {/* Status Filter */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterContainer}
              >
                {[
                  { key: 'all', label: 'All', count: getStatusCounts().all },
                  { key: 'pending', label: 'Pending', count: getStatusCounts().pending },
                  { key: 'accepted', label: 'Accepted', count: getStatusCounts().accepted },
                  { key: 'declined', label: 'Declined', count: getStatusCounts().declined },
                  { key: 'cancelled', label: 'Cancelled', count: getStatusCounts().cancelled },
                ].map((filter) => (
                  <TouchableOpacity
                    key={filter.key}
                    style={[
                      styles.filterButton,
                      filterStatus === filter.key && styles.filterButtonActive
                    ]}
                    onPress={() => setFilterStatus(filter.key)}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      filterStatus === filter.key && styles.filterButtonTextActive
                    ]}>
                      {filter.label} ({filter.count})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Sort Options */}
              <View style={styles.sortContainer}>
                <Text style={styles.sortLabel}>Sort by:</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.sortButtons}
                >
                  {[
                    { key: 'date', label: 'Date', icon: 'schedule' },
                    { key: 'speaker', label: 'Speaker', icon: 'person' },
                    { key: 'status', label: 'Status', icon: 'flag' },
                  ].map((sort) => (
                    <TouchableOpacity
                      key={sort.key}
                      style={[
                        styles.sortButton,
                        sortBy === sort.key && styles.sortButtonActive
                      ]}
                      onPress={() => setSortBy(sort.key)}
                    >
                      <MaterialIcons 
                        name={sort.icon as any} 
                        size={16} 
                        color={sortBy === sort.key ? colors.primary : (colors.text?.secondary || (isDark ? '#cccccc' : '#666666'))} 
                      />
                      <Text style={[
                        styles.sortButtonText,
                        sortBy === sort.key && styles.sortButtonTextActive
                      ]}>
                        {sort.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Filtered and Sorted Requests */}
            {getFilteredAndSortedRequests().map(renderRequestCard)}
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
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
    textAlign: 'center',
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
    marginBottom: 16,
  },
  emptyInstructions: {
    fontSize: 12,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  browseButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  browseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  exploreButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exploreButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: colors.card?.default || (isDark ? '#1e1e1e' : '#ffffff'),
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? '#404040' : 'transparent',
    shadowColor: isDark ? '#000000' : '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: isDark ? 4 : 2,
  },
  controlsContainer: {
    marginBottom: 16,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterButton: {
    backgroundColor: colors.card?.default || (isDark ? '#1a1a1a' : '#f5f5f5'),
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? '#333333' : 'transparent',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
    marginRight: 12,
  },
  sortButtons: {
    flexDirection: 'row',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card?.default || (isDark ? '#1a1a1a' : '#f5f5f5'),
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? '#333333' : 'transparent',
  },
  sortButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
    borderWidth: 1,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
    marginLeft: 4,
  },
  sortButtonTextActive: {
    color: colors.primary,
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
  requestCard: {
    backgroundColor: colors.card?.default || (isDark ? '#1e1e1e' : '#ffffff'),
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? '#404040' : 'transparent',
    shadowColor: isDark ? '#000000' : '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: isDark ? 4 : 2,
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
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
  },
  requestDate: {
    fontSize: 12,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  requestContent: {
    flex: 1,
  },
  requestMessage: {
    fontSize: 14,
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
    lineHeight: 20,
    marginBottom: 8,
  },
  intentionsContainer: {
    marginBottom: 8,
  },
  intentionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 2,
  },
  intentionsText: {
    fontSize: 12,
    color: colors.secondary,
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
    color: colors.secondary,
    marginLeft: 4,
  },
  modalContainer: {
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
  responseDate: {
    fontSize: 12,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
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
