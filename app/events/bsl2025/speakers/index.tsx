import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useEvent } from '../../../../contexts/EventContext';
import { useTheme } from '../../../../hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Type definitions
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

const { width } = Dimensions.get('window');

const SpeakerCard = ({ speaker }: { speaker: Speaker }) => {
  const router = useRouter();
  
  return (
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
};

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

export default function BSL2025SpeakersScreen() {
  const { event } = useEvent();
  const { isDark, colors } = useTheme();
  const router = useRouter();
  const styles = getStyles(isDark, colors);

  const speakers = event.speakers || [];
  const agenda = event.agenda || [];

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Event Header */}
        <View style={styles.headerSection}>
          <Text style={styles.eventTitle}>{event.name}</Text>
          <Text style={styles.eventSubtitle}>Blockchain Summit Latam 2025</Text>
          <Text style={styles.eventDate}>November 12-14, 2025</Text>
        </View>

        {/* Featured Speakers Section */}
        {speakers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Speakers</Text>
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => router.push('/events/bsl2025/speakers/calendar')}
              >
                <Text style={styles.viewAllButtonText}>View All</Text>
                <MaterialIcons name="arrow-forward" size={16} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.speakersList}>
              {speakers.slice(0, 8).map(speaker => (
                <SpeakerCard key={speaker.id} speaker={speaker} />
              ))}
            </View>
          </View>
        )}

        {/* Event Agenda Section */}
        {agenda.length > 0 && (
          <View style={[styles.section, styles.agendaSection]}>
            <Text style={styles.sectionTitle}>Event Agenda</Text>
            <View style={styles.agendaList}>
              {agenda.slice(0, 6).map(agendaItem => (
                <AgendaCard key={agendaItem.id} agendaItem={agendaItem} />
              ))}
            </View>
            {agenda.length > 6 && (
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllButtonText}>View Full Agenda</Text>
                <MaterialIcons name="arrow-forward" size={16} color="#007AFF" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Event Info Section */}
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
      </ScrollView>
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
  scrollContent: {
    paddingBottom: 30,
  },
  headerSection: {
    padding: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  eventSubtitle: {
    fontSize: 16,
    color: '#E3F2FD',
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 14,
    color: '#BBDEFB',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  speakersList: {
    gap: 12,
  },
  speakerCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.paper,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  speakerImageContainer: {
    marginRight: 12,
  },
  speakerImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
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
  agendaSection: {
    backgroundColor: colors.background.paper,
  },
  agendaList: {
    gap: 12,
  },
  agendaCard: {
    backgroundColor: colors.background.paper,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  infoSection: {
    backgroundColor: colors.background.paper,
  },
  infoCard: {
    backgroundColor: colors.background.paper,
    borderRadius: 12,
    padding: 16,
    shadowColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
