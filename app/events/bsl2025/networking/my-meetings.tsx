import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { MaterialIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@hooks/useAuth';
import { supabase } from '@lib/supabase';
import { useToastHelpers } from '@contexts/ToastContext';
import { Meeting } from '@/types/networking';

const MeetingsPage = () => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { showError } = useToastHelpers();
  const styles = getStyles(isDark, colors);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMeetings();
  }, [user]);

  const getSpeakerIds = async () => {
    if (!user) return '';
    const { data } = await supabase
      .from('bsl_speakers')
      .select('id')
      .eq('user_id', user.id);
    return data?.map((s: any) => s.id).join(',') || '';
  };

  const loadMeetings = async () => {
    if (!user) {
      setLoading(false);
      setMeetings([]);
      return;
    }
    try {
      setLoading(true);
      const speakerIds = await getSpeakerIds();
      let query = supabase
        .from('meetings')
        .select('*')
        .order('created_at', { ascending: false });

      if (speakerIds) {
        query = query.or(`requester_id.eq.${user.id},speaker_id.in.(${speakerIds})`);
      } else {
        query = query.eq('requester_id', user.id);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error loading meetings:', error);
        showError('Error', 'Failed to load meetings');
        setMeetings([]);
      } else {
        setMeetings((data as any[]) || []);
      }
    } catch (e) {
      console.error('Error loading meetings:', e);
      showError('Error', 'Failed to load meetings');
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMeetings();
    setRefreshing(false);
  };

  const renderMeetingItem = ({ item }: { item: Meeting }) => (
    <View style={styles.meetingCard}>
      <View style={styles.meetingTime}>
        <Text style={styles.timeText}>
          {item.scheduled_at ? format(parseISO(item.scheduled_at), 'MMM d, h:mm a') : 'Not scheduled'}
        </Text>
      </View>
      <View style={styles.meetingDetails}>
        <Text style={styles.meetingTitle}>
          {user?.id === item.requester_id ? `Meeting with ${item.speaker_name}` : `Meeting with ${item.requester_name}`}
        </Text>
        {item.notes && <Text style={styles.meetingDescription}>{item.notes}</Text>}
        <View style={styles.detailRow}>
          <MaterialIcons name="location-on" size={16} color={colors.text?.secondary || (isDark ? '#cccccc' : '#666666')} style={styles.icon} />
          <Text style={styles.detailText}>{item.location || 'TBD'}</Text>
        </View>
      </View>
      <View style={[styles.statusIndicator, { 
        backgroundColor: item.status === 'confirmed' 
          ? isDark ? colors.success.dark : colors.success.light
          : isDark ? colors.warning.dark : colors.warning.light 
      }]} />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Meetings</Text>
        <TouchableOpacity style={styles.addButton} onPress={onRefresh}>
          <MaterialIcons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyText}>Loading meetings...</Text>
        </View>
      ) : meetings.length > 0 ? (
        <FlatList
          data={meetings}
          keyExtractor={(item) => item.id}
          renderItem={renderMeetingItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialIcons name="event-busy" size={48} color={colors.text?.secondary || (isDark ? '#cccccc' : '#666666')} />
          <Text style={styles.emptyText}>No meetings yet</Text>
        </View>
      )}
    </View>
  );
};

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background?.default || (isDark ? '#121212' : '#ffffff'),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider || (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'),
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
  },
  addButton: {
    padding: 8,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  meetingCard: {
    backgroundColor: colors.background?.paper || (isDark ? '#1E1E1E' : '#F5F5F7'),
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.divider || (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'),
  },
  meetingTime: {
    marginRight: 16,
    alignItems: 'center',
  },
  timeText: {
    color: colors.primary || '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  meetingDetails: {
    flex: 1,
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
    marginBottom: 6,
  },
  meetingDescription: {
    fontSize: 14,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  icon: {
    marginRight: 6,
  },
  detailText: {
    fontSize: 13,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 10,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
    marginBottom: 24,
  },
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default MeetingsPage;
