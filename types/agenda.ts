// Agenda related types
export type AgendaType = 'keynote' | 'panel' | 'break' | 'meal' | 'registration';

export interface AgendaItem {
  id: string;
  time: string;
  title: string;
  description?: string;
  speakers?: string[];
  type: AgendaType;
  location?: string;
}

// Helper function to get color based on agenda type
export const getAgendaTypeColor = (type: string): string => {
  switch (type) {
    case 'keynote': return '#007AFF';
    case 'panel': return '#34A853';
    case 'break': return '#FF9500';
    case 'meal': return '#FF3B30';
    case 'registration': return '#8E8E93';
    default: return '#8E8E93';
  }
};

// Helper function to get icon name based on agenda type
export const getAgendaTypeIcon = (type: string): string => {
  switch (type) {
    case 'keynote': return 'mic';
    case 'panel': return 'group';
    case 'break': return 'coffee';
    case 'meal': return 'restaurant';
    case 'registration': return 'person-add';
    default: return 'event';
  }
};

// Helper to get default duration in minutes for different agenda types
export const getDefaultDurationMinutes = (type?: string): number => {
  if (type === 'panel') return 60;
  if (type === 'keynote') return 30;
  if (type === 'break') return 15;
  if (type === 'meal') return 60;
  return 30; // Default duration
};

// Time/Date related helpers
export const formatClock = (d: Date): string => {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

// Timezone handling
export const EVENT_TZ_OFFSET = '-05:00';

export const endsWithZ = (s: string): boolean => s.endsWith('Z');
export const hasOtherOffset = (s: string): boolean => /[+-]\d{2}:?\d{0,2}$/.test(s);

export const parseEventISO = (s: string): Date => {
  if (!s) return new Date(NaN);
  if (endsWithZ(s) || hasOtherOffset(s)) return new Date(s);
  // If no timezone is specified, assume it's in the event's timezone
  return new Date(`${s}${EVENT_TZ_OFFSET}`);
};

export const formatTimeRange = (item: { time: string; duration_minutes?: number; type?: string }): string => {
  try {
    const start = parseEventISO(item.time);
    const duration = item.duration_minutes || getDefaultDurationMinutes(item.type);
    const end = new Date(start.getTime() + duration * 60 * 1000);
    return `${formatClock(start)} - ${formatClock(end)}`;
  } catch (e) {
    return item.time || '';
  }
};
