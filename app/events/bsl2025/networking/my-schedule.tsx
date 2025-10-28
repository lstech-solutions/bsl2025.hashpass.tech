import React, { useState, useMemo, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  SafeAreaView,
  StatusBar,
  Platform,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../../../hooks/useTheme';
import { format, addDays, isSameDay, isToday, isPast, isFuture, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../../hooks/useAuth';
import { supabase } from '../../../../lib/supabase';
import { useToastHelpers } from '../../../../contexts/ToastContext';
import { Meeting, TimeSlot, DaySchedule } from '@/types/networking';

// Constants
const WORKING_HOURS = { start: 8, end: 19 }; // 8 AM to 7 PM (covers 08:00–18:30 sessions)
const TIME_SLOT_MINUTES = 15; // 15-minute time slots
const BSL_2025_DATES = {
  start: new Date(2025, 10, 12), // November 12, 2025 (months are 0-indexed)
  end: new Date(2025, 10, 14)    // November 14, 2025
};

// Interpret all incoming times as event-local wall clock (Medellín, UTC-05)
// - If string ends with 'Z', replace with -05:00 so 08:00:00Z -> 08:00:00-05:00
// - If it already has an explicit offset (e.g., +01:00), keep as is
// - If it has no offset, append -05:00
const EVENT_TZ_OFFSET = '-05:00';
const endsWithZ = (s: string) => /[zZ]$/.test(s);
const hasOtherOffset = (s: string) => /[+-]\d{2}:?\d{2}$/.test(s);
const parseEventISO = (s: string) => {
  let normalized = s;
  if (endsWithZ(s)) {
    normalized = s.slice(0, -1) + EVENT_TZ_OFFSET;
  } else if (!hasOtherOffset(s)) {
    normalized = s + EVENT_TZ_OFFSET;
  }
  return parseISO(normalized);
};

// Helper function to add minutes to a date
const addMinutes = (date: Date, minutes: number): Date => {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
};

const MySchedule = () => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { showError } = useToastHelpers();
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title: 'My Schedule' } as any);
  }, [navigation]);
  const [selectedDate, setSelectedDate] = useState<Date>(BSL_2025_DATES.start);
  const [expandedHours, setExpandedHours] = useState<{[key: string]: boolean}>({});
  const [dbMeetings, setDbMeetings] = useState<Meeting[]>([]);
  const [loadingAgenda, setLoadingAgenda] = useState<boolean>(false);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  // Meetings state
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState<boolean>(false);
  const [refreshingMeetings, setRefreshingMeetings] = useState<boolean>(false);
  const [showMeetingsSection, setShowMeetingsSection] = useState<boolean>(false);
  const [meetingFilter, setMeetingFilter] = useState<'all' | 'incoming' | 'passed'>('all');

  const meetingCounts = useMemo(() => {
    const now = new Date();
    let total = meetings.length;
    let upcoming = 0;
    let past = 0;
    meetings.forEach((m: any) => {
      if (m?.scheduled_at) {
        const d = parseEventISO(m.scheduled_at);
        if (!isNaN(d.getTime())) {
          if (d.getTime() >= now.getTime()) upcoming += 1; else past += 1;
        }
      }
    });
    return { total, upcoming, past };
  }, [meetings]);

  const filteredMeetings = useMemo(() => {
    if (meetingFilter === 'all') return meetings;
    const now = new Date();
    return meetings.filter((m: any) => {
      if (!m?.scheduled_at) return false;
      const d = parseEventISO(m.scheduled_at);
      if (isNaN(d.getTime())) return false;
      if (meetingFilter === 'incoming') return d.getTime() >= now.getTime();
      return d.getTime() < now.getTime(); // 'passed'
    });
  }, [meetings, meetingFilter]);

  useEffect(() => {
    const fetchAgenda = async () => {
      setLoadingAgenda(true);
      try {
        const res = await fetch('/api/bslatam/agenda?eventId=bsl2025');
        const json = await res.json();
        const items: any[] = json?.data || [];
        const toMinutes = (t?: string) => (t === 'panel' ? 60 : t === 'keynote' ? 30 : 30);
        const mapped: Meeting[] = items.map((it) => {
          const start = it.time as string;
          const duration = toMinutes(it.type);
          const end = new Date(start);
          end.setMinutes(end.getMinutes() + duration);
          return {
            id: String(it.id),
            title: it.title || '',
            description: it.description || undefined,
            startTime: start,
            endTime: end.toISOString(),
            participants: Array.isArray(it.speakers) ? it.speakers : [],
            status: 'confirmed',
            location: it.location || 'TBD',
            type: it.type || 'keynote',
            duration,
          } as Meeting;
        });
        setDbMeetings(mapped);
      } catch (e) {
        setDbMeetings([]);
      } finally {
        setLoadingAgenda(false);
      }
    };
    fetchAgenda();
  }, []);

  // Load user meetings (requester or speaker)
  useEffect(() => {
    const loadMeetings = async () => {
      if (!user) {
        setMeetings([]);
        setLoadingMeetings(false);
        return;
      }
      try {
        setLoadingMeetings(true);
        const { data: speakerRows } = await supabase
          .from('bsl_speakers')
          .select('id')
          .eq('user_id', user.id);
        const speakerIds = (speakerRows || []).map((r: any) => r.id).join(',');

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
          setMeetings(data || []);
        }
      } catch (e) {
        console.error('Error loading meetings:', e);
        showError('Error', 'Failed to load meetings');
        setMeetings([]);
      } finally {
        setLoadingMeetings(false);
      }
    };
    loadMeetings();
  }, [user]);

  const refreshMeetings = async () => {
    setRefreshingMeetings(true);
    try {
      // Re-run the effect's logic quickly
      if (!user) {
        setMeetings([]);
        return;
      }
      const { data: speakerRows } = await supabase
        .from('bsl_speakers')
        .select('id')
        .eq('user_id', user.id);
      const speakerIds = (speakerRows || []).map((r: any) => r.id).join(',');
      let query = supabase
        .from('meetings')
        .select('*')
        .order('created_at', { ascending: false });
      if (speakerIds) {
        query = query.or(`requester_id.eq.${user.id},speaker_id.in.(${speakerIds})`);
      } else {
        query = query.eq('requester_id', user.id);
      }
      const { data } = await query;
      setMeetings(data || []);
    } finally {
      setRefreshingMeetings(false);
    }
  };

  // Generate time slots for a given date
  const generateTimeSlots = (date: Date, meetings: Meeting[]): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const now = new Date();

    // Calculate total minutes in the working day
    const totalWorkingMinutes = (WORKING_HOURS.end - WORKING_HOURS.start) * 60;
    const totalSlots = totalWorkingMinutes / TIME_SLOT_MINUTES;

    // Filter meetings for this date
    const dayMeetings = meetings.filter(meeting => {
      if (!meeting.startTime) return false;
      return isSameDay(parseEventISO(meeting.startTime), date);
    });

    for (let i = 0; i < totalSlots; i++) {
      const startTime = new Date(date);
      startTime.setHours(WORKING_HOURS.start);
      startTime.setMinutes(0, 0, 0);

      const slotStart = addMinutes(startTime, i * TIME_SLOT_MINUTES);
      const slotEnd = addMinutes(slotStart, TIME_SLOT_MINUTES);

      // Check if there's a meeting at this time
      const meeting = dayMeetings.find(m => {
        if (!m.startTime || !m.endTime) return false; // Skip meetings without times
        
        const meetingStart = parseEventISO(m.startTime);
        const meetingEnd = parseEventISO(m.endTime);
        return (
          (meetingStart >= slotStart && meetingStart < slotEnd) ||
          (slotStart >= meetingStart && slotStart < meetingEnd)
        );
      });

      const isPastSlot = isPast(slotEnd);
      const isFutureSlot = isFuture(slotStart);
      const isCurrentSlot = isToday(date) && !isPastSlot && !isFutureSlot;

      slots.push({
        id: `${date.toISOString()}-slot-${i}`,
        startTime: slotStart,
        endTime: slotEnd,
        meeting,
        isNow: isCurrentSlot,
        isPast: isPastSlot,
        isFuture: isFutureSlot
      });
    }

    return slots;
  };

  // Generate schedule data for BSL 2025 (Nov 12-14)
  const schedule = useMemo(() => {
    const days: DaySchedule[] = [];
    let currentDate = new Date(BSL_2025_DATES.start);

    while (currentDate <= BSL_2025_DATES.end) {
      const fullList = dbMeetings;
      const filteredList = fullList;
      const slots = generateTimeSlots(currentDate, filteredList);
      days.push({
        date: new Date(currentDate),
        dayName: format(currentDate, 'EEEE', { locale: es }),
        dateFormatted: format(currentDate, 'MMM d', { locale: es }),
        isToday: isToday(currentDate),
        slots: slots,
        timeSlots: slots, // Map slots to timeSlots to satisfy the interface
        hasMeetings: slots.some(slot => slot.meeting) // Check if any slot has a meeting
      });
      currentDate = addDays(currentDate, 1);
    }

    return days;
  }, [dbMeetings]);

  // Group time slots by hour for better organization
  const groupedSlots = useMemo(() => {
    const selectedDay = schedule.find(day => isSameDay(day.date, selectedDate));
    if (!selectedDay) return {};

    const grouped: {[hour: string]: TimeSlot[]} = {};

    selectedDay.timeSlots.forEach(slot => {
      const hour = format(slot.startTime, 'h a'); // e.g. "9 AM"
      if (!grouped[hour]) {
        grouped[hour] = [];
      }
      grouped[hour].push(slot);
    });

    return grouped;
  }, [schedule, selectedDate]);

  // Toggle expanded state for hour group
  const toggleHourGroup = (hour: string) => {
    setExpandedHours(prev => ({
      ...prev,
      [hour]: !prev[hour]
    }));
  };

  // Render a single time slot
  const renderTimeSlot = (slot: TimeSlot) => {
    const isExpanded = expandedHours[format(slot.startTime, 'h a')];

    if (slot.meeting) {
      const statusColor = slot.meeting.status === 'confirmed' || slot.meeting.status === 'scheduled' ? '#2E7D32' :
                         slot.meeting.status === 'in_progress' ? '#F57F17' : '#C62828';
      const statusBgColor = `${statusColor}20`;
      const isSelected = selectedEventIds.has(slot.meeting.id);
      const toggleSelect = () => {
        setSelectedEventIds(prev => {
          const next = new Set(prev);
          if (next.has(slot.meeting!.id)) next.delete(slot.meeting!.id); else next.add(slot.meeting!.id);
          return next;
        });
      };

      return (
        <TouchableOpacity onPress={toggleSelect} activeOpacity={0.8} style={[
          styles.meetingSlot,
          {
            backgroundColor: isDark ? colors.surface : '#F8F9FA',
            borderLeftColor: colors.success.main,
            shadowColor: '#000000',
            shadowOpacity: isDark ? 0.2 : 0.05,
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 2,
            elevation: isDark ? 3 : 1,
          }
        ]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.meetingTime, { color: colors.text.secondary }]}>
              {format(slot.startTime, 'h:mm a')}
            </Text>
            <View style={[styles.statusIndicator, { backgroundColor: statusBgColor }]}> 
              <Text style={[styles.statusText, { color: statusColor }]}> 
                {slot.meeting.status}
              </Text>
            </View>
          </View>
          <Text style={[styles.meetingTitle, { color: colors.text.primary }]}> 
            {slot.meeting.title}
          </Text>
          <Text style={[styles.meetingLocation, { color: colors.text.secondary }]}> 
            {slot.meeting.location}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <MaterialIcons
              name={isSelected ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={isSelected ? colors.primary : colors.text.secondary}
              style={{ marginRight: 6 }}
            />
            <Text style={{ color: isSelected ? colors.primary : colors.text.secondary }}>
              {isSelected ? 'Added to My Schedule' : 'Tap to add to My Schedule'}
            </Text>
          </View>
          {(slot.meeting?.participants?.length ?? 0) > 0 && (
            <View style={[
              styles.participantsContainer,
              { borderTopColor: colors.divider }
            ]}>
              <MaterialIcons
                name="people"
                size={14}
                color={colors.text.secondary}
                style={styles.icon}
              />
              <Text style={[styles.participantsText, { color: colors.text.secondary }]}> 
                {slot.meeting?.participants?.join(', ')}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[
          styles.emptySlot,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            shadowColor: '#000000',
            shadowOpacity: isDark ? 0.15 : 0.05,
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 2,
            elevation: isDark ? 2 : 1,
          }
        ]}
        onPress={() => console.log('Schedule meeting at', format(slot.startTime, 'h:mm a'))}
      >
        <MaterialIcons
          name="add-circle-outline"
          size={20}
          color={colors.primary}
        />
      </TouchableOpacity>
    );
  };

  // Render hour group
  const renderHourGroup = (hour: string, slots: TimeSlot[]) => {
    const hasMeetings = slots.some(slot => slot.meeting);
    const freeSlots = slots.filter(slot => !slot.meeting).length;
    const totalSlots = slots.length;
    const isExpanded = expandedHours[hour] ?? false;

    return (
      <View key={hour} style={[
        styles.hourGroup,
        {
          backgroundColor: colors.background.paper,
          borderColor: colors.divider,
          shadowColor: '#000000',
          shadowOpacity: isDark ? 0.4 : 0.1,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 4,
          elevation: isDark ? 4 : 2,
        }
      ]}>
        <TouchableOpacity
          style={[
            styles.hourHeader,
            { backgroundColor: isDark ? colors.surface : 'rgba(0, 0, 0, 0.05)' }
          ]}
          onPress={() => toggleHourGroup(hour)}
        >
          <View style={styles.hourHeaderContent}>
            <Text style={[styles.hourText, { color: colors.text.primary }]}>
              {hour}
            </Text>
            <View style={styles.slotInfo}>
              <Text style={[styles.slotCount, { color: colors.text.secondary }]}>
                {freeSlots}/{totalSlots}
              </Text>
              <MaterialIcons
                name={isExpanded ? 'expand-less' : 'expand-more'}
                size={20}
                color={colors.text.secondary}
              />
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.timeSlotsContainer}>
            {slots.map((slot) => (
              <View key={slot.id} style={styles.slotWrapper}>
                {renderTimeSlot(slot)}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: colors.background.primary }
    ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header spacing */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }} />

      {/* Date Selector */}
      <View style={[
        styles.dateSelector,
        {
          backgroundColor: colors.background.paper,
          borderBottomColor: colors.divider
        }
      ]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateScrollView}
        >
          {schedule.map((day) => {
            const isSelected = isSameDay(day.date, selectedDate);
            return (
              <TouchableOpacity
                key={day.date.toString()}
                style={[
                  styles.dateButton,
                  isSelected && { backgroundColor: colors.primary },
                  day.isToday && !isSelected && {
                    borderWidth: 1,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setSelectedDate(day.date)}
              >
                <Text
                  style={[
                    styles.dateNumber,
                    { color: isSelected ? '#ffffff' : colors.text.primary },
                    day.isToday && !isSelected && { color: colors.primary },
                  ]}
                >
                  {format(day.date, 'd')}
                </Text>
                <Text
                  style={[
                    styles.dateName,
                    { color: isSelected ? '#ffffff' : colors.text.primary, opacity: 0.7 },
                    day.isToday && !isSelected && { color: colors.primary },
                  ]}
                >
                  {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Time Slots */}
      <ScrollView style={[
        styles.content,
        { backgroundColor: colors.background.primary }
      ]}>
        {Object.entries(groupedSlots).map(([hour, slots]) =>
          renderHourGroup(hour, slots)
        )}

        {/* My Meetings Section */}
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
            <TouchableOpacity
              onPress={() => setShowMeetingsSection(v => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingVertical: 6 }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="event" size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={{ color: colors.text.primary, fontWeight: '600', fontSize: 16 }}>My Meetings</Text>
              {/* Counters (always visible; act as filters when expanded) */}
              <View style={{ flexDirection: 'row', marginLeft: 12 }}>
                <TouchableOpacity
                  onPress={() => setMeetingFilter('all')}
                  activeOpacity={0.7}
                  style={{ backgroundColor: meetingFilter==='all' ? (isDark ? 'rgba(0,122,255,0.25)' : 'rgba(0,122,255,0.15)') : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'), paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 6, borderWidth: 1, borderColor: colors.divider }}
                >
                  <Text style={{ color: colors.text.secondary, fontSize: 12 }}>Total {meetingCounts.total}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMeetingFilter('incoming')}
                  activeOpacity={0.7}
                  style={{ backgroundColor: meetingFilter==='incoming' ? (isDark ? 'rgba(76, 175, 80, 0.3)' : 'rgba(76, 175, 80, 0.2)') : (isDark ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.12)'), paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 6, borderWidth: 1, borderColor: colors.divider }}
                >
                  <Text style={{ color: colors.text.secondary, fontSize: 12 }}>Incoming {meetingCounts.upcoming}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMeetingFilter('passed')}
                  activeOpacity={0.7}
                  style={{ backgroundColor: meetingFilter==='passed' ? (isDark ? 'rgba(158, 158, 158, 0.3)' : 'rgba(158, 158, 158, 0.2)') : (isDark ? 'rgba(158, 158, 158, 0.15)' : 'rgba(158, 158, 158, 0.12)'), paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: colors.divider }}
                >
                  <Text style={{ color: colors.text.secondary, fontSize: 12 }}>Passed {meetingCounts.past}</Text>
                </TouchableOpacity>
              </View>
              <MaterialIcons
                name={showMeetingsSection ? 'expand-less' : 'expand-more'}
                size={20}
                color={colors.text.secondary}
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={refreshMeetings} style={{ padding: 6 }}>
              <MaterialIcons name="refresh" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {!showMeetingsSection ? null : loadingMeetings ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ marginTop: 8, color: colors.text.secondary }}>Loading meetings...</Text>
            </View>
          ) : filteredMeetings.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <MaterialIcons name="event-busy" size={28} color={colors.text.secondary} />
              <Text style={{ marginTop: 8, color: colors.text.secondary }}>No meetings yet</Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
              {filteredMeetings.map((m: any) => (
                <View
                  key={m.id}
                  style={[
                    styles.meetingSlot,
                    {
                      backgroundColor: isDark ? colors.surface : '#F8F9FA',
                      borderLeftColor: colors.primary,
                      shadowColor: '#000000',
                      shadowOpacity: isDark ? 0.2 : 0.05,
                      shadowOffset: { width: 0, height: 1 },
                      shadowRadius: 2,
                      elevation: isDark ? 3 : 1,
                      borderColor: colors.divider,
                    },
                  ]}
                > 
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.meetingTime, { color: colors.text.secondary }]}>
                      {m.scheduled_at ? format(parseEventISO(m.scheduled_at), 'MMM d, h:mm a') : 'Not scheduled'}
                    </Text>
                    <View style={[styles.statusIndicator, { backgroundColor: (m.status === 'confirmed') ? (isDark ? colors.success.dark : colors.success.light) : (isDark ? colors.warning.dark : colors.warning.light) }]} />
                  </View>
                  <Text style={[styles.meetingTitle, { color: colors.text.primary }]}> 
                    {user?.id === m.requester_id ? `Meeting with ${m.speaker_name}` : `Meeting with ${m.requester_name}`}
                  </Text>
                  {!!m.location && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                      <MaterialIcons name="location-on" size={16} color={colors.text.secondary} style={{ marginRight: 6 }} />
                      <Text style={{ color: colors.text.secondary }}>{m.location}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  dateSelector: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  dateScrollView: {
    paddingHorizontal: 8,
  },
  dateButton: {
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    width: 60,
    marginHorizontal: 4,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dateNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateName: {
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  hourGroup: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  hourHeader: {
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  hourHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotCount: {
    fontSize: 13,
  },
  hourText: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeSlotsContainer: {
    padding: 8,
  },
  slotWrapper: {
    marginBottom: 8,
  },
  meetingSlot: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#F8F9FA',
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emptySlot: {
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  meetingTime: {
    fontSize: 12,
    marginBottom: 4,
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  meetingLocation: {
    fontSize: 13,
    marginBottom: 4,
  },
  participantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  participantsText: {
    fontSize: 13,
    marginLeft: 6,
  },
  icon: {
    marginRight: 6,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default MySchedule;
