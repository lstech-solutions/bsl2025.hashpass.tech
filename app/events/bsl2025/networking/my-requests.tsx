import React, { useState, useEffect, useMemo } from 'react';
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
import LoadingScreen from '../../../../components/LoadingScreen';
import { MeetingRequest } from '@/types/networking';
import { CopilotStep, walkthroughable } from 'react-native-copilot';
import UnifiedSearchAndFilter from '../../../../components/UnifiedSearchAndFilter';

const CopilotView = walkthroughable(View);
const CopilotTouchableOpacity = walkthroughable(TouchableOpacity);

// Helper function to generate user avatar URL
const generateUserAvatarUrl = (name: string): string => {
  const seed = name.toLowerCase().replace(/\s+/g, '-');
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
};

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
  const [activeTab, setActiveTab] = useState<'sent' | 'incoming'>('sent');
  const [filteredRequests, setFilteredRequests] = useState<MeetingRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔄 useEffect triggered, user:', user ? 'present' : 'null');
    if (user) {
      console.log('🔄 User found, calling loadMyRequests...');
      loadMyRequests();
    } else {
      console.log('⚠️ No user found, setting loading to false');
      setLoading(false);
    }
    
    const timeout = setTimeout(() => {
      if (loading && requests.length === 0) {
        console.warn('⚠️ My requests loading timeout (requests still empty), setting loading to false');
        setLoading(false);
      }
    }, 10000);

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

      // Fetch SENT requests
      const { data: sentData, error: sentError } = await supabase
        .from('meeting_requests')
        .select('*')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });

      if (sentError) {
        console.error('Error loading sent requests:', sentError);
      }

      // Fetch INCOMING requests (if user is a speaker)
      let incomingData: any[] = [];
      try {
        const { data: speakerRows, error: speakerErr } = await supabase
          .from('bsl_speakers')
          .select('id')
          .eq('user_id', user.id);
        
        if (!speakerErr && speakerRows && speakerRows.length > 0) {
          const { data: inc, error: incErr } = await supabase
            .from('meeting_requests')
            .select('*')
            .in('speaker_id', speakerRows.map((r: any) => r.id))
            .order('created_at', { ascending: false });
          
          incomingData = inc || [];
          
          // Fetch requester info for incoming requests
          if (incomingData.length > 0) {
            const requesterIds = [...new Set(incomingData.map(r => r.requester_id))];
            
            // Try to fetch from profiles table, fallback to auth.users metadata
            let profileMap = new Map();
            try {
              const { data: userProfiles } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, email')
                .in('id', requesterIds);
              
              profileMap = new Map((userProfiles || []).map(p => [p.id, p]));
            } catch (e) {
              // Profiles table might not exist, try auth.users
              console.log('Profiles table not found, using requester_name from request');
            }
            
            incomingData = incomingData.map(request => {
              const profile = profileMap.get(request.requester_id);
              const requesterName = request.requester_name || 'User';
              return {
                ...request,
                requester_avatar: profile?.avatar_url || generateUserAvatarUrl(requesterName),
                requester_full_name: profile?.full_name || requesterName,
                requester_email: profile?.email || request.requester_name || '',
              };
            });
          }
        }
      } catch (e) {
        console.warn('Failed to load incoming requests:', e);
      }

      // Fetch speaker images for sent requests
      let sentWithImages = sentData || [];
      if (sentWithImages.length > 0) {
        sentWithImages = await Promise.all(
          sentWithImages.map(async (request) => {
            try {
              const { data: speakerData } = await supabase
                .from('bsl_speakers')
                .select('imageurl')
                .eq('id', request.speaker_id)
                .single();

              return {
                ...request,
                speaker_image: speakerData?.imageurl || null
              };
            } catch (error) {
              return request;
            }
          })
        );
      }

      // Merge and annotate direction
      const merged = [
        ...(sentWithImages || []).map((r: any) => ({ ...r, _direction: 'sent' })),
        ...(incomingData || []).map((r: any) => ({ ...r, _direction: 'incoming' })),
      ];

      setRequests(merged as any);
    } catch (error) {
      console.error('❌ Error loading my requests:', error);
      showError('Error Loading Requests', 'Failed to load your meeting requests');
      setRequests([]);
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
      const { data, error } = await supabase
        .rpc('cancel_meeting_request', {
          p_request_id: request.id.toString(),
          p_user_id: user?.id.toString()
        });

      if (error) throw error;

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

  const loadAvailableSlots = async (speakerId: string, durationMinutes: number = 15) => {
    try {
      setLoadingSlots(true);
      const { data, error } = await supabase
        .rpc('get_speaker_available_slots', {
          p_speaker_id: speakerId,
          p_date: null,
          p_duration_minutes: durationMinutes
        });

      if (error) throw error;

      setAvailableSlots(data || []);
      setShowSlotPicker(true);
    } catch (error: any) {
      console.error('❌ Error loading slots:', error);
      showError('Error', 'Failed to load available slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleAcceptRequest = async (request: MeetingRequest, slotTime?: string) => {
    if (!user) return;
    
    // If no slot provided, show slot picker first
    if (!slotTime) {
      await loadAvailableSlots(request.speaker_id, request.duration_minutes || 15);
      return;
    }
    
    try {
      // Get speaker_id for current user
      const { data: speakerData } = await supabase
        .from('bsl_speakers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!speakerData) {
        showError('Error', 'You are not a speaker');
        return;
      }

      const { data, error } = await supabase
        .rpc('accept_meeting_request', {
          p_request_id: request.id,
          p_speaker_id: request.speaker_id,
          p_slot_start_time: slotTime,
          p_speaker_response: null
        });

      if (error) throw error;

      if (data?.success) {
        showSuccess('Request Accepted', 'The meeting request has been accepted and scheduled');
        await loadMyRequests();
        setShowDetailModal(false);
        setShowSlotPicker(false);
        setSelectedSlot(null);
      } else {
        throw new Error(data?.error || 'Failed to accept request');
      }
    } catch (error: any) {
      console.error('❌ Error accepting request:', error);
      showError('Accept Failed', error.message || 'Failed to accept meeting request');
    }
  };

  const handleDeclineRequest = async (request: MeetingRequest) => {
    if (!user) return;
    
    try {
      const { data: speakerData } = await supabase
        .from('bsl_speakers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!speakerData) {
        showError('Error', 'You are not a speaker');
        return;
      }

      const { data, error } = await supabase
        .rpc('decline_meeting_request', {
          p_request_id: request.id,
          p_speaker_id: request.speaker_id,
          p_speaker_response: null
        });

      if (error) throw error;

      if (data?.success) {
        showSuccess('Request Declined', 'The meeting request has been declined');
        await loadMyRequests();
        setShowDetailModal(false);
      } else {
        throw new Error(data?.error || 'Failed to decline request');
      }
    } catch (error: any) {
      console.error('❌ Error declining request:', error);
      showError('Decline Failed', error.message || 'Failed to decline meeting request');
    }
  };

  const handleBlockUser = async (request: MeetingRequest) => {
    if (!user) return;
    
    try {
      const { data: speakerData } = await supabase
        .from('bsl_speakers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!speakerData) {
        showError('Error', 'You are not a speaker');
        return;
      }

      const { data, error } = await supabase
        .rpc('block_user_and_decline_request', {
          p_request_id: request.id,
          p_speaker_id: request.speaker_id,
          p_user_id: request.requester_id,
          p_reason: 'User has been blocked'
        });

      if (error) throw error;

      if (data?.success) {
        showSuccess('User Blocked', 'The user has been blocked and their request declined');
        await loadMyRequests();
        setShowDetailModal(false);
      } else {
        throw new Error(data?.error || 'Failed to block user');
      }
    } catch (error: any) {
      console.error('❌ Error blocking user:', error);
      showError('Block Failed', error.message || 'Failed to block user');
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expired';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'requested': return '#FF9800';
      case 'accepted': return '#4CAF50';
      case 'rejected':
      case 'declined': return '#F44336';
      case 'cancelled': return '#9E9E9E';
      case 'expired': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'requested': return 'schedule';
      case 'accepted': return 'check-circle';
      case 'rejected':
      case 'declined': return 'cancel';
      case 'cancelled': return 'block';
      case 'expired': return 'schedule';
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

  // Filter requests by active tab
  const tabFilteredRequests = useMemo(() => {
    return requests.filter((r: any) => r._direction === activeTab);
  }, [requests, activeTab]);

  // Custom filter logic for UnifiedSearchAndFilter
  const customFilterLogic = (data: MeetingRequest[], filters: { [key: string]: any }, query: string) => {
    let filtered = [...data];

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(request => {
        if (filters.status === 'requested') {
          return request.status === 'pending' || request.status === 'requested';
        } else if (filters.status === 'rejected') {
          return request.status === 'rejected' || request.status === 'declined';
        }
        return request.status === filters.status;
      });
    }

    // Apply search query
    if (query.trim()) {
      const lowercaseQuery = query.toLowerCase();
      filtered = filtered.filter(request => {
        const searchableText = [
          request.speaker_name,
          request.requester_name,
          request.message,
          request.note,
          request.requester_company,
        ].join(' ').toLowerCase();
        return searchableText.includes(lowercaseQuery);
      });
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return filtered;
  };

  const filterGroups = [
    {
      key: 'status',
      label: 'Status',
      type: 'chips' as const,
      options: [
        { key: 'all', label: 'All' },
        { key: 'requested', label: 'Requested' },
        { key: 'accepted', label: 'Accepted' },
        { key: 'rejected', label: 'Rejected' },
        { key: 'cancelled', label: 'Cancelled' },
      ],
    },
  ];

  const renderRequestCard = (request: MeetingRequest) => {
    const direction = (request as any)._direction || 'sent';
    const isIncoming = direction === 'incoming';
    
    // For incoming requests, show requester info; for sent, show speaker info
    const displayName = isIncoming 
      ? ((request as any).requester_full_name || request.requester_name)
      : request.speaker_name;
    const displayAvatar = isIncoming
      ? ((request as any).requester_avatar)
      : (request.speaker_image || null);
    const displaySubtitle = isIncoming
      ? ((request as any).requester_email || request.requester_company || '')
      : (request.requester_company || '');
    
    return (
      <TouchableOpacity
        key={request.id}
        style={styles.requestCard}
        onPress={() => handleRequestPress(request)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <SpeakerAvatar
              name={displayName}
              imageUrl={displayAvatar}
              size={56}
              showBorder={true}
            />
            {isIncoming && (
              <View style={styles.incomingBadge}>
                <MaterialIcons name="inbox" size={12} color="white" />
              </View>
            )}
          </View>
          
          <View style={styles.cardHeaderContent}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                <MaterialIcons name={getStatusIcon(request.status) as any} size={14} color="white" />
                <Text style={styles.statusText}>
                  {request.status === 'pending' ? 'PENDING' : request.status.toUpperCase()}
                </Text>
              </View>
            </View>
            
            {displaySubtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {displaySubtitle}
              </Text>
            )}
            
            <View style={styles.dateRow}>
              <Text style={styles.dateText}>
                {formatDate(request.created_at)}
              </Text>
              {request.expires_at && (
                <View style={[
                  styles.expirationBadge,
                  new Date(request.expires_at) < new Date() && styles.expirationBadgeExpired
                ]}>
                  <MaterialIcons 
                    name="schedule" 
                    size={12} 
                    color={new Date(request.expires_at) < new Date() ? '#F44336' : '#FF9800'} 
                  />
                  <Text style={[
                    styles.expirationText,
                    new Date(request.expires_at) < new Date() && styles.expirationTextExpired
                  ]}>
                    {getTimeRemaining(request.expires_at)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {(request.message || request.note) && (
          <View style={styles.cardContent}>
            {request.message && (
              <Text style={styles.messageText} numberOfLines={2}>
                {request.message}
              </Text>
            )}
            {request.note && (
              <View style={styles.noteContainer}>
                <Text style={styles.noteLabel}>Intentions:</Text>
                <Text style={styles.noteText} numberOfLines={2}>
                  {request.note}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialIcons 
                name="schedule" 
                size={16} 
                color={isDark ? '#B0B0B0' : '#666666'} 
              />
              <Text style={styles.metaText}>{request.duration_minutes} min</Text>
            </View>
            {request.boost_amount && request.boost_amount > 0 && (
              <View style={styles.metaItem}>
                <MaterialIcons name="flash-on" size={16} color="#FFC107" />
                <Text style={styles.metaText}>{request.boost_amount} boost</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => (
    <Modal
      visible={showDetailModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Request Details</Text>
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
              <Text style={styles.detailLabel}>
                {(selectedRequest as any)._direction === 'incoming' ? 'Requester' : 'Speaker'}
              </Text>
              <View style={styles.speakerDetail}>
                <SpeakerAvatar
                  name={(selectedRequest as any)._direction === 'incoming' 
                    ? ((selectedRequest as any).requester_full_name || selectedRequest.requester_name)
                    : selectedRequest.speaker_name}
                  imageUrl={(selectedRequest as any)._direction === 'incoming'
                    ? ((selectedRequest as any).requester_avatar)
                    : (selectedRequest.speaker_image || null)}
                  size={60}
                  showBorder={true}
                />
                <View style={styles.speakerDetailInfo}>
                  <Text style={styles.speakerDetailName}>
                    {(selectedRequest as any)._direction === 'incoming'
                      ? ((selectedRequest as any).requester_full_name || selectedRequest.requester_name)
                      : selectedRequest.speaker_name}
                  </Text>
                  <Text style={styles.speakerDetailTitle}>
                    {(selectedRequest as any)._direction === 'incoming' ? 'Requester' : 'Speaker'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Status</Text>
              <View style={[styles.statusDetail, { backgroundColor: getStatusColor(selectedRequest.status) }]}>
                <MaterialIcons name={getStatusIcon(selectedRequest.status) as any} size={20} color="white" />
                <Text style={styles.statusDetailText}>
                  {selectedRequest.status === 'pending' ? 'PENDING' : selectedRequest.status.toUpperCase()}
                </Text>
              </View>
            </View>

            {selectedRequest.message && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Message</Text>
                <Text style={styles.detailValue}>{selectedRequest.message}</Text>
              </View>
            )}

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
                {selectedRequest.boost_amount && selectedRequest.boost_amount > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Boost:</Text>
                    <Text style={styles.detailRowValue}>{selectedRequest.boost_amount} points</Text>
                  </View>
                )}
                {selectedRequest.expires_at && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Expires:</Text>
                    <Text style={[
                      styles.detailRowValue,
                      new Date(selectedRequest.expires_at) < new Date() && styles.expiredText
                    ]}>
                      {formatDate(selectedRequest.expires_at)} ({getTimeRemaining(selectedRequest.expires_at)})
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Timeline</Text>
              <View style={styles.timeline}>
                <View style={styles.timelineItem}>
                  <Text style={styles.timelineDate}>{formatDate(selectedRequest.created_at)}</Text>
                  <Text style={styles.timelineText}>Request sent</Text>
                </View>
                {selectedRequest.expires_at && (
                  <View style={styles.timelineItem}>
                    <Text style={styles.timelineDate}>{formatDate(selectedRequest.expires_at)}</Text>
                    <Text style={styles.timelineText}>Expires</Text>
                  </View>
                )}
                {selectedRequest.updated_at !== selectedRequest.created_at && (
                  <View style={styles.timelineItem}>
                    <Text style={styles.timelineDate}>{formatDate(selectedRequest.updated_at)}</Text>
                    <Text style={styles.timelineText}>Status updated</Text>
                  </View>
                )}
              </View>
            </View>

            {selectedRequest.speaker_response && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Response</Text>
                <Text style={styles.detailValue}>{selectedRequest.speaker_response}</Text>
                {selectedRequest.speaker_response_at && (
                  <Text style={styles.responseDate}>
                    {formatDate(selectedRequest.speaker_response_at)}
                  </Text>
                )}
              </View>
            )}

            {/* Action Buttons */}
            {(selectedRequest.status === 'requested' || selectedRequest.status === 'pending') && (
              <>
                {(selectedRequest as any)._direction === 'sent' ? (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelRequest(selectedRequest)}
                  >
                    <MaterialIcons name="cancel" size={20} color="white" />
                    <Text style={styles.cancelButtonText}>Cancel Request</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => handleAcceptRequest(selectedRequest)}
                      disabled={loadingSlots}
                    >
                      <MaterialIcons name="check-circle" size={20} color="white" />
                      <Text style={styles.actionButtonText}>
                        {loadingSlots ? 'Loading slots...' : 'Accept'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.declineButton]}
                      onPress={() => handleDeclineRequest(selectedRequest)}
                    >
                      <MaterialIcons name="cancel" size={20} color="white" />
                      <Text style={styles.actionButtonText}>Decline</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.blockButton]}
                      onPress={() => handleBlockUser(selectedRequest)}
                    >
                      <MaterialIcons name="block" size={20} color="white" />
                      <Text style={styles.actionButtonText}>Block User</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <LoadingScreen
        icon="send"
        message="Loading your requests..."
        fullScreen={true}
      />
    );
  }

  const sentCount = requests.filter((r: any) => r._direction === 'sent').length;
  const incomingCount = requests.filter((r: any) => r._direction === 'incoming').length;

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Your Request',
          headerBackTitle: 'Back'
        }} 
      />
      
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <MaterialIcons 
            name="send" 
            size={18} 
            color={activeTab === 'sent' ? colors.primary : (isDark ? '#888' : '#666')} 
          />
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            Sent
          </Text>
          {sentCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{sentCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'incoming' && styles.activeTab]}
          onPress={() => setActiveTab('incoming')}
        >
          <MaterialIcons 
            name="inbox" 
            size={18} 
            color={activeTab === 'incoming' ? colors.primary : (isDark ? '#888' : '#666')} 
          />
          <Text style={[styles.tabText, activeTab === 'incoming' && styles.activeTabText]}>
            Incoming
          </Text>
          {incomingCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{incomingCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Section */}
      {tabFilteredRequests.length > 0 && (
        <UnifiedSearchAndFilter
          data={tabFilteredRequests}
          onFilteredData={setFilteredRequests}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search requests..."
          searchFields={['speaker_name', 'requester_name', 'message', 'note', 'requester_company']}
          filterGroups={filterGroups}
          showResultsCount={true}
          customFilterLogic={customFilterLogic}
        />
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredRequests.length > 0 ? (
          filteredRequests.map(renderRequestCard)
        ) : tabFilteredRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons 
              name={activeTab === 'sent' ? 'send' : 'inbox'} 
              size={64} 
              color={isDark ? '#666666' : '#999999'} 
            />
            <Text style={styles.emptyTitle}>
              {activeTab === 'sent' ? 'No Sent Requests' : 'No Incoming Requests'}
            </Text>
            <Text style={styles.emptyDescription}>
              {activeTab === 'sent'
                ? "You haven't sent any meeting requests yet. Start networking by requesting meetings with speakers."
                : "You don't have any incoming meeting requests at the moment."}
            </Text>
            {activeTab === 'sent' && (
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => router.push('/events/bsl2025/speakers' as any)}
              >
                <MaterialIcons name="search" size={20} color="white" />
                <Text style={styles.browseButtonText}>Browse Speakers</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="filter-list" size={64} color={isDark ? '#666666' : '#999999'} />
            <Text style={styles.emptyTitle}>No Results</Text>
            <Text style={styles.emptyDescription}>
              No requests match your current filters. Try adjusting your search or filters.
            </Text>
          </View>
        )}
      </ScrollView>

      {renderDetailModal()}

      {/* Slot Picker Modal */}
      <Modal
        visible={showSlotPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowSlotPicker(false);
          setSelectedSlot(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time Slot</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSlotPicker(false);
                  setSelectedSlot(null);
                }}
              >
                <MaterialIcons name="close" size={24} color={colors.text?.primary || (isDark ? '#FFFFFF' : '#000000')} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Choose an available time slot for the meeting
            </Text>

            {loadingSlots ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading available slots...</Text>
              </View>
            ) : availableSlots.length === 0 ? (
              <View style={styles.emptySlotsContainer}>
                <MaterialIcons name="schedule" size={48} color={colors.text?.secondary || (isDark ? '#888888' : '#999999')} />
                <Text style={styles.emptySlotsText}>No available slots found</Text>
                <Text style={styles.emptySlotsSubtext}>
                  Please mark some time slots as available in your schedule
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.slotsList}>
                {availableSlots.map((slot, index) => {
                  const slotDate = new Date(slot.slot_time);
                  const isSelected = selectedSlot === slot.slot_time;
                  const formattedDate = slotDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  });
                  const formattedTime = slotDate.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  });

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.slotItem,
                        isSelected && styles.slotItemSelected
                      ]}
                      onPress={() => setSelectedSlot(slot.slot_time)}
                    >
                      <View style={styles.slotInfo}>
                        <Text style={[styles.slotDate, isSelected && styles.slotDateSelected]}>
                          {formattedDate}
                        </Text>
                        <Text style={[styles.slotTime, isSelected && styles.slotTimeSelected]}>
                          {formattedTime}
                        </Text>
                        <Text style={[styles.slotDuration, isSelected && styles.slotDurationSelected]}>
                          {slot.duration_minutes || 15} minutes
                        </Text>
                      </View>
                      {isSelected && (
                        <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {selectedSlot && (
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => {
                    if (selectedRequest && selectedSlot) {
                      handleAcceptRequest(selectedRequest, selectedSlot);
                    }
                  }}
                >
                  <MaterialIcons name="check-circle" size={20} color="white" />
                  <Text style={styles.confirmButtonText}>Confirm Selection</Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: colors.background?.default || (isDark ? '#000000' : '#ffffff'),
  },
  content: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background?.paper || (isDark ? '#1a1a1a' : '#f5f5f5'),
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333333' : '#e0e0e0',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary || '#007AFF',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: isDark ? '#888888' : '#666666',
  },
  activeTabText: {
    color: colors.primary || '#007AFF',
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: colors.primary || '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  requestCard: {
    backgroundColor: colors.card?.default || (isDark ? '#1e1e1e' : '#ffffff'),
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: isDark ? '#333333' : '#e5e5e5',
    shadowColor: isDark ? '#000000' : '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  incomingBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#2196F3',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.card?.default || (isDark ? '#1e1e1e' : '#ffffff'),
  },
  cardHeaderContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  displayName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#FFFFFF' : '#000000'),
    flex: 1,
    marginRight: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666'),
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    color: colors.text?.secondary || (isDark ? '#888888' : '#999999'),
  },
  expirationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255, 152, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  expirationBadgeExpired: {
    backgroundColor: isDark ? 'rgba(244, 67, 54, 0.2)' : 'rgba(244, 67, 54, 0.1)',
  },
  expirationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF9800',
  },
  expirationTextExpired: {
    color: '#F44336',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#333333' : '#e5e5e5',
  },
  messageText: {
    fontSize: 14,
    color: colors.text?.primary || (isDark ? '#E0E0E0' : '#333333'),
    lineHeight: 20,
    marginBottom: 8,
  },
  noteContainer: {
    marginTop: 8,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary || (isDark ? '#BB86FC' : '#6200EE'),
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    color: colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666'),
    fontStyle: 'italic',
    lineHeight: 18,
  },
  cardFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#333333' : '#e5e5e5',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666'),
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#FFFFFF' : '#000000'),
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666'),
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary || '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  browseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
    color: colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666'),
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    color: colors.text?.primary || (isDark ? '#E0E0E0' : '#333333'),
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
    color: colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666'),
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
    borderWidth: 1,
    borderColor: isDark ? '#404040' : '#e5e5e5',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailRowLabel: {
    fontSize: 14,
    color: colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666'),
  },
  detailRowValue: {
    fontSize: 14,
    color: colors.text?.primary || (isDark ? '#E0E0E0' : '#333333'),
    fontWeight: '500',
  },
  timeline: {
    backgroundColor: colors.card?.default || (isDark ? '#2a2a2a' : '#f5f5f5'),
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? '#404040' : '#e5e5e5',
  },
  timelineItem: {
    marginBottom: 8,
  },
  timelineDate: {
    fontSize: 12,
    color: colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666'),
    fontWeight: '600',
  },
  timelineText: {
    fontSize: 14,
    color: colors.text?.primary || (isDark ? '#E0E0E0' : '#333333'),
    marginTop: 2,
  },
  responseDate: {
    fontSize: 12,
    color: colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666'),
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
    gap: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#FF9800',
  },
  blockButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  expiredText: {
    color: '#F44336',
    fontWeight: '600',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666'),
    marginBottom: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666'),
  },
  emptySlotsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptySlotsText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#E0E0E0' : '#333333'),
    marginTop: 16,
  },
  emptySlotsSubtext: {
    fontSize: 14,
    color: colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666'),
    marginTop: 8,
    textAlign: 'center',
  },
  slotsList: {
    maxHeight: 400,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.card?.default || (isDark ? '#2a2a2a' : '#f5f5f5'),
    borderRadius: 12,
    borderWidth: 2,
    borderColor: isDark ? '#404040' : '#e5e5e5',
  },
  slotItemSelected: {
    borderColor: '#4CAF50',
    backgroundColor: isDark ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)',
  },
  slotInfo: {
    flex: 1,
  },
  slotDate: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#E0E0E0' : '#333333'),
    marginBottom: 4,
  },
  slotDateSelected: {
    color: '#4CAF50',
  },
  slotTime: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text?.primary || (isDark ? '#E0E0E0' : '#333333'),
    marginBottom: 4,
  },
  slotTimeSelected: {
    color: '#4CAF50',
  },
  slotDuration: {
    fontSize: 12,
    color: colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666'),
  },
  slotDurationSelected: {
    color: '#4CAF50',
  },
  modalFooter: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#404040' : '#e5e5e5',
    marginTop: 20,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
