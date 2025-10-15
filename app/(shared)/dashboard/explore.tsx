import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Image, Dimensions, TouchableOpacity, Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useScroll } from '../../../contexts/ScrollContext';
import { useEvent } from '../../../contexts/EventContext';
import { useTheme } from '../../../hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

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

interface Speaker {
  id: string;
  name: string;
  title: string;
  company: string;
  bio?: string;
  image?: string;
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

  // SpeakerCard component
  const SpeakerCard = ({ speaker }: { speaker: Speaker }) => (
    <TouchableOpacity 
      style={styles.speakerCard}
      onPress={() => router.push(`/events/bsl2025/speakers/${speaker.id}`)}
    >
      <View style={styles.speakerImageContainer}>
        <View style={styles.speakerImagePlaceholder}>
          <MaterialIcons name="person" size={24} color="#666" />
        </View>
      </View>
      <View style={styles.speakerInfo}>
        <Text style={styles.speakerName}>{speaker.name}</Text>
        <Text style={styles.speakerTitle}>{speaker.title}</Text>
        <Text style={styles.speakerCompany}>{speaker.company}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color="#666" />
    </TouchableOpacity>
  );

  // AgendaCard component
  const AgendaCard = ({ agendaItem }: { agendaItem: AgendaItem }) => (
    <View style={styles.agendaCard}>
      <View style={styles.agendaTimeContainer}>
        <Text style={styles.agendaTime}>{agendaItem.time}</Text>
        <View style={[styles.agendaTypeBadge, { backgroundColor: getAgendaTypeColor(agendaItem.type) }]}>
          <Text style={styles.agendaTypeText}>{agendaItem.type.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.agendaContent}>
        <Text style={styles.agendaTitle}>{agendaItem.title}</Text>
        {agendaItem.speakers && agendaItem.speakers.length > 0 && (
          <Text style={styles.agendaSpeakers}>Speakers: {agendaItem.speakers.join(', ')}</Text>
        )}
      </View>
    </View>
  );

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
          <View style={styles.eventHeaderSection}>
            <Text style={styles.eventHeaderTitle}>{event.name}</Text>
            <Text style={styles.eventHeaderSubtitle}>Blockchain Summit Latam 2025</Text>
            <Text style={styles.eventHeaderDate}>November 12-14, 2025 • Medellín, Colombia</Text>
          </View>
        )}

        {/* Your Passes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isBSL2025Event ? 'Your Event Passes' : 'Your Passes'}
          </Text>
          <View style={{ height: 250 }}>
            <FlatList
              data={userTickets}
              renderItem={({ item }) => (
                <View style={userTickets.length === 1 ? styles.singleTicketContainer : null}>
                  <TicketCard ticket={item} />
                </View>
              )}
              keyExtractor={item => item.id}
              horizontal={userTickets.length > 1}
              showsHorizontalScrollIndicator={userTickets.length > 1}
              contentContainerStyle={styles.ticketList}
              scrollEnabled={userTickets.length > 1}
            />
          </View>
        </View>

        {/* BSL2025 Specific Content */}
        {isBSL2025Event && speakers.length > 0 && (
          <View style={[styles.section, styles.speakersSection]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Speakers</Text>
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => router.push('/events/bsl2025/speakers')}
              >
                <Text style={styles.viewAllButtonText}>View All</Text>
                <MaterialIcons name="arrow-forward" size={16} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.speakersList}>
              {speakers.slice(0, 6).map(speaker => (
                <SpeakerCard key={speaker.id} speaker={speaker} />
              ))}
            </View>
          </View>
        )}

        {isBSL2025Event && agenda.length > 0 && (
          <View style={[styles.section, styles.agendaSection]}>
            <Text style={styles.sectionTitle}>Event Agenda</Text>
            <View style={styles.agendaList}>
              {agenda.slice(0, 5).map(agendaItem => (
                <AgendaCard key={agendaItem.id} agendaItem={agendaItem} />
              ))}
            </View>
            {agenda.length > 5 && (
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllButtonText}>View Full Agenda</Text>
                <MaterialIcons name="arrow-forward" size={16} color="#007AFF" />
              </TouchableOpacity>
            )}
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
          <View style={[styles.section, styles.infoSection]}>
            <Text style={styles.sectionTitle}>Event Information</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <MaterialIcons name="location-on" size={20} color="#007AFF" />
                <Text style={styles.infoText}>Medellín, Colombia</Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons name="event" size={20} color="#007AFF" />
                <Text style={styles.infoText}>November 12-14, 2025</Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons name="people" size={20} color="#007AFF" />
                <Text style={styles.infoText}>{speakers.length} Speakers</Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons name="schedule" size={20} color="#007AFF" />
                <Text style={styles.infoText}>3 Days of Content</Text>
              </View>
            </View>
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
  // BSL2025 Event Header
  eventHeaderSection: {
    padding: 32,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  eventHeaderTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  eventHeaderSubtitle: {
    fontSize: 20,
    color: '#E3F2FD',
    marginBottom: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  eventHeaderDate: {
    fontSize: 16,
    color: '#BBDEFB',
    fontWeight: '500',
    textAlign: 'center',
  },
  // Speaker card styles
  speakersSection: {
    backgroundColor: colors.background.paper,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  speakersList: {
    gap: 16,
  },
  speakerCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.paper,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  speakerImageContainer: {
    marginRight: 16,
  },
  speakerImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  speakerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  speakerTitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  speakerCompany: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  // Agenda card styles
  agendaSection: {
    backgroundColor: colors.background.paper,
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
  infoCard: {
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 12,
  },
});
