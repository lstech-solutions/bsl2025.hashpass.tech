// Event Detection Utility
// This utility detects available events based on the current deployment context

import { EventConfig } from '../config/events';

export interface EventInfo extends Omit<EventConfig, 'name' | 'domain'> {
  title: string;
  subtitle: string;
  image: string;
  color: string;
  route: string;
  available: boolean;
}

// Available events configuration
// In branch-based deployments, only the current event will be available
// In main repo, all events will be available
export const AVAILABLE_EVENTS: EventInfo[] = [
  {
    id: 'bsl2025',
    title: 'Blockchain Summit Latam 2025',
    subtitle: 'Universidad EAFIT, Medellín',
    image: 'https://blockchainsummit.la/wp-content/uploads/2025/09/bsl2025-banner.jpg',
    color: '#2196F3',
    route: '/events/bsl2025/home',
    available: true, // Always available in BSL2025 branch
    api: {
      basePath: '/api/bslatam',
      endpoints: {
        agenda: '/agenda',
        speakers: '/speakers',
        bookings: '/bookings',
      },
    },
    routes: {
      home: '/events/bsl2025/home',
      speakers: '/events/bsl2025/speakers',
      bookings: '/events/bsl2025/bookings',
    },
    features: [],
    branding: {
      primaryColor: '#2196F3',
      logo: '/assets/logos/bsl-logo.png',
    },
  },
  // Future events - only available in main repo
  // {
  //   id: 'event2026',
  //   title: 'Future Event 2026',
  //   subtitle: 'Coming Soon',
  //   image: 'https://example.com/banner.jpg',
  //   color: '#2196F3',
  //   route: '/events/event2026/home',
  //   available: process.env.NODE_ENV === 'development' || process.env.BRANCH === 'main',
  // }
];

// Get available events based on current context
export const getAvailableEvents = (): EventInfo[] => {
  return AVAILABLE_EVENTS.filter(event => event.available);
};

// Get current event from route or context
export const getCurrentEvent = (eventId?: string): EventInfo | null => {
  if (eventId) {
    return AVAILABLE_EVENTS.find(e => e.id === eventId) || null;
  }
  
  // Default to BSL2025 if no event specified
  return AVAILABLE_EVENTS.find(e => e.id === 'bsl2025') || null;
};

// Check if event selector should be shown
export const shouldShowEventSelector = (): boolean => {
  return getAvailableEvents().length > 1;
};

// Get event-specific quick access items
export const getEventQuickAccessItems = (eventId: string) => {
  switch (eventId) {
    case 'bsl2025':
      return [
        {
          id: 'speakers',
          title: 'Featured Speakers',
          subtitle: 'Meet the experts',
          icon: 'people',
          color: '#007AFF',
          route: '/events/bsl2025/speakers/calendar'
        },
        {
          id: 'networking',
          title: 'Networking Center',
          subtitle: 'Connect & meet',
          icon: 'people-alt',
          color: '#4CAF50',
          route: '/events/bsl2025/networking'
        },
        {
          id: 'agenda',
          title: 'Event Agenda',
          subtitle: '3 Days Schedule',
          icon: 'event',
          color: '#34A853',
          route: '/events/bsl2025/agenda'
        },
        {
          id: 'event-info',
          title: 'Event Information',
          subtitle: 'Details & Logistics',
          icon: 'info',
          color: '#FF9500',
          route: '/events/bsl2025/event-info'
        }
      ];
    
    default:
      // Default items for other events
      return [
        {
          id: 'speakers',
          title: 'Speakers',
          subtitle: 'Meet the experts',
          icon: 'people',
          color: '#007AFF',
          route: `/events/${eventId}/speakers`
        },
        {
          id: 'agenda',
          title: 'Agenda',
          subtitle: 'Event Schedule',
          icon: 'event',
          color: '#34A853',
          route: `/events/${eventId}/agenda`
        },
        {
          id: 'info',
          title: 'Event Info',
          subtitle: 'Details & Logistics',
          icon: 'info',
          color: '#FF9500',
          route: `/events/${eventId}/info`
        }
      ];
  }
};