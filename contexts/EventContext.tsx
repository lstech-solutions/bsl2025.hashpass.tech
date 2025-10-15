import React, { createContext, useContext, ReactNode } from 'react';
import { EventConfig } from '../config/events';
import { getCurrentEvent } from '../lib/event-detector';

interface EventContextType {
  event: EventConfig;
  hasFeature: (feature: string) => boolean;
  getApiEndpoint: (endpoint: string) => string;
  getRoute: (route: keyof EventConfig['routes']) => string;
  getBranding: () => EventConfig['branding'];
}

const EventContext = createContext<EventContextType | undefined>(undefined);

interface EventProviderProps {
  children: ReactNode;
}

export function EventProvider({ children }: EventProviderProps) {
  const event = getCurrentEvent();

  const hasFeature = (feature: string) => {
    return event.features.includes(feature);
  };

  const getApiEndpoint = (endpoint: string) => {
    return `${event.api.basePath}${endpoint}`;
  };

  const getRoute = (route: keyof EventConfig['routes']) => {
    return event.routes[route] || '/';
  };

  const getBranding = () => {
    return event.branding;
  };

  const value: EventContextType = {
    event,
    hasFeature,
    getApiEndpoint,
    getRoute,
    getBranding,
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvent(): EventContextType {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
}
