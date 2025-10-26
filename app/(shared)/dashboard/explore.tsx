import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Image, Dimensions, TouchableOpacity, Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { useScroll } from '../../../contexts/ScrollContext';
import { useEvent } from '../../../contexts/EventContext';
import { useTheme } from '../../../hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import EventBanner from '../../../components/EventBanner';
import PassesDisplay from '../../../components/PassesDisplay';
import { 
  getAvailableEvents, 
  getCurrentEvent, 
  shouldShowEventSelector,
  getEventQuickAccessItems,
  type EventInfo 
} from '../../../lib/event-detector';

// Type definitions
interface Ticket {
  id: string;
  title: string;
  date: string;
  access: string;
  type: string;
  image: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  image: string;
}

interface AgendaItem {
  id: string;
  time: string;
  title: string;
  description?: string;
  speakers?: string[];
  type: 'keynote' | 'panel' | 'break' | 'meal' | 'registration';
  location?: string;
}

interface Pass {
  id: string;
  user_id: string;
  event_id: string;
  pass_type: 'general' | 'vip' | 'business';
  status: 'active' | 'used' | 'expired' | 'cancelled';
  purchase_date: string;
  price_usd: number;
  access_features: string[];
  special_perks: string[];
  created_at: string;
  updated_at: string;
}


export default function ExploreScreen() {
  const { scrollY } = useScroll();
  const { event: currentEventFromContext } = useEvent();
  const { isDark, colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const styles = getStyles(isDark, colors);
  
  // Get current event from route or context
  const currentEvent = getCurrentEvent(params.eventId as string) || currentEventFromContext;
  const availableEvents = getAvailableEvents();
  
  const [selectedEvent, setSelectedEvent] = useState(currentEvent);
  
  // Handle case when no event is selected
  if (!selectedEvent) {
    return (
      <View style={styles.container}>
        <Text>No event selected</Text>
      </View>
    );
  }
  const [showEventSelector, setShowEventSelector] = useState(shouldShowEventSelector());
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const quickAccessScrollRef = useRef<ScrollView>(null);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  const handleQuickAccessScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollX = contentOffset.x;
    const maxScrollX = contentSize.width - layoutMeasurement.width;
    
    setShowLeftArrow(scrollX > 0);
    setShowRightArrow(scrollX < maxScrollX - 10);
  };

  const scrollQuickAccess = (direction: 'left' | 'right') => {
    if (quickAccessScrollRef.current) {
      const scrollAmount = 200;
      // Use a more reliable method to get current scroll position
      quickAccessScrollRef.current.scrollTo({ 
        x: direction === 'left' ? -scrollAmount : scrollAmount, 
        animated: true 
      });
    }
  };



  const handleEventSelect = (eventData: EventInfo) => {
    setSelectedEvent(eventData);
    // Navigate to the event's home page
    router.push(`/events/${eventData.id}/home` as any);
  };

  const renderEventCard = (eventData: EventInfo, index: number) => (
    <TouchableOpacity
      key={eventData.id}
      style={[
        styles.eventCard,
        { 
          marginLeft: index === 0 ? 0 : 12,
          borderColor: selectedEvent?.id === eventData.id ? eventData.color : colors.divider,
          borderWidth: selectedEvent.id === eventData.id ? 2 : 1,
        }
      ]}
      onPress={() => handleEventSelect(eventData)}
    >
      <Image source={{ uri: eventData.image }} style={styles.eventImage} />
      <View style={styles.eventOverlay}>
        <View style={[styles.eventBadge, { backgroundColor: eventData.color }]}>
          <Text style={styles.eventBadgeText}>{eventData.id.toUpperCase()}</Text>
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{eventData.title}</Text>
          <Text style={styles.eventSubtitle}>{eventData.subtitle}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderQuickAccessItem = (item: any, index: number) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.quickAccessCard,
        { marginLeft: index === 0 ? 0 : 12 }
      ]}
      onPress={() => router.push(item.route as any)}
    >
      <View style={[styles.cardIcon, { backgroundColor: item.color }]}>
        <MaterialIcons name={item.icon as any} size={24} color="white" />
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
    </TouchableOpacity>
  );

  // Get quick access items based on selected event
  const getQuickAccessItems = () => {
    return getEventQuickAccessItems(selectedEvent.id);
  };

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Event Banner (now scrolls with content) */}
        <EventBanner 
          title={(event as any)?.title || (selectedEvent as any)?.title || 'Blockchain Summit Latam 2025'}
          subtitle={(event as any)?.subtitle || (selectedEvent as any)?.subtitle || 'November 12-14, 2025 • Universidad EAFIT, Medellín'}
          date={(event as any)?.date || "November 12-14, 2025"}
          showCountdown={true}
          showLiveIndicator={true}
          eventStartDate="2025-11-12T09:00:00Z"
        />
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
 
            
            {/* Event Selector - Only show if multiple events available */}
            {showEventSelector && (
              <View style={styles.eventSelectorContainer}>
                <Text style={styles.eventSelectorTitle}>Select Event</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.eventSelector}
                >
                  {availableEvents.map((eventData, index) => renderEventCard(eventData, index))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {/* User Passes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Pass</Text>
          <PassesDisplay 
            mode="dashboard"
            showTitle={false}
            showPassComparison={false}
          />
        </View>

        {/* Quick Access Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickAccessContainer}>
            {showLeftArrow && (
              <TouchableOpacity 
                style={styles.scrollArrowLeft} 
                onPress={() => scrollQuickAccess('left')}
              >
                <MaterialIcons name="chevron-left" size={24} color={colors.primary} />
              </TouchableOpacity>
            )}
            <ScrollView
              ref={quickAccessScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
              onScroll={handleQuickAccessScroll}
              scrollEventThrottle={16}
            >
              {getQuickAccessItems().map((item, index) => renderQuickAccessItem(item, index))}
            </ScrollView>
            {showRightArrow && (
              <TouchableOpacity 
                style={styles.scrollArrowRight} 
                onPress={() => scrollQuickAccess('right')}
              >
                <MaterialIcons name="chevron-right" size={24} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>


        {/* Bottom Spacing handled via contentContainerStyle paddingBottom */}
      </Animated.ScrollView>
    </View>
  );
}

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerContent: {
    gap: 20,
  },
  eventSelectorContainer: {
    marginTop: 10,
  },
  eventSelectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  eventSelector: {
    paddingRight: 20,
  },
  eventCard: {
    width: 200,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.background.paper,
  },
  eventImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  eventOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-between',
    padding: 12,
  },
  eventBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  eventInfo: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  eventTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventSubtitle: {
    color: 'white',
    fontSize: 11,
    opacity: 0.9,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  horizontalScroll: {
    paddingRight: 20,
  },
  quickAccessContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollArrowLeft: {
    position: 'absolute',
    left: -10,
    zIndex: 1,
    backgroundColor: colors.background.paper,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollArrowRight: {
    position: 'absolute',
    right: -10,
    zIndex: 1,
    backgroundColor: colors.background.paper,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickAccessCard: {
    width: 140,
    backgroundColor: colors.background.paper,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 11,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  bottomSpacing: {
    height: 40,
  },
});