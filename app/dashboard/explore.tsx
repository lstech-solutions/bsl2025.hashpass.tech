import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Image, Dimensions, TouchableOpacity, Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useScroll } from '../../contexts/ScrollContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

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

const HEADER_SCROLL_DISTANCE = 100; // Distance to scroll before header becomes fully opaque

export default function ExploreScreen() {
  const { scrollY, headerOpacity, headerBackground, headerHeight, setHeaderHeight } = useScroll();

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  return (
    <View style={styles.container}>

      <Animated.ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Passes</Text>
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

        <View style={[styles.section, styles.eventsSection]}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          <View style={styles.eventsList}>
            {upcomingEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    color: '#4A90E2',
    fontSize: 11,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: '#E0E0E0',
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 15,
  },
  // Ticket card styles
  ticketList: {
    paddingBottom: 10,
  },
  ticketCard: {
    width: width * 0.8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#F0F0F0',
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
    color: '#666',
    fontWeight: '500',
    marginBottom: 2,
  },
  ticketType: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  ticketTypeText: {
    fontSize: 12,
    color: '#1976D2',
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
    color: '#000',
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
    backgroundColor: '#F5F5F5',
    flex: 1,
  },
  eventsList: {
    gap: 15,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    color: '#666',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventLocationText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
});
