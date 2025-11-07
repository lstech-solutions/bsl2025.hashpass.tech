import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  InteractionManager,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useToastHelpers } from '@/contexts/ToastContext';
import QuickAccessGrid from '@/components/explorer/QuickAccessGrid';
import LoadingScreen from '@/components/LoadingScreen';
import { NetworkingStats, StatsState, QuickAccessItem } from '@/types/networking';
import { CopilotStep, walkthroughable, useCopilot } from 'react-native-copilot';
import { useTutorialPreferences } from '@/hooks/useTutorialPreferences';

const CopilotView = walkthroughable(View);
const CopilotTouchableOpacity = walkthroughable(TouchableOpacity);

export default function NetworkingView() {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToastHelpers();
  const { start: startNetworkingTutorial, copilotEvents, handleNth } = useCopilot();
  const { shouldShowTutorial, markTutorialCompleted, isReady, networkingTutorialCompleted, updateTutorialStep } = useTutorialPreferences();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const tutorialStartedRef = useRef(false);
  const styles = getStyles(isDark, colors);

  // Reset ref when tutorial is reset (completion status changes from true to false)
  useEffect(() => {
    if (!networkingTutorialCompleted) {
      tutorialStartedRef.current = false;
    }
  }, [networkingTutorialCompleted]);

  // Auto-start tutorial for new users - only once, when everything is ready
  useEffect(() => {
    // Prevent multiple starts
    if (tutorialStartedRef.current) return;
    
    // Wait for all conditions to be met
    if (!isReady || !isLoggedIn || authLoading || !shouldShowTutorial('networking')) {
      return;
    }

    // Use InteractionManager to ensure UI is ready
    const interaction = InteractionManager.runAfterInteractions(() => {
      // Additional delay to ensure all CopilotSteps are registered
      const timer = setTimeout(() => {
        if (!tutorialStartedRef.current) {
          tutorialStartedRef.current = true;
          try {
            // Start networking tutorial at order 100 (first networking step)
            if (handleNth && typeof handleNth === 'function') {
              handleNth(100);
            } else {
              startNetworkingTutorial();
            }
          } catch (error) {
            console.error('Error starting networking tutorial:', error);
            tutorialStartedRef.current = false;
          }
        }
      }, 2000); // Increased delay for better stability
      
      return () => clearTimeout(timer);
    });

    return () => {
      interaction.cancel();
    };
  }, [isReady, isLoggedIn, authLoading, shouldShowTutorial, startNetworkingTutorial, networkingTutorialCompleted]);

  // Listen for tutorial events
  useEffect(() => {
    const handleTutorialStop = () => {
      markTutorialCompleted('networking');
    };

    const handleStepChange = (step: any) => {
      // Track step progress
      if (step && step.order) {
        updateTutorialStep('networking', step.order);
      }
    };

    copilotEvents.on('stop', handleTutorialStop);
    copilotEvents.on('stepChange', handleStepChange);

    return () => {
      copilotEvents.off('stop', handleTutorialStop);
      copilotEvents.off('stepChange', handleStepChange);
    };
  }, [copilotEvents, markTutorialCompleted, updateTutorialStep]);

  const [statsState, setStatsState] = useState<StatsState>({
    data: {
      totalRequests: 0,
      pendingRequests: 0,
      acceptedRequests: 0,
      declinedRequests: 0,
      cancelledRequests: 0,
      blockedUsers: 0,
      scheduledMeetings: 0,
    },
    loading: true,
    error: null,
    lastUpdated: null,
    retryCount: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [tipsExpanded, setTipsExpanded] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const animatedOpacity = useRef(new Animated.Value(0)).current;
  const tipSliderOpacity = useRef(new Animated.Value(1)).current;

  const networkingTips = [
    {
      icon: 'edit',
      color: '#FFC107',
      title: 'Be Specific',
      description: 'Include clear intentions in your meeting requests'
    },
    {
      icon: 'schedule',
      color: '#4CAF50',
      title: 'Follow Up',
      description: 'Send follow-up messages for pending requests'
    },
    {
      icon: 'people',
      color: '#2196F3',
      title: 'Network Smart',
      description: 'Focus on quality connections over quantity'
    },
    {
      icon: 'star',
      color: '#9C27B0',
      title: 'Be Professional',
      description: 'Always maintain a professional tone in your messages'
    },
    {
      icon: 'timeline',
      color: '#FF5722',
      title: 'Be Patient',
      description: 'Give speakers time to respond to your requests'
    }
  ];

  const quickAccessItems: QuickAccessItem[] = [
    {
      id: 'my-requests',
      title: 'My Requests',
      icon: 'mail',
      color: '#4CAF50',
      route: '/events/bsl2025/networking/my-requests',
      subtitle: 'View all your meeting requests',
    },
    {
      id: 'my-meetings',
      title: 'My Meetings',
      icon: 'event',
      color: '#3F51B5',
      route: '/events/bsl2025/networking/my-meetings',
      subtitle: 'Your accepted/created meetings',
    },
    {
      id: 'find-speakers',
      title: 'Find Speakers',
      icon: 'search',
      color: '#FF9800',
      route: '/events/bsl2025/speakers',
      subtitle: 'Browse all speakers',
    },
    {
      id: 'my-schedule',
      title: 'My Schedule',
      icon: 'event-note',
      color: '#9C27B0',
      route: '/events/bsl2025/networking/my-schedule',
      subtitle: 'View and manage your schedule',
    },
    {
      id: 'blocked-users',
      title: 'Blocked Users',
      icon: 'block',
      color: '#F44336',
      route: '/events/bsl2025/networking/blocked',
      subtitle: 'Manage blocked users',
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: 'bar-chart',
      color: '#607D8B',
      route: '/events/bsl2025/networking/analytics',
      subtitle: 'View networking statistics',
    },
  ];

  useEffect(() => {
    if (user) {
      loadNetworkingStats();
    }
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNetworkingStats();
    setRefreshing(false);
  };

  const handleRetry = () => {
    loadNetworkingStats();
  };

  // Auto-rotate tips when closed
  useEffect(() => {
    if (!tipsExpanded) {
      const interval = setInterval(rotateTip, 7000); // Rotate every 7 seconds
      return () => clearInterval(interval);
    }
  }, [tipsExpanded]);

  const loadNetworkingStats = async (retryCount = 0) => {
    if (!user) {
      console.log('No user found, skipping networking stats load');
      setStatsState(prev => ({ ...prev, loading: false, error: 'No user found' }));
      return;
    }

    const maxRetries = 3;
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s

    try {
      setStatsState(prev => ({ 
        ...prev, 
        loading: true, 
        error: null,
        retryCount 
      }));

      console.log(`🔄 Loading networking stats (attempt ${retryCount + 1}/${maxRetries + 1}) for user:`, user.id);

      // Use the RPC function for better performance and reliability
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_user_meeting_request_counts', {
          p_user_id: user.id
        });

      if (statsError) {
        console.error('❌ Stats RPC error:', statsError);
        throw new Error(`Stats API error: ${statsError.message}`);
      }

      if (!statsData) {
        throw new Error('No data returned from stats API');
      }

      console.log('📊 Stats RPC result:', statsData);

      // Check if user is a speaker and get additional speaker-specific data
      let speakerStats = {
        blockedUsers: 0,
        speakerRequests: 0
      };

      try {
        const { data: speakerData, error: speakerError } = await supabase
          .from('bsl_speakers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!speakerError && speakerData) {
          // Get speaker-specific stats
          const { data: blockedData } = await supabase
            .from('user_blocks')
            .select('id')
            .eq('speaker_id', speakerData.id);

          const { data: speakerRequestsData } = await supabase
            .from('meeting_requests')
            .select('id, status')
            .eq('speaker_id', speakerData.id);

          speakerStats = {
            blockedUsers: blockedData?.length || 0,
            speakerRequests: speakerRequestsData?.length || 0
          };

          console.log('🎤 Speaker stats:', speakerStats);
        }
      } catch (speakerError) {
        console.warn('⚠️ Could not load speaker stats:', speakerError);
        // Don't throw here, just use default values
      }

      // Calculate scheduled meetings (accepted requests)
      const scheduledMeetings = statsData.approved_requests || 0;

      const newStats: NetworkingStats = {
        totalRequests: statsData.total_requests || 0,
        pendingRequests: statsData.pending_requests || 0,
        acceptedRequests: statsData.approved_requests || 0,
        declinedRequests: statsData.declined_requests || 0,
        cancelledRequests: statsData.cancelled_requests || 0,
        blockedUsers: speakerStats.blockedUsers,
        scheduledMeetings: scheduledMeetings,
      };

      console.log('✅ Networking stats loaded successfully:', newStats);

      setStatsState({
        data: newStats,
        loading: false,
        error: null,
        lastUpdated: new Date(),
        retryCount: 0
      });

    } catch (error) {
      console.error(`❌ Error loading networking stats (attempt ${retryCount + 1}):`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying in ${retryDelay}ms...`);
        setTimeout(() => {
          loadNetworkingStats(retryCount + 1);
        }, retryDelay);
      } else {
        console.error('❌ Max retries reached, showing error state');
        setStatsState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
          retryCount: 0
        }));
        
        showError('Failed to Load Stats', `Unable to load networking statistics after ${maxRetries + 1} attempts. ${errorMessage}`);
      }
    }
  };

  const rotateTip = () => {
    if (!tipsExpanded) {
      Animated.sequence([
        Animated.timing(tipSliderOpacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(tipSliderOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
      
      setCurrentTipIndex((prevIndex) => 
        (prevIndex + 1) % networkingTips.length
      );
    }
  };

  const toggleTipsDropdown = () => {
    const toValue = tipsExpanded ? 0 : 1;
    
    Animated.parallel([
      Animated.timing(animatedHeight, {
        toValue: toValue,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(animatedOpacity, {
        toValue: toValue,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    setTipsExpanded(!tipsExpanded);
  };

  const handleQuickAccess = (item: QuickAccessItem) => {
    // Check if user is trying to access speaker dashboard
    if (item.id === 'speaker-dashboard' && user?.email !== 'ecalderon@unal.edu.co') {
      showError('Access Denied', 'Only speakers can access the speaker dashboard');
      return;
    }

    router.push(item.route as any);
  };



  const renderStatsCard = (title: string, value: number, icon: string, color: string) => (
    <View style={styles.statsCard}>
      <View style={[styles.statsIcon, { backgroundColor: color }]}>
        <MaterialIcons name={icon as any} size={24} color="white" />
      </View>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
    </View>
  );

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Networking',
        }} 
      />
      {statsState.loading ? (
        <LoadingScreen
          icon="network-check"
          message="Loading networking stats..."
          retryCount={statsState.retryCount}
          fullScreen={true}
        />
      ) : statsState.error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#F44336" />
          <Text style={styles.errorTitle}>Failed to Load Stats</Text>
          <Text style={styles.errorMessage}>{statsState.error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <MaterialIcons name="refresh" size={20} color="white" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          {statsState.lastUpdated && (
            <Text style={styles.lastUpdatedText}>
              Last updated: {statsState.lastUpdated.toLocaleTimeString()}
            </Text>
          )}
        </View>
      ) : (
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <MaterialIcons name="people-alt" size={32} color={colors.primary} />
          <Text style={styles.headerTitle}>Networking Center</Text>
          <Text style={styles.headerSubtitle}>Connect with speakers and attendees</Text>
        </View>

      {/* Statistics Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Networking Stats</Text>
        <View style={styles.statsGrid}>
          {renderStatsCard('Total Requests', statsState.data.totalRequests, 'send', '#4CAF50')}
          {renderStatsCard('Pending', statsState.data.pendingRequests, 'schedule', '#FF9800')}
          {renderStatsCard('Accepted', statsState.data.acceptedRequests, 'check-circle', '#4CAF50')}
          {renderStatsCard('Declined', statsState.data.declinedRequests, 'cancel', '#F44336')}
          {renderStatsCard('Cancelled', statsState.data.cancelledRequests, 'close', '#9E9E9E')}
          {renderStatsCard('Scheduled', statsState.data.scheduledMeetings, 'event', '#2196F3')}
          {renderStatsCard('Blocked', statsState.data.blockedUsers, 'block', '#F44336')}
        </View>
      </View>

      {/* Quick Access Section */}
      <CopilotStep text="Welcome to the Networking Center! Use the Quick Access cards below to navigate. 'Find Speakers' lets you browse and request meetings. 'My Requests' shows your meeting requests. 'My Schedule' helps you manage your calendar." order={100} name="networkingQuickAccess">
        <CopilotView>
          <QuickAccessGrid
            items={quickAccessItems.map(item => ({
              id: item.id,
              title: item.title,
              subtitle: item.subtitle,
              icon: item.icon,
              color: item.color,
              route: item.route
            }))}
            title="Quick Access"
            showScrollArrows={true}
            cardWidth={160}
            cardSpacing={12}
            onItemPress={handleQuickAccess}
          />
        </CopilotView>
      </CopilotStep>

      {/* Recent Activity Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityCard}>
          <MaterialIcons name="history" size={24} color={colors.primary} />
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>Your Networking Journey</Text>
            <Text style={styles.activityDescription}>
              You've sent {statsState.data.totalRequests} meeting requests and have {statsState.data.pendingRequests} pending responses.
            </Text>
          </View>
        </View>
      </View>

      {/* Tips Section */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.tipsHeader} 
          onPress={toggleTipsDropdown}
          activeOpacity={0.7}
        >
          <View style={styles.tipsHeaderContent}>
            <MaterialIcons 
              name="lightbulb" 
              size={24} 
              color="#FFC107"
              style={styles.headerIcon}
            />
            <View style={styles.tipsHeaderText}>
              <Text style={styles.tipsSectionTitle}>Networking Tips</Text>
              <Animated.View 
                style={[
                  styles.tipTextRow,
                  { opacity: tipSliderOpacity }
                ]}
              >
                <MaterialIcons 
                  name={networkingTips[currentTipIndex]?.icon as any} 
                  size={14} 
                  color={networkingTips[currentTipIndex]?.color}
                  style={styles.tipTextIcon}
                />
                <Text style={styles.tipsSummary}>
                  {tipsExpanded 
                    ? '5 helpful tips for better networking' 
                    : `${networkingTips[currentTipIndex]?.title}: ${networkingTips[currentTipIndex]?.description}`
                  }
                </Text>
              </Animated.View>
            </View>
          </View>
          <MaterialIcons 
            name={tipsExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
            size={24} 
            color={colors.text?.secondary || (isDark ? '#cccccc' : '#666666')} 
          />
        </TouchableOpacity>
        
        <Animated.View 
          style={[
            styles.tipsDropdown,
            {
              height: animatedHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 300], // Adjust based on content height
              }),
              opacity: animatedOpacity,
            }
          ]}
        >
          <View style={styles.tipsList}>
            {networkingTips.map((tip, index) => (
              <View 
                key={tip.title} 
                style={[
                  styles.tipItem, 
                  index === networkingTips.length - 1 && styles.lastTipItem
                ]}
              >
                <MaterialIcons 
                  name={tip.icon as any} 
                  size={20} 
                  color={tip.color} 
                  style={styles.tipIcon} 
                />
                <View style={styles.tipContent}>
                  <Text style={styles.tipTitle}>{tip.title}</Text>
                  <Text style={styles.tipDescription}>{tip.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>
      </ScrollView>
      )}
    </>
  );
}

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background?.default || (isDark ? '#121212' : '#ffffff'),
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider || (isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)'),
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.text?.secondary || (isDark ? '#F0F0F0' : '#666666'),
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
    marginBottom: 16,
  },
  tipsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
    marginBottom: 4,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background?.paper || (isDark ? '#1E1E1E' : '#F5F5F7'),
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    shadowColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipsHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    alignSelf: 'center',
  },
  tipsHeaderText: {
    marginLeft: 12,
    flex: 1,
    justifyContent: 'center',
  },
  tipTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  tipTextIcon: {
    marginRight: 6,
  },
  tipsSummary: {
    fontSize: 14,
    color: colors.text?.secondary || (isDark ? '#F0F0F0' : '#666666'),
    fontStyle: 'italic',
    flex: 1,
  },
  tipsDropdown: {
    overflow: 'hidden',
  },
  tipsList: {
    paddingVertical: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsCard: {
    width: '30%',
    backgroundColor: colors.background?.paper || (isDark ? '#1E1E1E' : '#F5F5F7'),
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
    marginBottom: 4,
  },
  statsTitle: {
    fontSize: 12,
    color: colors.text?.secondary || (isDark ? '#F0F0F0' : '#666666'),
    textAlign: 'center',
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: colors.background?.paper || (isDark ? '#1E1E1E' : '#F5F5F7'),
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    shadowColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: colors.text?.secondary || (isDark ? '#F0F0F0' : '#666666'),
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
  },
  lastTipItem: {
    borderBottomWidth: 0,
  },
  tipIcon: {
    marginRight: 12,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 14,
    color: colors.text?.secondary || (isDark ? '#F0F0F0' : '#666666'),
    lineHeight: 20,
  },
  // Error state styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background?.default || (isDark ? '#000000' : '#ffffff'),
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.text?.secondary || (isDark ? '#F0F0F0' : '#666666'),
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary || '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: colors.text?.secondary || (isDark ? '#F0F0F0' : '#666666'),
    fontStyle: 'italic',
  },
  retryText: {
    fontSize: 14,
    color: colors.text?.secondary || (isDark ? '#F0F0F0' : '#666666'),
    marginTop: 8,
    textAlign: 'center',
  },
});
