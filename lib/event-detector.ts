import { EVENTS, EventConfig, EventId } from '../config/events';

/**
 * Detects the current event based on the hostname
 * Works with your current fork-based deployment system
 */
export function getCurrentEvent(): EventConfig {
  if (typeof window === 'undefined') {
    // Server-side rendering fallback
    return EVENTS['bsl2025']; // Default to BSL2025 for this fork
  }

  const hostname = window.location.hostname;
  
  // Extract event ID from hostname
  // bsl2025.hashpass.tech -> bsl2025
  // techconf2025.hashpass.tech -> techconf2025
  const eventId = hostname.split('.')[0] as EventId;
  
  // Return the event config or default
  return EVENTS[eventId] || EVENTS['bsl2025']; // Default to BSL2025 for this fork
}

/**
 * Get event-specific API endpoint
 */
export function getEventApiEndpoint(endpoint: string): string {
  const event = getCurrentEvent();
  return `${event.api.basePath}${endpoint}`;
}

/**
 * Get event-specific route
 */
export function getEventRoute(route: keyof EventConfig['routes']): string {
  const event = getCurrentEvent();
  return event.routes[route] || '/';
}

/**
 * Check if current event has a specific feature
 */
export function hasEventFeature(feature: string): boolean {
  const event = getCurrentEvent();
  return event.features.includes(feature);
}

/**
 * Get event branding configuration
 */
export function getEventBranding() {
  const event = getCurrentEvent();
  return event.branding;
}

/**
 * Get event database configuration
 */
export function getEventDatabase() {
  const event = getCurrentEvent();
  return event.database;
}
