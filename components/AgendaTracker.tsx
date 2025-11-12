import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useRouter } from 'expo-router';
import { apiClient } from '../lib/api-client';
import { AgendaItem, parseEventISO, formatTimeRange } from '../types/agenda';

interface AgendaTrackerProps {
  eventId?: string;
  backgroundColor?: string;
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
}

export default function AgendaTracker({ 
  eventId = 'bsl2025',
  backgroundColor = '#007AFF'
}: AgendaTrackerProps) {
  const { isDark, colors } = useTheme();
  const router = useRouter();
  const styles = getStyles(isDark, colors, backgroundColor);
  
  const [currentEvent, setCurrentEvent] = useState<AgendaItem | null>(null);
  const [nextEvent, setNextEvent] = useState<AgendaItem | null>(null);
  const [timeToNext, setTimeToNext] = useState<TimeLeft>({ hours: 0, minutes: 0, seconds: 0 });
  const [loading, setLoading] = useState(true);

  // Load agenda and find current/next events
  useEffect(() => {
    const loadAgenda = async () => {
      try {
        setLoading(true);
        const response = await apiClient.request('agenda', {
          params: { eventId }
        });
        
        let agendaData: AgendaItem[] = [];
        // Handle apiClient response format: { success, data, error }
        if (response.success && response.data) {
          if (Array.isArray(response.data)) {
            agendaData = response.data;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            agendaData = response.data.data;
          }
        } else if (Array.isArray(response)) {
          agendaData = response;
        } else if (response?.data) {
          agendaData = Array.isArray(response.data) ? response.data : response.data.data || [];
        }

        if (agendaData.length === 0) {
          setLoading(false);
          return;
        }

        const now = new Date();
        
        // Find current event (happening now)
        const current = agendaData.find(item => {
          if (!item.time) return false;
          
          // Try to parse time range format "HH:MM - HH:MM"
          const timeMatch = item.time.trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
          if (timeMatch) {
            const startHour = parseInt(timeMatch[1], 10);
            const startMin = parseInt(timeMatch[2], 10);
            const endHour = parseInt(timeMatch[3], 10);
            const endMin = parseInt(timeMatch[4], 10);
            
            // Create date objects for today with the parsed times
            const today = new Date();
            const startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, startMin);
            const endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endHour, endMin);
            
            return now >= startTime && now <= endTime;
          }
          
          // Try ISO format
          try {
            const eventTime = parseEventISO(item.time);
            if (isNaN(eventTime.getTime())) return false;
            
            const startTime = eventTime;
            const duration = (item as any).duration_minutes || 60;
            const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
            
            return now >= startTime && now <= endTime;
          } catch {
            return false;
          }
        });

        // Find next event (upcoming)
        const upcoming = agendaData
          .filter(item => {
            if (!item.time) return false;
            
            // Try to parse time range format
            const timeMatch = item.time.trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
            if (timeMatch) {
              const startHour = parseInt(timeMatch[1], 10);
              const startMin = parseInt(timeMatch[2], 10);
              const today = new Date();
              const startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, startMin);
              return startTime > now;
            }
            
            // Try ISO format
            try {
              const eventTime = parseEventISO(item.time);
              if (isNaN(eventTime.getTime())) return false;
              return eventTime > now;
            } catch {
              return false;
            }
          })
          .sort((a, b) => {
            const getStartTime = (item: AgendaItem): Date | null => {
              const timeMatch = item.time?.trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
              if (timeMatch) {
                const startHour = parseInt(timeMatch[1], 10);
                const startMin = parseInt(timeMatch[2], 10);
                const today = new Date();
                return new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, startMin);
              }
              try {
                return parseEventISO(item.time || '');
              } catch {
                return null;
              }
            };
            
            const timeA = getStartTime(a);
            const timeB = getStartTime(b);
            if (!timeA || !timeB) return 0;
            return timeA.getTime() - timeB.getTime();
          })[0] || null;

        setCurrentEvent(current || null);
        setNextEvent(upcoming || null);
      } catch (error) {
        console.error('Error loading agenda:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAgenda();
    // Refresh every minute
    const interval = setInterval(loadAgenda, 60000);
    return () => clearInterval(interval);
  }, [eventId]);

  // Calculate time to next event
  useEffect(() => {
    if (!nextEvent || !nextEvent.time) {
      setTimeToNext({ hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      let startTime: Date | null = null;
      
      // Try to parse time range format
      const timeMatch = nextEvent.time!.trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
      if (timeMatch) {
        const startHour = parseInt(timeMatch[1], 10);
        const startMin = parseInt(timeMatch[2], 10);
        const today = new Date();
        startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, startMin);
      } else {
        // Try ISO format
        try {
          startTime = parseEventISO(nextEvent.time!);
          if (isNaN(startTime.getTime())) {
            startTime = null;
          }
        } catch {
          startTime = null;
        }
      }
      
      if (!startTime) {
        setTimeToNext({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      const diff = startTime.getTime() - now.getTime();

      if (diff > 0) {
        setTimeToNext({
          hours: Math.floor(diff / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000)
        });
      } else {
        setTimeToNext({ hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [nextEvent]);

  const formatTime = (time: TimeLeft): string => {
    if (time.hours > 0) {
      return `${time.hours}h ${time.minutes}m`;
    }
    return `${time.minutes}m ${time.seconds}s`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading agenda...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Current Event */}
      {currentEvent ? (
        <View style={styles.currentEventContainer}>
          <View style={styles.eventIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveLabel}>NOW</Text>
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle} numberOfLines={2}>
              {currentEvent.title || 'Current Event'}
            </Text>
            {currentEvent.time && (
              <Text style={styles.eventTime}>
                {formatTimeRange(currentEvent)}
              </Text>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.noCurrentEventContainer}>
          <Text style={styles.noEventText}>No event currently happening</Text>
        </View>
      )}

      {/* Next Event */}
      {nextEvent && (
        <TouchableOpacity 
          style={styles.nextEventContainer}
          onPress={() => router.push('/events/bsl2025/agenda')}
          activeOpacity={0.7}
        >
          <View style={styles.nextEventHeader}>
            <MaterialIcons name="schedule" size={16} color="#FFFFFF" />
            <Text style={styles.nextEventLabel}>Next Event</Text>
          </View>
          <View style={styles.nextEventContent}>
            <View style={styles.nextEventInfo}>
              <Text style={styles.nextEventTitle} numberOfLines={2}>
                {nextEvent.title || 'Upcoming Event'}
              </Text>
              {nextEvent.time && (
                <Text style={styles.nextEventTime}>
                  {formatTimeRange(nextEvent)}
                </Text>
              )}
            </View>
            <View style={styles.timerContainer}>
              <Text style={styles.timerLabel}>Starts in:</Text>
              <Text style={styles.timerValue}>{formatTime(timeToNext)}</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#FFFFFF" style={styles.chevron} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const getStyles = (isDark: boolean, colors: any, backgroundColor: string) => StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 8,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    padding: 12,
  },
  currentEventContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  eventIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 6,
  },
  liveLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventTime: {
    color: '#E3F2FD',
    fontSize: 12,
  },
  noCurrentEventContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  noEventText: {
    color: '#E3F2FD',
    fontSize: 14,
    fontStyle: 'italic',
  },
  nextEventContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  nextEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  nextEventLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  nextEventContent: {
    flex: 1,
  },
  nextEventInfo: {
    marginBottom: 8,
  },
  nextEventTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  nextEventTime: {
    color: '#E3F2FD',
    fontSize: 12,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timerLabel: {
    color: '#BBDEFB',
    fontSize: 11,
    marginRight: 6,
  },
  timerValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  chevron: {
    marginLeft: 8,
  },
});

