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
import ScheduleConfirmationModal from '../../../../components/ScheduleConfirmationModal';
import * as Haptics from 'expo-haptics';

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
  const { showError, showSuccess, showWarning } = useToastHelpers();
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title: 'My Schedule' } as any);
  }, [navigation]);
  const [selectedDate, setSelectedDate] = useState<Date>(BSL_2025_DATES.start);
  const [expandedHours, setExpandedHours] = useState<{[key: string]: boolean}>({});
  const [dbMeetings, setDbMeetings] = useState<Meeting[]>([]);
  const [loadingAgenda, setLoadingAgenda] = useState<boolean>(false);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [userAgendaStatus, setUserAgendaStatus] = useState<Record<string, 'tentative' | 'confirmed'>>({});
  const [userMeetingStatus, setUserMeetingStatus] = useState<Record<string, 'tentative' | 'confirmed'>>({});
  const [userFreeSlotStatus, setUserFreeSlotStatus] = useState<Record<string, 'available' | 'interested' | 'blocked' | 'tentative'>>({});
  const [favoriteStatus, setFavoriteStatus] = useState<Record<string, boolean>>({});
  const [confirmationModal, setConfirmationModal] = useState<{
    visible: boolean;
    meeting: Meeting | null;
    slotStartTime: Date | null;
  }>({
    visible: false,
    meeting: null,
    slotStartTime: null,
  });
  const [isConfirming, setIsConfirming] = useState(false);
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

  // Load user confirmation statuses for agenda events, meetings, and free slots
  useEffect(() => {
    const loadUserScheduleStatus = async () => {
      if (!user) {
        setUserAgendaStatus({});
        setUserMeetingStatus({});
        setUserFreeSlotStatus({});
        return;
      }
      try {
        const { data, error } = await supabase
          .from('user_agenda_status')
          .select('agenda_id, meeting_id, slot_time, status, slot_status, is_favorite')
          .eq('user_id', user.id);
        
        if (error) {
          console.error('Error loading user schedule status:', error);
          return;
        }
        
        const agendaStatusMap: Record<string, 'tentative' | 'confirmed'> = {};
        const meetingStatusMap: Record<string, 'tentative' | 'confirmed'> = {};
        const freeSlotStatusMap: Record<string, 'available' | 'interested' | 'blocked' | 'tentative'> = {};
        const favoriteMap: Record<string, boolean> = {};
        
        (data || []).forEach((item: any) => {
          const itemId = item.agenda_id || item.meeting_id || (item.slot_time ? new Date(item.slot_time).toISOString() : null);
          if (!itemId) return;
          
          if (item.agenda_id) {
            // Map 'unconfirmed' to 'tentative' for backward compatibility
            const status = item.status === 'unconfirmed' ? 'tentative' : item.status;
            agendaStatusMap[item.agenda_id] = status as 'tentative' | 'confirmed';
            if (item.is_favorite) favoriteMap[item.agenda_id] = true;
          } else if (item.meeting_id) {
            const status = item.status === 'unconfirmed' ? 'tentative' : item.status;
            meetingStatusMap[item.meeting_id] = status as 'tentative' | 'confirmed';
            if (item.is_favorite) favoriteMap[item.meeting_id] = true;
          } else if (item.slot_time) {
            // Free slot - use slot_time as key (ISO string)
            const slotKey = new Date(item.slot_time).toISOString();
            freeSlotStatusMap[slotKey] = (item.slot_status || item.status) as 'available' | 'interested' | 'blocked' | 'tentative';
          }
        });
        
        setUserAgendaStatus(agendaStatusMap);
        setUserMeetingStatus(meetingStatusMap);
        setUserFreeSlotStatus(freeSlotStatusMap);
        setFavoriteStatus(favoriteMap);
      } catch (e) {
        console.error('Error loading user schedule status:', e);
      }
    };
    loadUserScheduleStatus();
  }, [user]);

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
          const agendaId = String(it.id);
          // Check user's confirmation status, default to 'tentative' for agenda events
          const userStatus = userAgendaStatus[agendaId] || 'tentative';
          return {
            id: agendaId,
            title: it.title || '',
            description: it.description || undefined,
            startTime: start,
            endTime: end.toISOString(),
            participants: Array.isArray(it.speakers) ? it.speakers : [],
            status: userStatus === 'confirmed' ? 'confirmed' : 'tentative',
            location: it.location || 'TBD',
            type: it.type || 'keynote',
            duration,
            isAgendaEvent: true, // Mark as agenda event
          } as Meeting & { isAgendaEvent?: boolean };
        });
        setDbMeetings(mapped);
      } catch (e) {
        setDbMeetings([]);
      } finally {
        setLoadingAgenda(false);
      }
    };
    fetchAgenda();
  }, [userAgendaStatus]);

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

  // Combine agenda events and personal meetings, and apply user confirmation status
  const allMeetings = useMemo(() => {
    // Map personal meetings to Meeting format
    const personalMeetings: Meeting[] = meetings.map((m: any) => {
      const meetingStartTime = m.scheduled_at || m.startTime;
      const userStatus = userMeetingStatus[m.id] || 'unconfirmed';
      return {
        id: m.id,
        title: m.title || `Meeting with ${m.speaker_name || m.requester_name || 'User'}`,
        description: m.notes || m.message,
        startTime: meetingStartTime,
        endTime: m.end_time || (meetingStartTime ? addMinutes(parseEventISO(meetingStartTime), m.duration_minutes || 15).toISOString() : ''),
        participants: m.speaker_name ? [m.speaker_name] : [],
        status: userStatus as 'confirmed' | 'unconfirmed',
        location: m.location || m.meeting_location || 'TBD',
        type: 'meeting' as const,
        duration: m.duration_minutes || 15,
        isAgendaEvent: false,
        meeting_request_id: m.meeting_request_id,
        speaker_id: m.speaker_id,
        requester_id: m.requester_id,
        speaker_name: m.speaker_name,
        requester_name: m.requester_name,
        meeting_type: m.meeting_type,
        scheduled_at: meetingStartTime,
        duration_minutes: m.duration_minutes || 15,
        created_at: m.created_at,
        updated_at: m.updated_at,
      } as Meeting & { isAgendaEvent?: boolean };
    });

    // Combine agenda events and personal meetings
    return [...dbMeetings, ...personalMeetings];
  }, [dbMeetings, meetings, userMeetingStatus]);

  // Generate schedule data for BSL 2025 (Nov 12-14)
  const schedule = useMemo(() => {
    const days: DaySchedule[] = [];
    let currentDate = new Date(BSL_2025_DATES.start);

    while (currentDate <= BSL_2025_DATES.end) {
      const slots = generateTimeSlots(currentDate, allMeetings);
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
  }, [allMeetings]);

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

  // Handle schedule slot confirmation/unconfirmation
  const handleToggleConfirmation = async (meeting: Meeting, slotStartTime: Date) => {
    if (!user) return;
    
    setIsConfirming(true);
    const isAgendaEvent = (meeting as any).isAgendaEvent;
    const isFreeSlot = (meeting as any).isFreeSlot;
    
    // Handle free slots differently
    if (isFreeSlot) {
      const slotKey = slotStartTime.toISOString();
      const currentStatus = userFreeSlotStatus[slotKey] || 'available';
      // Toggle between available and interested for free slots
      const newStatus = currentStatus === 'available' ? 'interested' : 'available';
      
      try {
        const { data: existing } = await supabase
          .from('user_agenda_status')
          .select('id')
          .eq('user_id', user.id)
          .eq('slot_time', slotStartTime.toISOString())
          .is('agenda_id', null)
          .is('meeting_id', null)
          .maybeSingle();

        if (existing) {
          // Update existing entry (including when going back to available)
          const { error } = await supabase
            .from('user_agenda_status')
            .update({
              slot_status: newStatus,
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
          if (error) throw error;
          
          if (newStatus === 'available') {
            setUserFreeSlotStatus(prev => {
              const next = { ...prev };
              delete next[slotKey];
              return next;
            });
          } else {
            setUserFreeSlotStatus(prev => ({
              ...prev,
              [slotKey]: newStatus,
            }));
          }
        } else {
          // Insert new tracking entry
          const { error } = await supabase
            .from('user_agenda_status')
            .insert({
              user_id: user.id,
              slot_time: slotStartTime.toISOString(),
              event_id: 'bsl2025',
              status: newStatus,
              slot_status: newStatus,
            });
          if (error) throw error;
          
          setUserFreeSlotStatus(prev => ({
            ...prev,
            [slotKey]: newStatus,
          }));
        }

        setConfirmationModal({ visible: false, meeting: null, slotStartTime: null });
      } catch (error) {
        console.error('Error toggling free slot status:', error);
        showError('Error', `Failed to ${newStatus === 'interested' ? 'mark as interested' : 'clear status'}`);
      } finally {
        setIsConfirming(false);
      }
      return;
    }
    
    const currentStatus = isAgendaEvent 
      ? (userAgendaStatus[meeting.id] || 'tentative')
      : (userMeetingStatus[meeting.id] || 'tentative');
    const newStatus = currentStatus === 'confirmed' ? 'tentative' : 'confirmed';
    
    try {
      if (isAgendaEvent) {
        // Handle agenda event
        const { data: existing } = await supabase
          .from('user_agenda_status')
          .select('id')
          .eq('user_id', user.id)
          .eq('agenda_id', meeting.id)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('user_agenda_status')
            .update({
              status: newStatus,
              confirmed_at: newStatus === 'confirmed' ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
          
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('user_agenda_status')
            .insert({
              user_id: user.id,
              agenda_id: meeting.id,
              event_id: 'bsl2025',
              status: newStatus,
              confirmed_at: newStatus === 'confirmed' ? new Date().toISOString() : null,
            });
          
          if (error) throw error;
        }

        setUserAgendaStatus(prev => ({
          ...prev,
          [meeting.id]: newStatus,
        }));

        setDbMeetings(prev => prev.map(m => 
          m.id === meeting.id 
            ? { ...m, status: newStatus as 'confirmed' | 'tentative' }
            : m
        ));
      } else {
        // Handle personal meeting
        const { data: existing } = await supabase
          .from('user_agenda_status')
          .select('id')
          .eq('user_id', user.id)
          .eq('meeting_id', meeting.id)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('user_agenda_status')
            .update({
              status: newStatus,
              confirmed_at: newStatus === 'confirmed' ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
          
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('user_agenda_status')
            .insert({
              user_id: user.id,
              meeting_id: meeting.id,
              event_id: 'bsl2025',
              status: newStatus,
              confirmed_at: newStatus === 'confirmed' ? new Date().toISOString() : null,
            });
          
          if (error) throw error;
        }

        setUserMeetingStatus(prev => ({
          ...prev,
          [meeting.id]: newStatus,
        }));
      }

      // Close modal
      setConfirmationModal({ visible: false, meeting: null, slotStartTime: null });
    } catch (error) {
      console.error('Error toggling confirmation:', error);
      showError('Error', `Failed to ${newStatus === 'confirmed' ? 'confirm' : 'unconfirm'} event`);
    } finally {
      setIsConfirming(false);
    }
  };

  // Handle free slot blocked status
  const handleToggleFreeSlotBlocked = async (slotStartTime: Date) => {
    if (!user) return;
    
    setIsConfirming(true);
    const slotKey = slotStartTime.toISOString();
    const currentStatus = userFreeSlotStatus[slotKey] || 'available';
    const newStatus = currentStatus === 'blocked' ? 'available' : 'blocked';
    
    try {
      const { data: existing } = await supabase
        .from('user_agenda_status')
        .select('id')
        .eq('user_id', user.id)
        .eq('slot_time', slotStartTime.toISOString())
        .is('agenda_id', null)
        .is('meeting_id', null)
        .maybeSingle();

      if (existing) {
        // Update existing entry (including when going back to available)
        const { error } = await supabase
          .from('user_agenda_status')
          .update({
            slot_status: newStatus,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw error;
        
        if (newStatus === 'available') {
          setUserFreeSlotStatus(prev => {
            const next = { ...prev };
            delete next[slotKey];
            return next;
          });
        } else {
          setUserFreeSlotStatus(prev => ({
            ...prev,
            [slotKey]: newStatus,
          }));
        }
      } else {
        const { error } = await supabase
          .from('user_agenda_status')
          .insert({
            user_id: user.id,
            slot_time: slotStartTime.toISOString(),
            event_id: 'bsl2025',
            status: newStatus,
            slot_status: newStatus,
          });
        if (error) throw error;
        
        setUserFreeSlotStatus(prev => ({
          ...prev,
          [slotKey]: newStatus,
        }));
      }

      setConfirmationModal({ visible: false, meeting: null, slotStartTime: null });
    } catch (error) {
      console.error('Error toggling free slot blocked status:', error);
      showError('Error', `Failed to ${newStatus === 'blocked' ? 'block' : 'unblock'} slot`);
    } finally {
      setIsConfirming(false);
    }
  };

  // Handle favorite toggle for confirmed agenda events
  const handleToggleFavorite = async (meeting: Meeting) => {
    if (!user) return;
    
    const isAgendaEvent = (meeting as any).isAgendaEvent;
    if (!isAgendaEvent) return; // Only for agenda events
    
    const currentFavorite = favoriteStatus[meeting.id] || false;
    const newFavorite = !currentFavorite;
    
    // Provide haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const { data: existing } = await supabase
        .from('user_agenda_status')
        .select('id')
        .eq('user_id', user.id)
        .eq('agenda_id', meeting.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_agenda_status')
          .update({
            is_favorite: newFavorite,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Create entry for tentative event with favorite status
        const currentStatus = userAgendaStatus[meeting.id] || 'tentative';
        const { error } = await supabase
          .from('user_agenda_status')
          .insert({
            user_id: user.id,
            agenda_id: meeting.id,
            event_id: 'bsl2025',
            status: currentStatus,
            is_favorite: newFavorite,
          });
        if (error) throw error;
      }

      setFavoriteStatus(prev => ({
        ...prev,
        [meeting.id]: newFavorite,
      }));
      
      // Show appropriate message based on action
      if (newFavorite) {
        showSuccess('Added to favorites');
      } else {
        showWarning('Removed from favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showError('Error', `Failed to ${newFavorite ? 'add to' : 'remove from'} favorites`);
    }
  };

  // Show confirmation modal
  const showConfirmationModal = (meeting: Meeting, slotStartTime: Date) => {
    setConfirmationModal({
      visible: true,
      meeting,
      slotStartTime,
    });
  };

  // Render a single time slot
  const renderTimeSlot = (slot: TimeSlot) => {
    const isExpanded = expandedHours[format(slot.startTime, 'h a')];

    if (slot.meeting) {
      const meeting = slot.meeting;
      const isAgendaEvent = (meeting as any).isAgendaEvent;
      // Get actual status from user schedule status
      const userStatus = isAgendaEvent 
        ? (userAgendaStatus[meeting.id] || 'tentative')
        : (userMeetingStatus[meeting.id] || 'tentative');
      const isTentative = userStatus === 'tentative';
      const isConfirmed = userStatus === 'confirmed';
      const isFav = favoriteStatus[meeting.id] || false;
      const statusColor = isConfirmed ? '#2E7D32' :
                         meeting.status === 'in_progress' ? '#F57F17' : 
                         isTentative ? '#FF9800' : '#C62828';
      const statusBgColor = `${statusColor}20`;
      
      const handlePress = () => {
        // Show confirmation modal for all slots
        showConfirmationModal(meeting, slot.startTime);
      };

      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity 
            onPress={handlePress} 
            activeOpacity={0.8} 
            style={[
              styles.meetingSlot,
              {
                flex: 1,
                backgroundColor: isDark ? colors.surface : '#F8F9FA',
                borderLeftColor: isTentative ? '#FF9800' : colors.success.main,
                shadowColor: '#000000',
                shadowOpacity: isDark ? 0.2 : 0.05,
                shadowOffset: { width: 0, height: 1 },
                shadowRadius: 2,
                elevation: isDark ? 3 : 1,
              }
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.meetingTime, { color: colors.text.secondary }]}>
                {format(slot.startTime, 'h:mm a')}
              </Text>
              <View style={[styles.statusIndicator, { backgroundColor: statusBgColor }]}> 
                <Text style={[styles.statusText, { color: statusColor }]}> 
                  {userStatus.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={[styles.meetingTitle, { color: colors.text.primary }]}> 
              {meeting.title}
            </Text>
            <Text style={[styles.meetingLocation, { color: colors.text.secondary }]}> 
              {meeting.location}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MaterialIcons
                  name={isConfirmed ? 'check-circle' : 'radio-button-unchecked'}
                  size={18}
                  color={isConfirmed ? colors.success.main : colors.text.secondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={{ 
                  color: isConfirmed ? colors.success.main : colors.text.secondary,
                  fontSize: 13 
                }}>
                  {isConfirmed ? 'Confirmed attendance' : 'Tap to confirm attendance'}
                </Text>
              </View>
                  {/* Favorite button for agenda events (confirmed or tentative) */}
                  {isAgendaEvent && (
                    <TouchableOpacity
                      onPress={() => handleToggleFavorite(meeting)}
                      style={{ padding: 4 }}
                    >
                      <MaterialIcons
                        name={isFav ? 'star' : 'star-border'}
                        size={20}
                        color={isFav ? '#FFD700' : colors.text.secondary}
                      />
                    </TouchableOpacity>
                  )}
            </View>
            {(meeting?.participants?.length ?? 0) > 0 && (
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
                  {meeting?.participants?.join(', ')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          {/* Show + icon for TENTATIVE slots - same style as free slots */}
          {isTentative && (() => {
            const slotKey = slot.startTime.toISOString();
            const freeSlotStatus = userFreeSlotStatus[slotKey] || 'available';
            const isTracked = freeSlotStatus !== 'available';
            
            const handleTentativeSlotFreeSlotPress = () => {
              // Show modal for free slot to mark as interested/blocked/tentative
              setConfirmationModal({
                visible: true,
                meeting: {
                  id: `free-slot-${slotKey}`,
                  title: 'Free Slot',
                  location: 'Available',
                  startTime: slot.startTime.toISOString(),
                  endTime: slot.endTime.toISOString(),
                  status: freeSlotStatus as any,
                  type: 'meeting',
                  isFreeSlot: true,
                } as Meeting & { isFreeSlot?: boolean },
                slotStartTime: slot.startTime,
              });
            };
            
            return (
              <TouchableOpacity
                onPress={handleTentativeSlotFreeSlotPress}
                style={[
                  styles.emptySlot,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    borderColor: isTracked 
                      ? (freeSlotStatus === 'interested' ? colors.primary : colors.text.secondary)
                      : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'),
                    borderWidth: isTracked ? 2 : 1,
                    shadowColor: '#000000',
                    shadowOpacity: isDark ? 0.15 : 0.05,
                    shadowOffset: { width: 0, height: 1 },
                    shadowRadius: 2,
                    elevation: isDark ? 2 : 1,
                    width: 60,
                    marginBottom: 0,
                    position: 'relative',
                  }
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.meetingTime, { 
                  color: colors.text.secondary,
                  position: 'absolute',
                  top: 4,
                  left: 4,
                }]}>
                  {format(slot.startTime, 'h:mm a')}
                </Text>
                <MaterialIcons
                  name={
                    freeSlotStatus === 'interested' ? 'favorite' :
                    freeSlotStatus === 'blocked' ? 'block' :
                    freeSlotStatus === 'tentative' ? 'schedule' :
                    'add-circle-outline'
                  }
                  size={20}
                  color={
                    freeSlotStatus === 'interested' ? colors.primary :
                    freeSlotStatus === 'blocked' ? colors.error.main :
                    freeSlotStatus === 'tentative' ? '#FF9800' :
                    colors.primary
                  }
                />
                {isTracked && (
                  <Text style={[styles.freeSlotLabel, { 
                    color: freeSlotStatus === 'interested' ? colors.primary :
                           freeSlotStatus === 'blocked' ? colors.error.main :
                           '#FF9800',
                    fontSize: 8,
                  }]}>
                    {freeSlotStatus === 'interested' ? 'INT' :
                     freeSlotStatus === 'blocked' ? 'BLK' :
                     'TEN'}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })()}
        </View>
      );
    }

    // Check if this free slot has been tracked
    const slotKey = slot.startTime.toISOString();
    const freeSlotStatus = userFreeSlotStatus[slotKey] || 'available';
    const isTracked = freeSlotStatus !== 'available';
    
    const handleFreeSlotPress = () => {
      // Show modal for free slot to mark as interested/blocked/tentative
      setConfirmationModal({
        visible: true,
        meeting: {
          id: `free-slot-${slotKey}`,
          title: 'Free Slot',
          location: 'Available',
          startTime: slot.startTime.toISOString(),
          endTime: slot.endTime.toISOString(),
          status: freeSlotStatus as any,
          type: 'meeting',
          isFreeSlot: true,
        } as Meeting & { isFreeSlot?: boolean },
        slotStartTime: slot.startTime,
      });
    };

    return (
      <TouchableOpacity
        style={[
          styles.emptySlot,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
            borderColor: isTracked 
              ? (freeSlotStatus === 'interested' ? colors.primary : colors.text.secondary)
              : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'),
            borderWidth: isTracked ? 2 : 1,
            shadowColor: '#000000',
            shadowOpacity: isDark ? 0.15 : 0.05,
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 2,
            elevation: isDark ? 2 : 1,
            position: 'relative',
          }
        ]}
        onPress={handleFreeSlotPress}
      >
        <Text style={[styles.meetingTime, { 
          color: colors.text.secondary,
          position: 'absolute',
          top: 4,
          left: 4,
        }]}>
          {format(slot.startTime, 'h:mm a')}
        </Text>
        <MaterialIcons
          name={
            freeSlotStatus === 'interested' ? 'favorite' :
            freeSlotStatus === 'blocked' ? 'block' :
            freeSlotStatus === 'tentative' ? 'schedule' :
            'add-circle-outline'
          }
          size={20}
          color={
            freeSlotStatus === 'interested' ? colors.primary :
            freeSlotStatus === 'blocked' ? colors.error.main :
            freeSlotStatus === 'tentative' ? '#FF9800' :
            colors.primary
          }
        />
        {isTracked && (
          <Text style={[styles.freeSlotLabel, { 
            color: freeSlotStatus === 'interested' ? colors.primary :
                   freeSlotStatus === 'blocked' ? colors.error.main :
                   '#FF9800'
          }]}>
            {freeSlotStatus === 'interested' ? 'Interested' :
             freeSlotStatus === 'blocked' ? 'Blocked' :
             'Tentative'}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  // Render hour group
  const renderHourGroup = (hour: string, slots: TimeSlot[]) => {
    const hasMeetings = slots.some(slot => slot.meeting);
    
    // Count tracked slots: confirmed events, blocked slots, and interested slots
    let trackedCount = 0;
    slots.forEach(slot => {
      const slotKey = slot.startTime.toISOString();
      const freeSlotStatus = userFreeSlotStatus[slotKey] || 'available';
      const hasFreeSlotStatus = freeSlotStatus === 'blocked' || freeSlotStatus === 'interested';
      
      if (slot.meeting) {
        const isAgendaEvent = (slot.meeting as any).isAgendaEvent;
        const userStatus = isAgendaEvent 
          ? (userAgendaStatus[slot.meeting.id] || 'tentative')
          : (userMeetingStatus[slot.meeting.id] || 'tentative');
        
        // Count if event is confirmed OR if free slot has status (even if event is tentative)
        if (userStatus === 'confirmed' || hasFreeSlotStatus) {
          trackedCount++;
        }
      } else {
        // Free slot without meeting
        if (hasFreeSlotStatus) {
          trackedCount++;
        }
      }
    });
    
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
                {trackedCount}/{totalSlots}
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

        {/* My Meetings moved to dedicated page: /events/bsl2025/networking/my-meetings */}
      </ScrollView>

      {/* Confirmation Modal */}
      {confirmationModal.meeting && confirmationModal.slotStartTime && (
        <ScheduleConfirmationModal
          visible={confirmationModal.visible}
          title={confirmationModal.meeting.title || 'Untitled Event'}
          location={confirmationModal.meeting.location}
          startTime={confirmationModal.slotStartTime}
          isConfirmed={(confirmationModal.meeting as any).isFreeSlot
            ? (userFreeSlotStatus[confirmationModal.slotStartTime.toISOString()] || 'available') === 'interested'
            : (confirmationModal.meeting as any).isAgendaEvent
            ? (userAgendaStatus[confirmationModal.meeting.id] || 'tentative') === 'confirmed'
            : (userMeetingStatus[confirmationModal.meeting.id] || 'tentative') === 'confirmed'}
          onConfirm={() => handleToggleConfirmation(confirmationModal.meeting!, confirmationModal.slotStartTime!)}
          onCancel={() => setConfirmationModal({ visible: false, meeting: null, slotStartTime: null })}
          isLoading={isConfirming}
          isFreeSlot={(confirmationModal.meeting as any).isFreeSlot}
          freeSlotStatus={userFreeSlotStatus[confirmationModal.slotStartTime.toISOString()] || 'available'}
          isAgendaEvent={(confirmationModal.meeting as any).isAgendaEvent}
          isFavorite={favoriteStatus[confirmationModal.meeting.id] || false}
          onToggleFavorite={() => confirmationModal.meeting && handleToggleFavorite(confirmationModal.meeting)}
          onToggleBlocked={() => handleToggleFreeSlotBlocked(confirmationModal.slotStartTime!)}
        />
      )}
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
    position: 'relative',
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
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  freeSlotLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
  },
});

export default MySchedule;
