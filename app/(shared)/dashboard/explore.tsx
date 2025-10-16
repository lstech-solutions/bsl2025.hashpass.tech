import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Image, Dimensions, TouchableOpacity, Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { useScroll } from '../../../contexts/ScrollContext';
import { useEvent } from '../../../contexts/EventContext';
import { useTheme } from '../../../hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import EventBanner from '../../../components/EventBanner';
import PassesDisplay from '../../../components/PassesDisplay';

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
  created_at: string;
  updated_at: string;
}

// Mock data for tickets and events
const userTickets = [
  {
    id: '1',
    title: 'VIP Access Pass',
    date: 'JUL 28',
    access: 'All Access',
    type: 'VIP',
    image: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '2',
    title: 'General Admission',
    date: 'AUG 15',
    access: 'Limited Access',
    type: 'General',
    image: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '3',
    title: 'Backstage Pass',
    date: 'SEP 2',
    access: 'Exclusive Backstage',
    type: 'VIP',
    image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '4',
    title: 'Early Bird Special',
    date: 'SEP 20',
    access: 'General Admission',
    type: 'Early Bird',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
];

const upcomingEvents = [
  {
    id: '1',
    title: 'Tech Conference 2023',
    date: 'AUG 5',
    location: 'San Francisco, CA',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '2',
    title: 'Summer Music Festival',
    date: 'AUG 12',
    location: 'Los Angeles, CA',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '3',
    title: 'Art Exhibition',
    date: 'AUG 25',
    location: 'New York, NY',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '4',
    title: 'Food & Wine Tasting',
    date: 'SEP 8',
    location: 'Napa Valley, CA',
    image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
];

const { width } = Dimensions.get('window');




const HEADER_SCROLL_DISTANCE = 100; // Distance to scroll before header becomes fully opaque

export default function ExploreScreen() {
  const { scrollY, headerOpacity, headerBackground, headerHeight, setHeaderHeight } = useScroll();
  const { event } = useEvent();
  const { isDark, colors } = useTheme();
  const router = useRouter();
  const styles = getStyles(isDark, colors);
  
  // User passes are now handled by PassesDisplay component

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  // Detect if we're in BSL2025 context
  const isBSL2025Event = event.id === 'bsl2025';
  const speakers = event.speakers || [];
  const agenda = event.agenda || [];

  // Helper function
  const getAgendaTypeColor = (type: string) => {
    switch (type) {
      case 'keynote': return '#007AFF';
      case 'panel': return '#34A853';
      case 'break': return '#FF9500';
      case 'meal': return '#FF3B30';
      case 'registration': return '#8E8E93';
      default: return '#8E8E93';
    }
  };

  // PassCard component is now handled by PassesDisplay component

  // TicketCard component
  const TicketCard = ({ ticket }: { ticket: Ticket }) => (
    <View style={styles.ticketCard}>
      <View style={styles.ticketHeader}>
        <View>
          <Text style={styles.ticketDate}>{ticket.date}</Text>
          <Text style={styles.ticketTitle}>{ticket.title}</Text>
        </View>
        <View style={styles.ticketType}>
          <Text style={styles.ticketTypeText}>{ticket.type}</Text>
        </View>
      </View>
      
      <View style={styles.ticketImageContainer}>
        <Image source={{ uri: ticket.image }} style={styles.ticketImage} />
        <View style={styles.ticketOverlay}>
          <Text style={styles.ticketAccessText}>{ticket.access}</Text>
        </View>
      </View>
      
      <View style={styles.ticketFooter}>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialIcons name="qr-code" size={20} color="#4A90E2" />
          <Text style={styles.actionButtonText}>Generate QR</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.actionButton}>
          <MaterialIcons name="info" size={20} color="#4A90E2" />
          <Text style={styles.actionButtonText}>See Details</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.actionButton}>
          <MaterialIcons name="share" size={20} color="#4A90E2" />
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // EventCard component
  const EventCard = ({ event }: { event: Event }) => (
    <View style={styles.eventCard}>
      <Image source={{ uri: event.image }} style={styles.eventImage} />
      <View style={styles.eventInfo}>
        <Text style={styles.eventDate}>{event.date}</Text>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <View style={styles.eventLocation}>
          <MaterialIcons name="location-on" size={16} color="#666" />
          <Text style={styles.eventLocationText}>{event.location}</Text>
        </View>
      </View>
    </View>
  );


  // AgendaCard component
  // Function to detect current day based on date
  const getCurrentDay = () => {
    const now = new Date();
    const eventStart = new Date('2025-11-12T00:00:00'); // BSL 2025 start date
    const eventEnd = new Date('2025-11-14T23:59:59'); // BSL 2025 end date
    
    // Calculate time difference in milliseconds
    const timeDiff = eventStart.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    if (now < eventStart) {
      return { 
        day: 1, 
        status: 'upcoming', 
        daysUntil: daysDiff,
        hoursUntil: Math.ceil((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      };
    } else if (now >= eventStart && now <= eventEnd) {
      const dayNumber = Math.floor((now.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return { day: Math.min(dayNumber, 3), status: 'current' };
    } else {
      return { day: 3, status: 'past' };
    }
  };

  // Function to get day theme name
  const getDayTheme = (day: number) => {
    switch (day) {
      case 1: return 'Regulación, Bancos Centrales e Infraestructura del Dinero Digital';
      case 2: return 'PSAV, Compliance, Custodia y Tokenización';
      case 3: return 'Stablecoins y DeFi: Integrando el Mundo Financiero Global';
      default: return 'Event Day';
    }
  };

  // Function to get upcoming sessions for current day
  const getUpcomingSessions = (day: number) => {
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    return agenda.filter(item => {
      // Simple day detection - you might need to adjust this based on your data structure
      const itemTime = parseInt(item.time.split(' - ')[0].replace(':', ''));
      return itemTime >= currentTime;
    }).slice(0, 3); // Show next 3 sessions
  };

  const AgendaSummaryCard = () => {
    const [currentDayInfo, setCurrentDayInfo] = useState(getCurrentDay());
    const upcomingSessions = getUpcomingSessions(currentDayInfo.day);

    // Update countdown every minute
    useEffect(() => {
      const interval = setInterval(() => {
        setCurrentDayInfo(getCurrentDay());
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }, []);
    
    return (
      <View style={styles.agendaSummaryCard}>
        <View style={styles.agendaSummaryHeader}>
          <View style={styles.dayIndicator}>
            <Text style={styles.dayNumber}>Day {currentDayInfo.day}</Text>
            <View style={[styles.dayStatusBadge, { 
              backgroundColor: currentDayInfo.status === 'current' ? '#34A853' : 
                              currentDayInfo.status === 'upcoming' ? '#FF9500' : '#8E8E93'
            }]}>
              <Text style={styles.dayStatusText}>
                {currentDayInfo.status === 'current' ? 'LIVE' : 
                 currentDayInfo.status === 'upcoming' ? 
                   ((currentDayInfo.daysUntil ?? 0) > 7 ? `${currentDayInfo.daysUntil} days` : 
                    (currentDayInfo.daysUntil ?? 0) > 1 ? `${currentDayInfo.daysUntil} days` :
                    (currentDayInfo.daysUntil ?? 0) === 1 ? `${currentDayInfo.hoursUntil ?? 0}h left` : 'Starting soon!') : 
                 'COMPLETED'}
              </Text>
            </View>
          </View>
          <Text style={styles.dayTheme}>{getDayTheme(currentDayInfo.day)}</Text>
        </View>
        
        {upcomingSessions.length > 0 && (
          <View style={styles.upcomingSessions}>
            <Text style={styles.upcomingTitle}>Upcoming Sessions</Text>
            {upcomingSessions.map((session, index) => (
              <View key={session.id} style={styles.upcomingSession}>
                <Text style={styles.upcomingTime}>{session.time}</Text>
                <Text style={styles.upcomingSessionTitle}>{session.title}</Text>
              </View>
            ))}
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.viewFullAgendaButton}
          onPress={() => router.push('/events/bsl2025/agenda')}
        >
          <Text style={styles.viewFullAgendaText}>View Full Agenda</Text>
          <MaterialIcons name="arrow-forward" size={16} color="#007AFF" />
        </TouchableOpacity>
      </View>
    );
  };

  const EventInfoCard = () => {
    const eventStats = [
      { icon: 'location-on', label: 'Location', value: 'Medellín, Colombia' },
      { icon: 'event', label: 'Date', value: 'November 12-14, 2025' },
      { icon: 'people', label: 'Speakers', value: `${speakers.length} Featured` },
      { icon: 'schedule', label: 'Duration', value: '3 Days of Content' },
      { icon: 'business', label: 'Venue', value: 'Universidad EAFIT' }
    ];
    
    return (
      <View style={styles.agendaSummaryCard}>
        <View style={styles.agendaSummaryHeader}>
          <View style={styles.dayIndicator}>
            <Text style={styles.dayNumber}>BSL 2025</Text>
            <View style={styles.logoContainer}>
              <Text style={styles.bslLogoText}>BSL</Text>
            </View>
          </View>
          <Text style={styles.dayTheme}>Blockchain Summit Latam 2025</Text>
        </View>
        
        <View style={styles.upcomingSessions}>
          <Text style={styles.upcomingTitle}>Event Details</Text>
          {eventStats.map((stat, index) => (
            <View key={index} style={styles.upcomingSession}>
              <MaterialIcons name={stat.icon as any} size={16} color="#007AFF" />
              <Text style={styles.upcomingTime}>{stat.label}</Text>
              <Text style={styles.upcomingSessionTitle}>{stat.value}</Text>
            </View>
          ))}
        </View>
        
        <TouchableOpacity 
          style={styles.viewFullAgendaButton}
          onPress={() => router.push('/events/bsl2025/event-info')}
        >
          <Text style={styles.viewFullAgendaText}>View Full Event Info</Text>
          <MaterialIcons name="arrow-forward" size={16} color="#007AFF" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background.default }]}>
      <Animated.ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Event Header for BSL2025 */}
        {isBSL2025Event && (
          <EventBanner
            title={event.name}
            subtitle="Blockchain Summit Latam 2025"
            date="November 12-14, 2025 • Medellín, Colombia"
            showCountdown={true}
            showLiveIndicator={true}
          />
        )}

        {/* Your Passes Section */}
        <PassesDisplay
          mode="dashboard"
          title={isBSL2025Event ? 'Your Event Passes' : 'Your Passes'}
        />

        {/* BSL2025 Quick Access */}
        {isBSL2025Event && (
          <View style={[styles.section, styles.quickAccessSection]}>
            <Text style={styles.sectionTitle}>Event Quick Access</Text>
            <View style={styles.quickAccessGrid}>
              <TouchableOpacity 
                style={styles.quickAccessCard}
                onPress={() => router.push('/events/bsl2025/speakers/calendar')}
              >
                <MaterialIcons name="people" size={32} color="#007AFF" />
                <Text style={styles.quickAccessTitle}>All Speakers</Text>
                <Text style={styles.quickAccessSubtitle}>{speakers.length} Featured Speakers</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickAccessCard}
                onPress={() => router.push('/events/bsl2025/agenda')}
              >
                <MaterialIcons name="event" size={32} color="#34A853" />
                <Text style={styles.quickAccessTitle}>Event Agenda</Text>
                <Text style={styles.quickAccessSubtitle}>3 Days Schedule</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickAccessCard}
                onPress={() => router.push('/events/bsl2025/event-info')}
              >
                <MaterialIcons name="info" size={32} color="#FF9500" />
                <Text style={styles.quickAccessTitle}>Event Info</Text>
                <Text style={styles.quickAccessSubtitle}>Details & Logistics</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isBSL2025Event && agenda.length > 0 && (
          <View style={[styles.section, styles.agendaSection]}>
            <Text style={styles.sectionTitle}>Event Agenda</Text>
            <AgendaSummaryCard />
          </View>
        )}

        {/* General Events for HashPass App */}
        {!isBSL2025Event && (
          <View style={[styles.section, styles.eventsSection]}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <View style={styles.eventsList}>
              {upcomingEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </View>
          </View>
        )}

        {/* Event Info for BSL2025 */}
        {isBSL2025Event && (
          <View style={[styles.section, styles.agendaSection]}>
            <Text style={styles.sectionTitle}>Event Information</Text>
            <EventInfoCard />
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomColor: '#F0F0F0',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  singleTicketContainer: {
    width: width * 0.8,
    marginRight: 15,
  },
  // Pass Card Styles (using ticket card design)
  singlePassContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  passList: {
    paddingHorizontal: 20,
  },
  noPassesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noPassesText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  noPassesSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingVertical: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionButtonText: {
    marginLeft: 4,
    color: isDark ? '#60A5FA' : '#4A90E2',
    fontSize: 11,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: colors.divider,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  // Ticket card styles
  ticketList: {
    paddingBottom: 10,
  },
  ticketCard: {
    width: width * 0.8,
    backgroundColor: colors.background.paper,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    marginRight: 15,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
    paddingBottom: 8,
  },
  ticketDate: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  ticketType: {
    backgroundColor: isDark ? 'rgba(0, 122, 255, 0.2)' : '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  ticketTypeText: {
    fontSize: 12,
    color: isDark ? '#60A5FA' : '#1976D2',
    fontWeight: '600',
  },
  ticketImageContainer: {
    position: 'relative',
    width: '100%',
    height: 110,
  },
  ticketImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E0E0E0',
  },
  ticketOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ticketInfo: {
    padding: 12,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  ticketAccess: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketAccessText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  ticketPriceText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  logoSeal: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: 'rgba(0, 0, 0, 0.4)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSealText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  // Event card styles
  eventsSection: {
    backgroundColor: colors.background.paper,
    flex: 1,
  },
  eventsList: {
    gap: 15,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.paper,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  eventImage: {
    width: 80,
    height: 80,
    backgroundColor: '#E0E0E0',
  },
  eventInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  eventDate: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventLocationText: {
    marginLeft: 4,
    fontSize: 12,
    color: colors.text.secondary,
  },
  // Quick access styles
  quickAccessSection: {
    backgroundColor: colors.background.paper,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  quickAccessCard: {
    flex: 1,
    backgroundColor: colors.background.default,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  quickAccessTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  quickAccessSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  // Agenda card styles
  agendaSection: {
    backgroundColor: colors.background.paper,
  },
  agendaSummaryCard: {
    backgroundColor: colors.background.paper,
    borderRadius: 16,
    padding: 20,
    shadowColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  agendaSummaryHeader: {
    marginBottom: 16,
  },
  dayIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  dayStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dayStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logoContainer: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bslLogoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  dayTheme: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  upcomingSessions: {
    marginBottom: 16,
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  upcomingSession: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  upcomingTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    minWidth: 80,
    marginRight: 12,
  },
  upcomingSessionTitle: {
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
  },
  viewFullAgendaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: isDark ? 'rgba(0, 122, 255, 0.1)' : 'rgba(0, 122, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  viewFullAgendaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 8,
  },
  agendaList: {
    gap: 16,
  },
  agendaCard: {
    backgroundColor: colors.background.paper,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  agendaTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  agendaTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  agendaTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  agendaTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  agendaContent: {
    flex: 1,
  },
  agendaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  agendaSpeakers: {
    fontSize: 12,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  // View all button
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  viewAllButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginRight: 4,
  },
  // Event info section
  infoSection: {
    backgroundColor: colors.background.paper,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
});
