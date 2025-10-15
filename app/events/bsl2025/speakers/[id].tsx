import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../../hooks/useTheme';
import { useEvent } from '../../../../contexts/EventContext';
import { useAuth } from '../../../../hooks/useAuth';
import { MaterialIcons } from '@expo/vector-icons';
import { matchmakingService, CreateMeetingRequestData } from '../../../../lib/matchmaking';
import { cryptoBoostService, BoostCalculation } from '../../../../lib/crypto-boost';
import { useToastHelpers } from '../../../../contexts/ToastContext';
import { supabase } from '../../../../lib/supabase';
import SpeakerAvatar from '../../../../components/SpeakerAvatar';

interface Speaker {
  id: string;
  name: string;
  title: string;
  company: string;
  bio?: string;
  image?: string;
  linkedin?: string;
  twitter?: string;
  tags?: string[];
  availability?: any;
  social?: {
    linkedin?: string;
    twitter?: string;
  };
}

interface UserTicket {
  type: 'general' | 'business' | 'vip';
  name: string;
  description: string;
  price: string;
  features: string[];
}

export default function SpeakerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark, colors } = useTheme();
  const { event } = useEvent();
  const { user } = useAuth();
  const router = useRouter();
  const { showSuccess, showError, showWarning, showInfo } = useToastHelpers();
  
  const styles = getStyles(isDark, colors);

  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [userTicket, setUserTicket] = useState<UserTicket | null>(null);
  const [isRequestingMeeting, setIsRequestingMeeting] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  
  // Debug modal state changes
  useEffect(() => {
    console.log('🔍 Modal state changed:', showMeetingModal);
  }, [showMeetingModal]);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [meetingMessage, setMeetingMessage] = useState('');
  const [selectedIntentions, setSelectedIntentions] = useState<string[]>(['none']);
  const [boostAmount, setBoostAmount] = useState(0);
  const [boostCalculation, setBoostCalculation] = useState<BoostCalculation | null>(null);
  const [requestLimits, setRequestLimits] = useState<{
    ticketType: 'general' | 'business' | 'vip';
    totalRequests: number;
    remainingRequests: number;
    nextRequestAllowedAt?: string;
    canSendRequest: boolean;
    requestLimit: number;
  } | null>(null);
  const [showTicketComparison, setShowTicketComparison] = useState(false);

  // Mock user ticket data - in real app, this would come from user profile
  const getMockUserTicket = (ticketType: 'general' | 'business' | 'vip'): UserTicket => {
    switch (ticketType) {
      case 'general':
        return {
          type: 'general',
          name: 'General Ticket',
          description: 'Conferences only',
          price: '$99.00 USD',
          features: [
            'All conferences Nov 12-14',
            '1 meeting request with speakers',
            'Access to main event areas',
            'Official closing party'
          ]
        };
      case 'business':
        return {
          type: 'business',
          name: 'Business Ticket',
          description: 'Conferences + Networking & B2B sessions',
          price: '$249.00 USD',
          features: [
            'All conferences Nov 12-14',
            'Networking & B2B sessions',
            '3 meeting requests with speakers',
            'Access to business lounge',
            'Official closing party'
          ]
        };
      case 'vip':
        return {
          type: 'vip',
          name: 'VIP Ticket',
          description: 'All access + VIP networking with speakers',
          price: 'Premium',
          features: [
            'All conferences Nov 12-14',
            'Networking & B2B sessions',
            'VIP networking with speakers',
            'Unlimited meeting requests',
            'VIP lounge access',
            'Priority seating',
            'Official closing party'
          ]
        };
    }
  };

  const mockUserTicket = getMockUserTicket('general'); // Change this to test different access levels: 'general', 'business', 'vip'

  const loadSpeaker = async () => {
    try {
      // First try to fetch from the database with timeout
      console.log('🔍 Attempting to load speaker from database...');
      
      const dbPromise = supabase
        .from('bsl_speakers')
        .select('*')
        .eq('id', id)
        .single();

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 5000)
      );

      try {
        const { data: dbSpeaker, error: dbError } = await Promise.race([dbPromise, timeoutPromise]) as any;

        if (dbSpeaker && !dbError) {
          // Use real data from database
          setSpeaker({
            id: dbSpeaker.id,
            name: dbSpeaker.name,
            title: dbSpeaker.title,
            company: dbSpeaker.company || '',
            bio: dbSpeaker.bio || `Experienced professional in ${dbSpeaker.title}.`,
            image: dbSpeaker.imageurl || `https://blockchainsummit.la/wp-content/uploads/2025/09/foto-${dbSpeaker.name.toLowerCase().replace(/\s+/g, '-')}.png`,
            linkedin: dbSpeaker.linkedin || `https://linkedin.com/in/${dbSpeaker.name.toLowerCase().replace(/\s+/g, '-')}`,
            twitter: dbSpeaker.twitter || `https://twitter.com/${dbSpeaker.name.toLowerCase().replace(/\s+/g, '-')}`,
            tags: dbSpeaker.tags || ['Blockchain', 'FinTech', 'Innovation'],
            availability: dbSpeaker.availability || {
              monday: { start: '09:00', end: '17:00' },
              tuesday: { start: '09:00', end: '17:00' },
              wednesday: { start: '09:00', end: '17:00' },
              thursday: { start: '09:00', end: '17:00' },
              friday: { start: '09:00', end: '17:00' }
            }
          });
          console.log('✅ Loaded speaker from database:', dbSpeaker.name);
          return;
        }
      } catch (dbError) {
        console.log('⚠️ Database unavailable or timeout, falling back to event config...', dbError instanceof Error ? dbError.message : String(dbError));
      }

      // Fallback to event config (JSON) - always available
      console.log('📋 Loading speaker from event config (JSON fallback)...');
      const foundSpeaker = event.speakers?.find(s => s.id === id);
      
      if (foundSpeaker) {
        setSpeaker({
          id: foundSpeaker.id,
          name: foundSpeaker.name,
          title: foundSpeaker.title,
          company: foundSpeaker.company,
          bio: `Experienced professional in ${foundSpeaker.title} at ${foundSpeaker.company}.`,
          image: `https://blockchainsummit.la/wp-content/uploads/2025/09/foto-${foundSpeaker.name.toLowerCase().replace(/\s+/g, '-')}.png`,
          linkedin: `https://linkedin.com/in/${foundSpeaker.name.toLowerCase().replace(/\s+/g, '-')}`,
          twitter: `https://twitter.com/${foundSpeaker.name.toLowerCase().replace(/\s+/g, '-')}`,
          tags: ['Blockchain', 'FinTech', 'Innovation'],
          availability: {
            monday: { start: '09:00', end: '17:00' },
            tuesday: { start: '09:00', end: '17:00' },
            wednesday: { start: '09:00', end: '17:00' },
            thursday: { start: '09:00', end: '17:00' },
            friday: { start: '09:00', end: '17:00' }
          }
        });
        console.log('✅ Loaded speaker from event config (JSON fallback):', foundSpeaker.name);
      } else {
        console.error('❌ Speaker not found in database or event config:', id);
        showError('Speaker Not Found', 'The requested speaker could not be found.');
      }
    } catch (error) {
      console.error('❌ Error loading speaker:', error);
      // Even if there's an error, try the JSON fallback
      console.log('🔄 Attempting JSON fallback after error...');
      const foundSpeaker = event.speakers?.find(s => s.id === id);
      if (foundSpeaker) {
        setSpeaker({
          id: foundSpeaker.id,
          name: foundSpeaker.name,
          title: foundSpeaker.title,
          company: foundSpeaker.company,
          bio: `Experienced professional in ${foundSpeaker.title} at ${foundSpeaker.company}.`,
          image: `https://blockchainsummit.la/wp-content/uploads/2025/09/foto-${foundSpeaker.name.toLowerCase().replace(/\s+/g, '-')}.png`,
          linkedin: `https://linkedin.com/in/${foundSpeaker.name.toLowerCase().replace(/\s+/g, '-')}`,
          twitter: `https://twitter.com/${foundSpeaker.name.toLowerCase().replace(/\s+/g, '-')}`,
          tags: ['Blockchain', 'FinTech', 'Innovation'],
          availability: {
            monday: { start: '09:00', end: '17:00' },
            tuesday: { start: '09:00', end: '17:00' },
            wednesday: { start: '09:00', end: '17:00' },
            thursday: { start: '09:00', end: '17:00' },
            friday: { start: '09:00', end: '17:00' }
          }
        });
        console.log('✅ Emergency fallback successful:', foundSpeaker.name);
      } else {
        showError('Error', 'Failed to load speaker information from all sources.');
      }
    }
  };

  useEffect(() => {
    if (!id) return;
    
    loadSpeaker();
    
    // Set user ticket (in real app, fetch from user profile)
    setUserTicket(mockUserTicket);
    
    // Load user request limits
    loadRequestLimits();
  }, [id, event.speakers]);

  const loadRequestLimits = async () => {
    if (!user) return;
    
    try {
      const limits = await matchmakingService.getRequestLimitsSummary(user.id);
      setRequestLimits(limits);
    } catch (error) {
      console.error('Error loading request limits:', error);
      // Set default limits to allow meeting requests even if database is unavailable
      setRequestLimits({
        ticketType: userTicket?.type || 'general',
        totalRequests: 0,
        remainingRequests: userTicket?.type === 'general' ? 1 : userTicket?.type === 'business' ? 3 : 999,
        canSendRequest: true,
        requestLimit: userTicket?.type === 'general' ? 1 : userTicket?.type === 'business' ? 3 : 999
      });
    }
  };

  // Check meeting availability when speaker or ticket changes

  const getTicketAccessLevel = (ticketType: string) => {
    switch (ticketType) {
      case 'general':
        return {
          level: 1,
          name: 'General Access',
          canRequestMeeting: true, // Updated: General can now send 1 request
          canVideoChat: false,
          canAccessVIP: false,
          description: 'Conferences only + 1 meeting request during event'
        };
      case 'business':
        return {
          level: 2,
          name: 'Business Access',
          canRequestMeeting: true,
          canVideoChat: true,
          canAccessVIP: false,
          description: 'Conferences + Networking & B2B sessions + 3 meeting requests'
        };
      case 'vip':
        return {
          level: 3,
          name: 'VIP Access',
          canRequestMeeting: true,
          canVideoChat: true,
          canAccessVIP: true,
          description: 'All access + VIP networking with speakers + unlimited meeting requests'
        };
      default:
        return {
          level: 0,
          name: 'No Access',
          canRequestMeeting: false,
          canVideoChat: false,
          canAccessVIP: false,
          description: 'No access to matchmaking features'
        };
    }
  };

  const handleRequestMeeting = async () => {
    console.log('🔵 handleRequestMeeting called');
    console.log('User:', user?.id);
    console.log('UserTicket:', userTicket);
    console.log('Speaker:', speaker?.id);
    console.log('Access:', access);
    console.log('RequestLimits:', requestLimits);
    
    if (!user) {
      console.log('❌ No user found');
      showWarning('Login Required', 'Please log in to request a meeting');
      return;
    }

    if (!userTicket || !speaker) {
      console.log('❌ Missing userTicket or speaker');
      showError('Missing Information', 'Missing required information');
      return;
    }

    if (!access.canRequestMeeting) {
      console.log('❌ Cannot request meeting - access denied');
      showWarning('Cannot Request Meeting', 'Meeting requests not available for your ticket type');
      return;
    }

    // Show the meeting request modal directly
    console.log('🟡 Showing meeting request modal...');
    setShowMeetingModal(true);
    console.log('🟢 Modal should now be visible');
  };

  const submitMeetingRequestDirectly = async () => {
    console.log('🔵 submitMeetingRequestDirectly called');
    
    if (!user || !speaker || !userTicket) {
      console.log('❌ Missing required data:', { user: !!user, speaker: !!speaker, userTicket: !!userTicket });
      return;
    }

    console.log('🔵 User data:', { id: user.id, email: user.email });
    console.log('🔵 Speaker data:', { id: speaker.id, name: speaker.name });
    console.log('🔵 User ticket:', userTicket);

    setIsRequestingMeeting(true);

    try {
      const requestData: CreateMeetingRequestData = {
        requester_id: user.id,
        speaker_id: speaker.id,
        speaker_name: speaker.name,
        requester_name: user.email || 'Anonymous',
        requester_company: 'Your Company',
        requester_title: 'Your Title',
        requester_ticket_type: userTicket.type,
        meeting_type: 'networking',
        message: '', // No message
        note: '', // No note
        boost_amount: 0 // No boost
      };

      console.log('🔵 Request data to send:', requestData);
      
      // Test if we can create a simple meeting request
      try {
        await matchmakingService.createMeetingRequest(requestData);
        console.log('✅ Meeting request created successfully');
      } catch (error) {
        console.error('❌ Error creating meeting request:', error);
        
        // If database is not available, show a mock success message
        if (error instanceof Error && (error.message.includes('Database table not found') || 
            error.message.includes('Could not find the table') ||
            error.message.includes('406 Not Acceptable'))) {
          console.log('🟡 Database not available, showing mock success');
          showInfo(
            'Request Sent! (Demo Mode)', 
            'Your meeting request has been sent to the speaker. This is a demo - the database is not available.'
          );
          return;
        }
        
        throw error;
      }
      
      showSuccess(
        'Request Sent! 🎉',
        'Your meeting request has been sent to the speaker. They will review it and respond soon.'
      );

      // Reload request limits to update the UI
      await loadRequestLimits();
      
    } catch (error) {
      console.error('Error sending meeting request:', error);
      
      // Show specific error messages based on the error type
      if (error instanceof Error) {
        if (error.message.includes('Invalid data format') || error.message.includes('Invalid speaker or user ID format')) {
          showError('Data Format Error', error.message);
        } else if (error.message.includes('Invalid request data')) {
          showError('Invalid Request', error.message);
        } else if (error.message.includes('Database table not found')) {
          showError('Database Error', error.message);
        } else if (error.message.includes('not authorized')) {
          showError('Authorization Error', error.message);
        } else if (error.message.includes('already exists')) {
          showError('Duplicate Request', error.message);
        } else if (error.message.includes('Speaker not found in database')) {
          showError('Speaker Not Found', error.message);
        } else {
          showError('Request Failed', error.message);
        }
      } else {
        showError('Request Failed', 'Failed to send meeting request. Please try again.');
      }
    } finally {
      setIsRequestingMeeting(false);
    }
  };

  const getIntentionText = (intentionId: string): string => {
    const intentions = {
      'coffee': '☕ Just to grab a coffee and chat',
      'pitch': '💡 I want to pitch you my startup idea',
      'consultation': '🔍 Quick 5-minute consultation',
      'networking': '🤝 General networking and connection',
      'collaboration': '🚀 Explore potential collaboration',
      'advice': '💭 Seek advice on my career/project',
      'fun': '😄 Just for fun and interesting conversation',
      'learning': '📚 Learn from your experience',
      'none': '⚪ No specific intention'
    };
    return intentions[intentionId as keyof typeof intentions] || '';
  };

  const getSelectedIntentionsText = (): string => {
    if (selectedIntentions.length === 0) return '';
    if (selectedIntentions.includes('none')) return '⚪ No specific intention';
    
    return selectedIntentions.map(id => getIntentionText(id)).join('; ');
  };

  const submitMeetingRequest = async () => {
    if (!user || !speaker || !userTicket) return;

    setIsRequestingMeeting(true);

    try {
      const meetingData: CreateMeetingRequestData = {
        requester_id: user.id,
        speaker_id: speaker.id,
        speaker_name: speaker.name,
        requester_name: user.email || 'Anonymous',
        requester_company: 'Your Company', // Would come from user profile
        requester_title: 'Your Title', // Would come from user profile
        requester_ticket_type: userTicket.type,
        meeting_type: 'networking',
        message: meetingMessage || '', // Allow empty message
        note: getSelectedIntentionsText(),
        boost_amount: boostAmount,
      };

      const meetingRequest = await matchmakingService.createMeetingRequest(meetingData);
      
      setShowMeetingModal(false);
      setMeetingMessage('');
      setSelectedIntentions([]);
      setBoostAmount(0);
      
      // Refresh request limits after sending
      await loadRequestLimits();
      
      // Check if this is a demo response
      if (meetingRequest && meetingRequest.id && meetingRequest.id.startsWith('demo-')) {
        showSuccess(
          'Demo Request Sent! 🎉', 
          `Your demo request has been sent to ${speaker.name}. This is a demonstration - the speaker is not in the database.`
        );
      } else {
        showSuccess(
          'Meeting Request Sent! 🎉', 
          `Your request has been sent to ${speaker.name}. You will be notified when they respond.`
        );
      }
    } catch (error) {
      console.error('Error creating meeting request:', error);
      
      // Show specific error messages based on the error type
      if (error instanceof Error) {
        if (error.message.includes('Invalid data format') || error.message.includes('Invalid speaker or user ID format')) {
          showError('Data Format Error', error.message);
        } else if (error.message.includes('Invalid request data')) {
          showError('Invalid Request', error.message);
        } else if (error.message.includes('Database table not found')) {
          showError('Database Error', error.message);
        } else if (error.message.includes('not authorized')) {
          showError('Authorization Error', error.message);
        } else if (error.message.includes('already exists')) {
          showError('Duplicate Request', error.message);
        } else if (error.message.includes('Speaker not found in database')) {
          showError('Speaker Not Found', error.message);
        } else {
          showError('Request Failed', error.message);
        }
      } else {
        showError('Request Failed', 'Failed to send meeting request. Please try again.');
      }
    } finally {
      setIsRequestingMeeting(false);
    }
  };

  const handleBoostAmountChange = (amount: number) => {
    setBoostAmount(amount);
    
    if (amount > 0 && userTicket) {
      const calculation = cryptoBoostService.calculateBoost(
        50, // Base priority
        amount,
        userTicket.type
      );
      setBoostCalculation(calculation);
    } else {
      setBoostCalculation(null);
    }
  };

  const handleBoostPayment = async () => {
    if (!user || !speaker) return;

    try {
      const boostTransaction = await cryptoBoostService.generateBoostTransaction(
        boostAmount,
        'USER_WALLET_ADDRESS', // Would come from user's connected wallet
        'meeting_request_id' // Would be the actual meeting request ID
      );

      Alert.alert(
        'Boost Payment Instructions',
        boostTransaction.instructions,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'I\'ve Sent Payment', 
            onPress: () => {
              // In real app, user would paste transaction hash
              Alert.prompt(
                'Transaction Hash',
                'Please enter your transaction hash:',
                (hash) => {
                  if (hash) {
                    verifyBoostTransaction(hash);
                  }
                }
              );
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error generating boost transaction:', error);
      Alert.alert('Error', 'Failed to generate boost transaction');
    }
  };

  const verifyBoostTransaction = async (transactionHash: string) => {
    try {
      const result = await cryptoBoostService.verifyTransaction(transactionHash);
      
      if (result.isValid) {
        Alert.alert('Boost Confirmed!', 'Your boost payment has been verified and applied.');
        setShowBoostModal(false);
      } else {
        Alert.alert('Verification Failed', result.error || 'Transaction could not be verified');
      }
    } catch (error) {
      console.error('Error verifying transaction:', error);
      Alert.alert('Error', 'Failed to verify transaction');
    }
  };


  const handleLinkedIn = () => {
    if (speaker?.social?.linkedin) {
      // In a real app, you'd open the LinkedIn URL
      Alert.alert('LinkedIn', `Opening ${speaker.name}'s LinkedIn profile...`);
    }
  };

  if (!speaker) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading speaker details...</Text>
      </View>
    );
  }

  const access = getTicketAccessLevel(userTicket?.type || '');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Speaker Header Card */}
      <View style={styles.speakerCard}>
        <View style={styles.avatarContainer}>
          <SpeakerAvatar
            imageUrl={speaker.image}
            name={speaker.name}
            size={80}
            showBorder={true}
          />
        </View>
        
        <View style={styles.speakerInfo}>
          <Text style={styles.speakerName}>{speaker.name}</Text>
          <Text style={styles.speakerTitle}>{speaker.title}</Text>
          <Text style={styles.speakerCompany}>{speaker.company}</Text>
        </View>
      </View>

      {/* Bio Section */}
      {speaker.bio && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bioText}>{speaker.bio}</Text>
        </View>
      )}

      {/* Social Links */}
      {speaker.social && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connect</Text>
          <View style={styles.socialLinks}>
            {speaker.social.linkedin && (
              <TouchableOpacity style={styles.socialButton} onPress={handleLinkedIn}>
                <MaterialIcons name="link" size={24} color="#0077B5" />
                <Text style={styles.socialButtonText}>LinkedIn</Text>
              </TouchableOpacity>
            )}
            {speaker.social.twitter && (
              <TouchableOpacity style={styles.socialButton}>
                <MaterialIcons name="chat" size={24} color="#1DA1F2" />
                <Text style={styles.socialButtonText}>Twitter</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Matchmaking Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Matchmaking & Networking</Text>
        <Text style={styles.sectionSubtitle}>
          Con la funcionalidad de Matchmaking no pierdas oportunidades de negocios: organiza citas con expositores u otros participantes y gestiona tu calendario de reuniones one-to-one
        </Text>
        
        {/* User Current Ticket Info */}
        {userTicket && (
          <View style={styles.ticketInfo}>
            <View style={styles.ticketHeader}>
              <MaterialIcons name="confirmation-number" size={20} color="#007AFF" />
              <View style={styles.ticketHeaderInfo}>
                <Text style={styles.ticketName}>{userTicket.name}</Text>
                <Text style={styles.ticketPrice}>{userTicket.price}</Text>
              </View>
            </View>
            <Text style={styles.ticketDescription}>{userTicket.description}</Text>
            
            {/* Ticket Comparison Dropdown */}
            <TouchableOpacity 
              style={styles.ticketComparisonToggle}
              onPress={() => setShowTicketComparison(!showTicketComparison)}
            >
              <Text style={styles.ticketComparisonToggleText}>All Ticket Access Levels</Text>
              <MaterialIcons 
                name={showTicketComparison ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                size={24} 
                color="#007AFF" 
              />
            </TouchableOpacity>
            
            {/* Ticket Comparison Content */}
            {showTicketComparison && (
              <View style={styles.ticketComparisonContent}>
                <Text style={styles.comparisonSubtitle}>Compare features and choose the right ticket for your needs</Text>
                
                <View style={styles.ticketComparisonGrid}>
                  {/* General Ticket */}
                  <View style={[styles.ticketComparisonCard, userTicket?.type === 'general' && styles.activeComparisonTicket]}>
                    <View style={styles.ticketComparisonHeader}>
                      <Text style={styles.ticketComparisonTitle}>General Ticket</Text>
                      <Text style={styles.ticketComparisonPrice}>$99</Text>
                    </View>
                    <Text style={styles.ticketComparisonDescription}>Conferences only</Text>
                    <View style={styles.ticketComparisonFeatures}>
                      <View style={styles.ticketComparisonFeature}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.ticketComparisonFeatureText}>All conferences Nov 12-14</Text>
                      </View>
                      <View style={styles.ticketComparisonFeature}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.ticketComparisonFeatureText}>1 meeting request</Text>
                      </View>
                      <View style={styles.ticketComparisonFeature}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.ticketComparisonFeatureText}>Access to main event areas</Text>
                      </View>
                      <View style={styles.ticketComparisonFeature}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.ticketComparisonFeatureText}>Official closing party</Text>
                      </View>
                      <View style={styles.ticketComparisonFeature}>
                        <MaterialIcons name="cancel" size={16} color="#F44336" />
                        <Text style={[styles.ticketComparisonFeatureText, { color: '#F44336' }]}>VIP networking</Text>
                      </View>
                    </View>
                  </View>

                  {/* Business Ticket */}
                  <View style={[styles.ticketComparisonCard, userTicket?.type === 'business' && styles.activeComparisonTicket]}>
                    <View style={styles.ticketComparisonHeader}>
                      <Text style={styles.ticketComparisonTitle}>Business Ticket</Text>
                      <Text style={styles.ticketComparisonPrice}>$249</Text>
                    </View>
                    <Text style={styles.ticketComparisonDescription}>+ Networking & B2B sessions</Text>
                    <View style={styles.ticketComparisonFeatures}>
                      <View style={styles.ticketComparisonFeature}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.ticketComparisonFeatureText}>All conferences Nov 12-14</Text>
                      </View>
                      <View style={styles.ticketComparisonFeature}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.ticketComparisonFeatureText}>Networking & B2B sessions</Text>
                      </View>
                      <View style={styles.ticketComparisonFeature}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.ticketComparisonFeatureText}>3 meeting requests</Text>
                      </View>
                      <View style={styles.ticketComparisonFeature}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.ticketComparisonFeatureText}>Access to business lounge</Text>
                      </View>
                      <View style={styles.ticketComparisonFeature}>
                        <MaterialIcons name="cancel" size={16} color="#F44336" />
                        <Text style={[styles.ticketComparisonFeatureText, { color: '#F44336' }]}>VIP networking</Text>
                      </View>
                    </View>
                  </View>

                  {/* VIP Ticket */}
                  <View style={[styles.ticketComparisonCard, userTicket?.type === 'vip' && styles.activeComparisonTicket]}>
                    <View style={styles.ticketComparisonHeader}>
                      <Text style={styles.ticketComparisonTitle}>VIP Ticket</Text>
                      <Text style={styles.ticketComparisonPrice}>Premium</Text>
                    </View>
                    <Text style={styles.ticketComparisonDescription}>+ VIP networking with speakers</Text>
                    <View style={styles.ticketComparisonFeatures}>
                      <View style={styles.ticketComparisonFeature}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.ticketComparisonFeatureText}>All conferences Nov 12-14</Text>
                      </View>
                      <View style={styles.ticketComparisonFeature}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.ticketComparisonFeatureText}>Networking & B2B sessions</Text>
                      </View>
                      <View style={styles.ticketComparisonFeature}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.ticketComparisonFeatureText}>VIP networking with speakers</Text>
                      </View>
                      <View style={styles.ticketComparisonFeature}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.ticketComparisonFeatureText}>Unlimited meeting requests</Text>
                      </View>
                      <View style={styles.ticketComparisonFeature}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.ticketComparisonFeatureText}>VIP lounge access</Text>
                      </View>
                      <View style={styles.ticketComparisonFeature}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.ticketComparisonFeatureText}>Priority seating</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Request Limits Display - Always Show */}
        <View style={styles.requestLimitsInfo}>
          <View style={styles.requestLimitsHeader}>
            <MaterialIcons name="schedule" size={20} color="#60A5FA" />
            <Text style={styles.requestLimitsTitle}>Your Request Status</Text>
          </View>
          
          <View style={styles.requestLimitsContent}>
            <View style={styles.requestLimitsRow}>
              <Text style={styles.requestLimitsLabel}>Ticket Type:</Text>
              <Text style={[styles.requestLimitsValue, { 
                color: requestLimits?.ticketType === 'vip' ? '#FFD700' : 
                       requestLimits?.ticketType === 'business' ? '#60A5FA' : '#999'
              }]}>
                {requestLimits?.ticketType?.toUpperCase() || userTicket?.type?.toUpperCase() || 'GENERAL'}
              </Text>
            </View>
            
            <View style={styles.requestLimitsRow}>
              <Text style={styles.requestLimitsLabel}>Requests Used:</Text>
              <Text style={styles.requestLimitsValue}>
                {requestLimits ? `${requestLimits.totalRequests} / ${requestLimits.requestLimit === 999999 ? '∞' : requestLimits.requestLimit}` : '0 / 1'}
              </Text>
            </View>
            
            <View style={styles.requestLimitsRow}>
              <Text style={styles.requestLimitsLabel}>Remaining:</Text>
              <Text style={[styles.requestLimitsValue, { 
                color: (requestLimits?.remainingRequests || 1) > 0 ? '#4CAF50' : '#F44336'
              }]}>
                {requestLimits ? (requestLimits.remainingRequests === 999999 ? '∞' : requestLimits.remainingRequests) : '1'}
              </Text>
            </View>
            
            {requestLimits?.nextRequestAllowedAt && (
              <View style={styles.requestLimitsRow}>
                <Text style={styles.requestLimitsLabel}>Next Request:</Text>
                <Text style={styles.requestLimitsValue}>
                  {new Date(requestLimits.nextRequestAllowedAt).toLocaleTimeString()}
                </Text>
              </View>
            )}
          </View>
          
          {requestLimits && !requestLimits.canSendRequest && (
            <View style={styles.requestLimitsWarning}>
              <MaterialIcons name="warning" size={16} color="#FF9800" />
              <Text style={styles.requestLimitsWarningText}>
                {requestLimits.remainingRequests === 0 
                  ? 'You have reached your request limit. Use $VOI boost for additional requests.'
                  : 'Please wait before sending your next request.'
                }
              </Text>
            </View>
          )}
        </View>


        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              !access.canRequestMeeting && styles.disabledButton
            ]}
            onPress={() => {
              console.log('🔴 Button pressed!');
              console.log('access.canRequestMeeting:', access.canRequestMeeting);
              console.log('isRequestingMeeting:', isRequestingMeeting);
              console.log('requestLimits:', requestLimits);
              console.log('requestLimits?.canSendRequest:', requestLimits?.canSendRequest);
              handleRequestMeeting();
            }}
            disabled={!access.canRequestMeeting || isRequestingMeeting}
          >
            <MaterialIcons 
              name="event" 
              size={20} 
              color={access.canRequestMeeting ? "#FFFFFF" : "#999"} 
            />
            <Text style={[
              styles.actionButtonText,
              !access.canRequestMeeting && styles.disabledButtonText
            ]}>
              {isRequestingMeeting ? 'Sending...' : 'Request Meeting'}
            </Text>
        </TouchableOpacity>


        </View>

        {/* Availability Status */}
        {!access.canRequestMeeting && (
          <View style={styles.availabilityWarning}>
            <MaterialIcons name="warning" size={20} color="#FF9500" />
            <Text style={styles.availabilityWarningText}>Meeting requests not available for your ticket type</Text>
          </View>
        )}

      </View>

      {/* Meeting Request Modal */}
      <Modal
        visible={showMeetingModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Request Meeting with {speaker?.name}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowMeetingModal(false)}
            >
              <MaterialIcons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>Message (Optional)</Text>
                <Text style={styles.inputHint}>💡 Including a message increases approval chances by 3x</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Tell the speaker why you'd like to meet (optional but recommended)..."
                placeholderTextColor={colors.text.secondary}
                value={meetingMessage}
                onChangeText={setMeetingMessage}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Meeting Intention (Optional)</Text>
              <Text style={styles.inputHint}>💡 Select up to 3 intentions for the meeting (or choose "No specific intention")</Text>
              
              <View style={styles.intentionChecklist}>
                {[
                  { id: 'coffee', text: 'Just to grab a coffee and chat', emoji: '☕' },
                  { id: 'pitch', text: 'I want to pitch you my startup idea', emoji: '💡' },
                  { id: 'consultation', text: 'Quick 5-minute consultation', emoji: '🔍' },
                  { id: 'networking', text: 'General networking and connection', emoji: '🤝' },
                  { id: 'collaboration', text: 'Explore potential collaboration', emoji: '🚀' },
                  { id: 'advice', text: 'Seek advice on my career/project', emoji: '💭' },
                  { id: 'fun', text: 'Just for fun and interesting conversation', emoji: '😄' },
                  { id: 'learning', text: 'Learn from your experience', emoji: '📚' },
                  { id: 'none', text: 'No specific intention', emoji: '⚪' }
                ].map((intention) => (
                  <TouchableOpacity
                    key={intention.id}
                    style={[
                      styles.intentionOption,
                      selectedIntentions.includes(intention.id) && styles.intentionOptionSelected
                    ]}
                    onPress={() => {
                      if (intention.id === 'none') {
                        // If "No Intention" is selected, clear all others
                        setSelectedIntentions(['none']);
                      } else {
                        // Remove 'none' if it was selected
                        let newSelections = selectedIntentions.filter(id => id !== 'none');
                        
                        if (newSelections.includes(intention.id)) {
                          // Remove if already selected
                          newSelections = newSelections.filter(id => id !== intention.id);
                        } else {
                          // Add if not selected and under limit
                          if (newSelections.length < 3) {
                            newSelections.push(intention.id);
                          }
                        }
                        setSelectedIntentions(newSelections);
                      }
                    }}
                  >
                    <View style={styles.intentionOptionContent}>
                      <Text style={styles.intentionEmoji}>{intention.emoji}</Text>
                      <Text style={[
                        styles.intentionText,
                        selectedIntentions.includes(intention.id) && styles.intentionTextSelected
                      ]}>
                        {intention.text}
                      </Text>
                    </View>
                    {selectedIntentions.includes(intention.id) && (
                      <MaterialIcons name="check-circle" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Boost Section */}
            <View style={styles.boostSection}>
              <View style={styles.boostHeader}>
                <MaterialIcons name="trending-up" size={20} color="#FF2D92" />
                <Text style={styles.boostTitle}>Boost Your Request</Text>
              </View>
              <Text style={styles.boostDescription}>
                Send $VOI tokens to increase your priority in the speaker's queue
              </Text>

              <View style={styles.boostAmounts}>
                {[5, 10, 25, 50].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.boostAmountButton,
                      boostAmount === amount && styles.boostAmountButtonActive
                    ]}
                    onPress={() => handleBoostAmountChange(amount)}
                  >
                    <Text style={[
                      styles.boostAmountText,
                      boostAmount === amount && styles.boostAmountTextActive
                    ]}>
                      {amount} $VOI
                    </Text>
                    <Text style={[
                      styles.boostAmountUSD,
                      boostAmount === amount && styles.boostAmountUSDActive
                    ]}>
                      ${(amount * 0.05).toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {boostCalculation && (
                <View style={styles.boostCalculation}>
                  <Text style={styles.boostCalculationTitle}>Boost Effect:</Text>
                  <Text style={styles.boostCalculationText}>
                    Priority Score: {boostCalculation.finalPriority} 
                    (Est. Position: #{boostCalculation.estimatedPosition})
                  </Text>
                  <Text style={styles.boostCalculationCost}>
                    Cost: {cryptoBoostService.formatBoostCost(boostAmount)}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowMeetingModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.submitButton,
                isRequestingMeeting && styles.disabledButton
              ]}
              onPress={submitMeetingRequest}
              disabled={isRequestingMeeting}
            >
              <Text style={styles.submitButtonText}>
                {isRequestingMeeting ? 'Sending...' : 'Send Request'}
              </Text>
            </TouchableOpacity>
      </View>
    </View>
      </Modal>
    </ScrollView>
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
  },
  speakerCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.paper,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  avatarContainer: {
    marginRight: 16,
  },
  speakerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  speakerName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  speakerTitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  speakerCompany: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  section: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  bioText: {
    fontSize: 16,
    color: colors.text.primary,
    lineHeight: 24,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.default,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  socialButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  ticketInfo: {
    backgroundColor: colors.background.default,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: 16,
  },
  requestLimitsInfo: {
    backgroundColor: colors.background.default,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: 16,
  },
  requestLimitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestLimitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 8,
  },
  requestLimitsContent: {
    gap: 8,
  },
  requestLimitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestLimitsLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  requestLimitsValue: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '600',
  },
  requestLimitsWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  requestLimitsWarningText: {
    fontSize: 12,
    color: '#FF9800',
    marginLeft: 8,
    flex: 1,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketHeaderInfo: {
    flex: 1,
    marginLeft: 8,
  },
  ticketName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  ticketPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
    marginTop: 2,
  },
  ticketDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  currentTicketNote: {
    fontSize: 12,
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  ticketComparisonToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  ticketComparisonToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  ticketComparisonContent: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  comparisonSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  ticketComparisonGrid: {
    gap: 16,
  },
  ticketComparisonCard: {
    backgroundColor: colors.background.paper,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  activeComparisonTicket: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    borderWidth: 2,
  },
  ticketComparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketComparisonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  ticketComparisonPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  ticketComparisonDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  ticketComparisonFeatures: {
    gap: 8,
  },
  ticketComparisonFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketComparisonFeatureText: {
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  disabledButton: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  disabledButtonText: {
    color: '#999',
  },
  accessInfo: {
    backgroundColor: colors.background.default,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  accessInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  accessLevels: {
    gap: 8,
  },
  accessLevelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  accessLevelName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  accessLevelDesc: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  availabilityWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  availabilityWarningText: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 8,
    flex: 1,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 8,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: colors.background.paper,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.divider,
    textAlignVertical: 'top',
  },
  textInputError: {
    borderColor: '#F44336',
    backgroundColor: 'rgba(244, 67, 54, 0.05)',
  },
  inputHint: {
    fontSize: 12,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 16,
  },
  intentionChecklist: {
    marginTop: 12,
    gap: 8,
  },
  intentionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: colors.background.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  intentionOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  intentionOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  intentionEmoji: {
    fontSize: 16,
    marginRight: 12,
  },
  intentionText: {
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
  },
  intentionTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  boostSection: {
    backgroundColor: colors.background.paper,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  boostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  boostTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 8,
  },
  boostDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  boostAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  boostAmountButton: {
    backgroundColor: colors.background.default,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    minWidth: 80,
  },
  boostAmountButtonActive: {
    backgroundColor: '#FF2D92',
    borderColor: '#FF2D92',
  },
  boostAmountText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  boostAmountTextActive: {
    color: '#FFFFFF',
  },
  boostAmountUSD: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  boostAmountUSDActive: {
    color: '#FFFFFF',
  },
  boostCalculation: {
    backgroundColor: colors.background.default,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  boostCalculationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  boostCalculationText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  boostCalculationCost: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF2D92',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background.paper,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  submitButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});


