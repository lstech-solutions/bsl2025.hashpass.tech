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
import * as Haptics from 'expo-haptics';

// Extended type for internal use with direction tracking
type MeetingRequestWithDirection = MeetingRequest & {
  _direction?: 'sent' | 'incoming';
  requester_id?: string;
  requester_avatar?: string;
  requester_full_name?: string;
  requester_email?: string;
  speaker_image?: string;
};
import { CopilotStep, walkthroughable } from 'react-native-copilot';
import UnifiedSearchAndFilter from '../../../../components/UnifiedSearchAndFilter';
import { useNotifications } from '../../../../contexts/NotificationContext';

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
  const { notifications, refreshNotifications } = useNotifications();
  const styles = getStyles(isDark, colors);

  const [requests, setRequests] = useState<MeetingRequestWithDirection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MeetingRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'sent' | 'incoming'>('sent');
  const [filteredRequests, setFilteredRequests] = useState<MeetingRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [showSlotConfirmation, setShowSlotConfirmation] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [confirmedMeetingId, setConfirmedMeetingId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdTime, setHoldTime] = useState(1); // Hours
  const [expirationCountdown, setExpirationCountdown] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

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

  // Real-time subscription for meeting requests
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setting up real-time subscriptions for meeting requests...');

    // Get speaker IDs for this user
    let speakerIds: string[] = [];
    supabase
      .from('bsl_speakers')
      .select('id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) {
          speakerIds = data.map((s: any) => s.id);
        }
      });

    // Subscribe to SENT requests (where user is requester)
    const sentChannel = supabase
      .channel('my_requests_sent')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_requests',
          filter: `requester_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('🔄 Real-time update for SENT request:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            const newRequest = payload.new as any;
            
            // Haptic feedback for new sent request
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
              console.log('Error with haptic feedback:', e);
            }
            
            // Fetch speaker image for the new request
            // Note: newRequest.speaker_id is UUID (user_id), so we need to find bsl_speakers by user_id
            try {
              const { data: speakerData } = await supabase
                .from('bsl_speakers')
                .select('imageurl')
                .eq('user_id', newRequest.speaker_id)
                .single();
              
              setRequests(prev => {
                const exists = prev.some(r => r.id === newRequest.id);
                if (exists) return prev;
                return [{ ...newRequest, _direction: 'sent', speaker_image: speakerData?.imageurl || null }, ...prev];
              });
            } catch (e) {
              setRequests(prev => {
                const exists = prev.some(r => r.id === newRequest.id);
                if (exists) return prev;
                return [{ ...newRequest, _direction: 'sent' as const }, ...prev];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedRequest = payload.new as any;
            const oldRequest = payload.old as any;
            
            // Enhanced haptic feedback and sound-like patterns for status changes on SENT requests
            try {
              if (oldRequest && oldRequest.status !== updatedRequest.status) {
                // Check if this is a pending request that got accepted or declined
                const wasPending = oldRequest.status === 'pending' || oldRequest.status === 'requested';
                
                if (wasPending && (updatedRequest.status === 'accepted' || updatedRequest.status === 'declined' || updatedRequest.status === 'rejected')) {
                  // Enhanced feedback for accepted/declined on pending sent requests
                  if (updatedRequest.status === 'accepted') {
                    // Success pattern: Multiple haptics to simulate sound + vibration
                    // This pattern creates a pleasant "ding" effect with vibration
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setTimeout(async () => {
                      try {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setTimeout(async () => {
                          try {
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          } catch (e) {
                            console.log('Error with secondary haptic:', e);
                          }
                        }, 50);
                      } catch (e) {
                        console.log('Error with haptic sequence:', e);
                      }
                    }, 100);
                    console.log('🎉 Sent request accepted!');
                  } else if (updatedRequest.status === 'declined' || updatedRequest.status === 'rejected') {
                    // Error pattern: Stronger haptics for declined - creates a "buzz" effect
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    setTimeout(async () => {
                      try {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                        setTimeout(async () => {
                          try {
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          } catch (e) {
                            console.log('Error with secondary haptic:', e);
                          }
                        }, 80);
                      } catch (e) {
                        console.log('Error with haptic sequence:', e);
                      }
                    }, 100);
                    console.log('❌ Sent request declined');
                  }
                } else {
                  // Standard haptic feedback for other status changes
                  if (updatedRequest.status === 'cancelled' || updatedRequest.status === 'expired') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  } else if (updatedRequest.status === 'accepted') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  } else if (updatedRequest.status === 'declined' || updatedRequest.status === 'rejected') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  }
                }
              }
            } catch (e) {
              console.log('Error with haptic feedback:', e);
            }
            
            setRequests(prev =>
              prev.map(req =>
                req.id === updatedRequest.id
                  ? { ...updatedRequest, _direction: req._direction || 'sent' }
                  : req
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedRequest = payload.old as any;
            
            // Haptic feedback for deleted requests
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch (e) {
              console.log('Error with haptic feedback:', e);
            }
            
            setRequests(prev => prev.filter(req => req.id !== deletedRequest.id));
          }
        }
      )
      .subscribe();

    // Subscribe to INCOMING requests (where user is speaker)
    // We need to subscribe to all meeting_requests and filter by speaker_id
    const incomingChannel = supabase
      .channel('my_requests_incoming')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_requests',
        },
        async (payload) => {
          // Check if this request is for one of our speakers
          const request = (payload.new || payload.old) as any;
          if (!request || !request.speaker_id) return;

          // Check if this request is for the current user as a speaker
          // Note: meeting_requests.speaker_id is UUID (user_id), not bsl_speakers.id
          if (request.speaker_id !== user.id) {
            return; // Not for this user as a speaker
          }

          console.log('🔄 Real-time update for INCOMING request:', payload.eventType);

          if (payload.eventType === 'INSERT') {
            const newRequest = payload.new as any;
            
            // Play sound and haptic feedback for new incoming request
            try {
              // Haptic feedback - use notification style for a pleasant feel
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              // Additional impact feedback for emphasis
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch (e) {
              console.log('Error with haptic feedback:', e);
            }
            
            // Fetch requester info
            try {
              const requesterIds = [newRequest.requester_id];
              let profileMap = new Map();
              
              try {
                const { data: userProfiles } = await supabase
                  .from('profiles')
                  .select('id, full_name, avatar_url, email')
                  .in('id', requesterIds);
                
                profileMap = new Map((userProfiles || []).map(p => [p.id, p]));
              } catch (e) {
                console.log('Profiles table not found, using requester_name from request');
              }
              
              const profile = profileMap.get(newRequest.requester_id);
              const requesterName = newRequest.requester_name || 'User';
              
              const enrichedRequest = {
                ...newRequest,
                _direction: 'incoming' as const,
                requester_avatar: profile?.avatar_url || generateUserAvatarUrl(requesterName),
                requester_full_name: profile?.full_name || requesterName,
                requester_email: profile?.email || newRequest.requester_name || '',
              };

              setRequests(prev => {
                const exists = prev.some(r => r.id === newRequest.id);
                if (exists) return prev;
                return [enrichedRequest, ...prev];
              });
            } catch (e) {
              setRequests(prev => {
                const exists = prev.some(r => r.id === newRequest.id);
                if (exists) return prev;
                return [{ ...newRequest, _direction: 'incoming' as const }, ...prev];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedRequest = payload.new as any;
            const oldRequest = payload.old as any;
            
            // Haptic feedback for status changes
            try {
              if (oldRequest && oldRequest.status !== updatedRequest.status) {
                // Different haptic based on new status
                if (updatedRequest.status === 'cancelled' || updatedRequest.status === 'expired') {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                } else if (updatedRequest.status === 'accepted') {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } else if (updatedRequest.status === 'declined' || updatedRequest.status === 'rejected') {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                }
              }
            } catch (e) {
              console.log('Error with haptic feedback:', e);
            }
            
            setRequests(prev =>
              prev.map(req =>
                req.id === updatedRequest.id
                  ? { ...updatedRequest, _direction: req._direction || 'incoming' }
                  : req
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedRequest = payload.old as any;
            
            // Haptic feedback for deleted requests
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch (e) {
              console.log('Error with haptic feedback:', e);
            }
            
            setRequests(prev => prev.filter(req => req.id !== deletedRequest.id));
          }
        }
      )
      .subscribe();

    // Subscribe to notifications to detect new requests
    const notificationChannel = supabase
      .channel('my_requests_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const notification = payload.new as any;
          console.log('🔄 New notification received:', notification.type);
          
          // If it's a meeting request notification, refresh requests
          if (notification.type === 'meeting_request' || 
              notification.type === 'meeting_accepted' || 
              notification.type === 'meeting_declined') {
            console.log('🔄 Meeting-related notification, refreshing requests...');
            // Small delay to ensure DB has updated
            setTimeout(() => {
              loadMyRequests();
            }, 500);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up real-time subscriptions...');
      supabase.removeChannel(sentChannel);
      supabase.removeChannel(incomingChannel);
      supabase.removeChannel(notificationChannel);
    };
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
      // Note: meeting_requests.speaker_id is UUID (user_id from bsl_speakers), not bsl_speakers.id
      // So we use user.id directly
      let incomingData: any[] = [];
      try {
        // Check if user is a speaker
        const { data: speakerRows, error: speakerErr } = await supabase
          .from('bsl_speakers')
          .select('id, user_id')
          .eq('user_id', user.id);
        
        if (!speakerErr && speakerRows && speakerRows.length > 0) {
          // meeting_requests.speaker_id stores the user_id (UUID), not bsl_speakers.id
          const { data: inc, error: incErr } = await supabase
            .from('meeting_requests')
            .select('*')
            .eq('speaker_id', user.id) // Use user.id directly since speaker_id is UUID (user_id)
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
      // Note: request.speaker_id is UUID (user_id), so we need to find bsl_speakers by user_id
      let sentWithImages = sentData || [];
      if (sentWithImages.length > 0) {
        sentWithImages = await Promise.all(
          sentWithImages.map(async (request) => {
            try {
              const { data: speakerData } = await supabase
                .from('bsl_speakers')
                .select('imageurl')
                .eq('user_id', request.speaker_id)
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
    // Show confirmation modal first
    setShowCancelConfirm(true);
  };

  const confirmCancelRequest = async () => {
    if (!selectedRequest || !user) return;
    
    try {
      setShowCancelConfirm(false);
      
      const { data, error } = await supabase
        .rpc('cancel_meeting_request', {
          p_request_id: selectedRequest.id,
          p_user_id: user.id
        });

      if (error) {
        console.error('❌ Cancel request error:', error);
        throw error;
      }

      if (data?.success) {
        showSuccess('Request Cancelled', 'Your meeting request has been cancelled. Your request limit has been restored, but boost points are not refunded.');
        await loadMyRequests();
        setShowDetailModal(false);
        setSelectedRequest(null);
      } else {
        throw new Error(data?.error || data?.message || 'Failed to cancel request');
      }
    } catch (error: any) {
      console.error('❌ Error cancelling request:', error);
      showError('Cancellation Failed', error?.message || 'Failed to cancel meeting request. Please try again.');
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
        // Show confirmation modal with meeting details
        setConfirmedMeetingId(data.meeting_id);
        setShowSlotPicker(false);
        setShowSlotConfirmation(true);
        await loadMyRequests();
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

      const requestWithId = request as MeetingRequestWithDirection;
      const { data, error } = await supabase
        .rpc('block_user_and_decline_request', {
          p_request_id: request.id,
          p_speaker_id: request.speaker_id,
          p_user_id: requestWithId.requester_id || (request as any).requester_id,
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

  // Countdown timer effect for expiration
  useEffect(() => {
    if (!selectedRequest?.expires_at) {
      setExpirationCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const expires = new Date(selectedRequest.expires_at!);
      const diffMs = expires.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        setExpirationCountdown({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      // Cap hours at 6 (maximum boost time) to prevent display issues
      // If it's more than 6 hours, something is wrong with the data
      const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
      const hours = Math.min(totalHours, 6); // Cap at 6 hours max
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      setExpirationCountdown({ hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [selectedRequest?.expires_at, showDetailModal]);

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
  const customFilterLogic = (data: MeetingRequestWithDirection[], filters: { [key: string]: any }, query: string) => {
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
                <MaterialIcons name="bolt" size={16} color="#FFC107" />
                <Text style={styles.metaText}>{request.boost_amount} BOOST</Text>
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
          <ScrollView 
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
          >
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
                  <View style={styles.nameRowWithBadge}>
                    <Text style={styles.speakerDetailName}>
                      {(selectedRequest as any)._direction === 'incoming'
                        ? ((selectedRequest as any).requester_full_name || selectedRequest.requester_name)
                        : selectedRequest.speaker_name}
                    </Text>
                    {(selectedRequest as any)._direction === 'incoming' && selectedRequest.requester_ticket_type && (
                      <View style={[
                        styles.ticketBadge,
                        selectedRequest.requester_ticket_type.toLowerCase() === 'vip' && styles.vipBadge
                      ]}>
                        <MaterialIcons 
                          name={selectedRequest.requester_ticket_type.toLowerCase() === 'vip' ? 'star' : 'person'} 
                          size={12} 
                          color="white" 
                        />
                        <Text style={styles.ticketBadgeText}>
                          {selectedRequest.requester_ticket_type.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.speakerDetailTitle}>
                    {(selectedRequest as any)._direction === 'incoming' ? 'Requester' : 'Speaker'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Expiration Countdown Timer */}
            {selectedRequest.expires_at && expirationCountdown && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Expires In</Text>
                <View style={styles.countdownContainer}>
                  <View style={styles.countdownUnit}>
                    <Text style={styles.countdownValue}>
                      {String(expirationCountdown.hours).padStart(2, '0')}
                    </Text>
                    <Text style={styles.countdownLabel}>HRS</Text>
                  </View>
                  <Text style={styles.countdownSeparator}>:</Text>
                  <View style={styles.countdownUnit}>
                    <Text style={styles.countdownValue}>
                      {String(expirationCountdown.minutes).padStart(2, '0')}
                    </Text>
                    <Text style={styles.countdownLabel}>MIN</Text>
                  </View>
                  <Text style={styles.countdownSeparator}>:</Text>
                  <View style={styles.countdownUnit}>
                    <Text style={styles.countdownValue}>
                      {String(expirationCountdown.seconds).padStart(2, '0')}
                    </Text>
                    <Text style={styles.countdownLabel}>SEC</Text>
                  </View>
                </View>
              </View>
            )}

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
                    <View style={styles.detailRowLabelContainer}>
                      <MaterialIcons name="bolt" size={16} color="#FFC107" />
                      <Text style={styles.detailRowLabel}>Boost:</Text>
                    </View>
                    <Text style={styles.detailRowValue}>{selectedRequest.boost_amount} BOOST</Text>
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
                      style={[styles.actionButton, styles.holdButton]}
                      onPress={() => setShowHoldModal(true)}
                    >
                      <MaterialIcons name="schedule" size={20} color="white" />
                      <Text style={styles.actionButtonText}>Hold Request</Text>
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

      {/* Hold Request Confirmation Modal */}
      <Modal
        visible={showHoldModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHoldModal(false)}
      >
        <View style={styles.holdModalOverlay}>
          <View style={styles.holdModalContent}>
            <Text style={styles.holdModalTitle}>Hold Request</Text>
            <Text style={styles.holdModalDescription}>
              Extend the expiration time of this request by spending your boost points.
            </Text>
            
            <View style={styles.holdSliderContainer}>
              <Text style={styles.holdSliderLabel}>
                Hold Duration: {holdTime} {holdTime === 1 ? 'hour' : 'hours'}
              </Text>
              <View style={styles.holdSliderTrack}>
                <View style={[styles.holdSliderFill, { width: `${(holdTime / 6) * 100}%` }]} />
                <View style={[styles.holdSliderThumb, { left: `${((holdTime - 1) / 5) * 100}%` }]} />
              </View>
              <View style={styles.holdSliderMarks}>
                {[1, 2, 3, 4, 5, 6].map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={styles.holdSliderMark}
                    onPress={() => setHoldTime(hour)}
                  >
                    <View style={[
                      styles.holdSliderMarkDot,
                      holdTime >= hour && styles.holdSliderMarkDotActive
                    ]} />
                    <Text style={[
                      styles.holdSliderMarkLabel,
                      holdTime >= hour && styles.holdSliderMarkLabelActive
                    ]}>
                      {hour}h
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.holdCostContainer}>
              <Text style={styles.holdCostLabel}>Cost:</Text>
              <Text style={styles.holdCostValue}>{holdTime * 50} boost points</Text>
            </View>

            <View style={styles.holdModalButtons}>
              <TouchableOpacity
                style={[styles.holdModalButton, styles.holdModalButtonCancel]}
                onPress={() => setShowHoldModal(false)}
              >
                <Text style={styles.holdModalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.holdModalButton, styles.holdModalButtonConfirm]}
                onPress={() => {
                  // TODO: Implement hold request function
                  setShowHoldModal(false);
                  showSuccess('Request Held', `Request held for ${holdTime} hour(s)`);
                }}
              >
                <MaterialIcons name="check" size={20} color="white" />
                <Text style={styles.holdModalButtonConfirmText}>Confirm Hold</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowSlotPicker(false);
          setSelectedSlot(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            {
              backgroundColor: colors.background?.paper || (isDark ? '#1a1a1a' : '#ffffff'),
              borderColor: colors.divider || (isDark ? '#333333' : '#e0e0e0'),
            }
          ]}>
            {/* Close X Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowSlotPicker(false);
                setSelectedSlot(null);
              }}
            >
              <MaterialIcons name="close" size={24} color={colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666')} />
            </TouchableOpacity>
            
            {/* Header */}
            <View style={styles.modalHeader}>
              <MaterialIcons
                name="schedule"
                size={32}
                color={colors.primary || '#007AFF'}
              />
              <Text style={[styles.modalTitle, { color: colors.text?.primary || (isDark ? '#FFFFFF' : '#000000') }]}>
                Select Time Slot
              </Text>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666') }]}>
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
                  disabled={loadingSlots}
                >
                  {loadingSlots ? (
                    <>
                      <MaterialIcons name="hourglass-empty" size={20} color="white" />
                      <Text style={styles.confirmButtonText}>Scheduling...</Text>
                    </>
                  ) : (
                    <>
                      <MaterialIcons name="check-circle" size={20} color="white" />
                      <Text style={styles.confirmButtonText}>Confirm Selection</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Slot Confirmation Modal (Schedule Summary style) */}
      <Modal
        visible={showSlotConfirmation}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowSlotConfirmation(false);
          setShowDetailModal(false);
          setSelectedSlot(null);
          setConfirmedMeetingId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            {
              backgroundColor: colors.background?.paper || (isDark ? '#1a1a1a' : '#ffffff'),
              borderColor: colors.divider || (isDark ? '#333333' : '#e0e0e0'),
            }
          ]}>
            {/* Close X Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowSlotConfirmation(false);
                setShowDetailModal(false);
                setSelectedSlot(null);
                setConfirmedMeetingId(null);
              }}
            >
              <MaterialIcons name="close" size={24} color={colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666')} />
            </TouchableOpacity>
            
            {/* Header */}
            <View style={styles.modalHeader}>
              <MaterialIcons
                name="check-circle"
                size={32}
                color={colors.success?.main || '#4CAF50'}
              />
              <Text style={[styles.modalTitle, { color: colors.text?.primary || (isDark ? '#FFFFFF' : '#000000') }]}>
                Meeting Scheduled
              </Text>
            </View>

            {/* Meeting Details */}
            {selectedRequest && selectedSlot && (
              <View style={styles.eventDetails}>
                <Text style={[styles.eventTitle, { color: colors.text?.primary || (isDark ? '#FFFFFF' : '#000000') }]}>
                  Meeting with {selectedRequest.requester_name || 'User'}
                </Text>
                
                <View style={styles.eventInfoRow}>
                  <MaterialIcons
                    name="schedule"
                    size={18}
                    color={colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666')}
                  />
                  <Text style={[styles.eventInfoText, { color: colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666') }]}>
                    {new Date(selectedSlot).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric'
                    })} at {new Date(selectedSlot).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </Text>
                </View>

                <View style={styles.eventInfoRow}>
                  <MaterialIcons
                    name="access-time"
                    size={18}
                    color={colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666')}
                  />
                  <Text style={[styles.eventInfoText, { color: colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666') }]}>
                    {selectedRequest.duration_minutes || 15} minutes
                  </Text>
                </View>

                {selectedRequest.meeting_type && (
                  <View style={styles.eventInfoRow}>
                    <MaterialIcons
                      name="category"
                      size={18}
                      color={colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666')}
                    />
                    <Text style={[styles.eventInfoText, { color: colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666') }]}>
                      {selectedRequest.meeting_type.charAt(0).toUpperCase() + selectedRequest.meeting_type.slice(1)} Meeting
                    </Text>
                  </View>
                )}

                {selectedRequest.requester_company && (
                  <View style={styles.eventInfoRow}>
                    <MaterialIcons
                      name="business"
                      size={18}
                      color={colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666')}
                    />
                    <Text style={[styles.eventInfoText, { color: colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666') }]}>
                      {selectedRequest.requester_company}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Message */}
            <View style={[
              styles.messageBox,
              {
                backgroundColor: `${colors.success?.main || '#4CAF50'}15`,
                borderColor: colors.success?.main || '#4CAF50',
              }
            ]}>
              <MaterialIcons
                name="info"
                size={20}
                color={colors.success?.main || '#4CAF50'}
              />
              <Text style={[
                styles.messageText,
                { color: colors.success?.main || '#4CAF50' }
              ]}>
                The meeting has been scheduled and added to both your calendars. You can reschedule or manage this meeting in the meeting room.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  {
                    backgroundColor: colors.primary || '#007AFF',
                  }
                ]}
                onPress={() => {
                  if (confirmedMeetingId) {
                    setShowSlotConfirmation(false);
                    setShowDetailModal(false);
                    setSelectedSlot(null);
                    router.push({
                      pathname: '/events/bsl2025/networking/meeting-detail' as any,
                      params: {
                        meetingId: confirmedMeetingId,
                        speakerName: selectedRequest?.speaker_name || '',
                        requesterName: selectedRequest?.requester_name || '',
                        status: 'tentative',
                        scheduledAt: selectedSlot || '',
                        duration: selectedRequest?.duration_minutes || 15,
                        isSpeaker: 'true'
                      }
                    });
                    setConfirmedMeetingId(null);
                  }
                }}
              >
                <MaterialIcons name="meeting-room" size={20} color="white" />
                <Text style={styles.confirmButtonText}>Go to Meeting Room</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={showCancelConfirm}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCancelConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.cancelModalContent,
            {
              backgroundColor: colors.background?.paper || (isDark ? '#1e1e1e' : '#ffffff'),
              borderColor: colors.divider || (isDark ? '#333333' : '#e0e0e0'),
            }
          ]}>
            {/* Close X Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCancelConfirm(false)}
            >
              <MaterialIcons name="close" size={24} color={colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666')} />
            </TouchableOpacity>
            
            {/* Header */}
            <View style={styles.cancelModalHeader}>
              <View style={[
                styles.warningIconContainer,
                {
                  backgroundColor: isDark ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 152, 0, 0.1)',
                }
              ]}>
                <MaterialIcons
                  name="warning"
                  size={24}
                  color={colors.warning?.main || '#FF9800'}
                />
              </View>
              <Text style={[styles.cancelModalTitle, { color: colors.text?.primary || (isDark ? '#FFFFFF' : '#000000') }]}>
                Cancel Meeting Request?
              </Text>
            </View>

            {/* Warning Message */}
            <View style={[
              styles.cancelModalWarningBox,
              {
                backgroundColor: isDark ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 152, 0, 0.05)',
                borderColor: isDark ? 'rgba(255, 152, 0, 0.3)' : 'rgba(255, 152, 0, 0.2)',
              }
            ]}>
              <MaterialIcons
                name="info"
                size={18}
                color={colors.warning?.main || '#FF9800'}
              />
              <Text style={[styles.cancelModalWarningText, { color: colors.text?.primary || (isDark ? '#FFFFFF' : '#1a1a1a') }]}>
                Are you sure you want to cancel this meeting request?
              </Text>
            </View>

            {/* Disclaimer - Compact */}
            <View style={styles.cancelModalDisclaimer}>
              <View style={styles.cancelModalDisclaimerItem}>
                <MaterialIcons name="check-circle" size={14} color={colors.warning?.main || '#FF9800'} />
                <Text style={[styles.cancelModalDisclaimerText, { color: colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666') }]}>
                  Request limit restored
                </Text>
              </View>
              <View style={styles.cancelModalDisclaimerItem}>
                <MaterialIcons name="close-circle" size={14} color={colors.error?.main || '#F44336'} />
                <Text style={[styles.cancelModalDisclaimerText, { color: colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666') }]}>
                  Boost points not refunded
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.cancelConfirmButton,
                  {
                    backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
                    borderColor: colors.divider || (isDark ? '#404040' : '#e0e0e0'),
                  }
                ]}
                onPress={() => setShowCancelConfirm(false)}
              >
                <Text style={[
                  styles.actionButtonText,
                  { color: colors.text?.primary || (isDark ? '#FFFFFF' : '#1a1a1a') }
                ]}>
                  Keep Request
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.confirmCancelButton,
                  {
                    backgroundColor: colors.error?.main || '#F44336',
                  }
                ]}
                onPress={confirmCancelRequest}
              >
                <MaterialIcons name="cancel" size={20} color="white" />
                <Text style={styles.actionButtonText}>Cancel Request</Text>
              </TouchableOpacity>
            </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider || (isDark ? '#333333' : '#e0e0e0'),
    position: 'relative',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    padding: 8,
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    flex: 1,
  },
  cancelModalContent: {
    backgroundColor: colors.background?.paper || (isDark ? '#1e1e1e' : '#ffffff'),
    borderRadius: 20,
    padding: 0,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
    borderWidth: 1,
    borderColor: colors.divider || (isDark ? '#333333' : '#e0e0e0'),
    position: 'relative',
  },
  modalContentContainer: {
    padding: 20,
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
  holdButton: {
    backgroundColor: '#9C27B0', // Magic violet
    shadowColor: '#9C27B0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  nameRowWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  ticketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#424242' : '#757575',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  vipBadge: {
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  ticketBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  countdownUnit: {
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255, 152, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
  },
  countdownValue: {
    color: '#FF9800',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  countdownLabel: {
    color: isDark ? '#FFB74D' : '#F57C00',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  countdownSeparator: {
    color: '#FF9800',
    fontSize: 20,
    fontWeight: 'bold',
  },
  holdModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  holdModalContent: {
    backgroundColor: colors.background?.paper || (isDark ? '#1a1a1a' : '#ffffff'),
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  holdModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text?.primary || (isDark ? '#FFFFFF' : '#000000'),
    marginBottom: 8,
    textAlign: 'center',
  },
  holdModalDescription: {
    fontSize: 14,
    color: colors.text?.secondary || (isDark ? '#B0B0B0' : '#666666'),
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  holdSliderContainer: {
    marginBottom: 24,
  },
  holdSliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#FFFFFF' : '#000000'),
    marginBottom: 16,
    textAlign: 'center',
  },
  holdSliderTrack: {
    height: 8,
    backgroundColor: isDark ? '#333333' : '#e0e0e0',
    borderRadius: 4,
    position: 'relative',
    marginBottom: 32,
  },
  holdSliderFill: {
    height: '100%',
    backgroundColor: '#9C27B0',
    borderRadius: 4,
  },
  holdSliderThumb: {
    width: 24,
    height: 24,
    backgroundColor: '#9C27B0',
    borderRadius: 12,
    position: 'absolute',
    top: -8,
    shadowColor: '#9C27B0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  holdSliderMarks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  holdSliderMark: {
    alignItems: 'center',
    gap: 4,
  },
  holdSliderMarkDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: isDark ? '#404040' : '#c0c0c0',
  },
  holdSliderMarkDotActive: {
    backgroundColor: '#9C27B0',
    shadowColor: '#9C27B0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  holdSliderMarkLabel: {
    fontSize: 11,
    color: colors.text?.secondary || (isDark ? '#888888' : '#999999'),
    fontWeight: '500',
  },
  holdSliderMarkLabelActive: {
    color: '#9C27B0',
    fontWeight: '700',
  },
  holdCostContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(156, 39, 176, 0.1)' : 'rgba(156, 39, 176, 0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  holdCostLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#FFFFFF' : '#000000'),
  },
  holdCostValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9C27B0',
  },
  holdModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  holdModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  holdModalButtonCancel: {
    backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
    borderWidth: 1,
    borderColor: colors.divider || (isDark ? '#404040' : '#e0e0e0'),
  },
  holdModalButtonCancelText: {
    color: colors.text?.primary || (isDark ? '#FFFFFF' : '#000000'),
    fontSize: 16,
    fontWeight: '600',
  },
  holdModalButtonConfirm: {
    backgroundColor: '#9C27B0',
    shadowColor: '#9C27B0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  holdModalButtonConfirmText: {
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
  eventDetails: {
    marginBottom: 20,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  eventInfoText: {
    fontSize: 14,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  messageTextConfirmation: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  warningIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 12,
  },
  cancelModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text?.primary || (isDark ? '#FFFFFF' : '#000000'),
    flex: 1,
    letterSpacing: 0.3,
  },
  cancelModalWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  cancelModalWarningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  cancelModalDisclaimer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  cancelModalDisclaimerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: '45%',
  },
  cancelModalDisclaimerText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginTop: 12,
  },
  disclaimerTextContainer: {
    flex: 1,
    gap: 10,
  },
  disclaimerItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  disclaimerBullet: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
    minWidth: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  cancelConfirmButton: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});
