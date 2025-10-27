// Version Configuration for BSL 2025 HashPass App
// Semantic Versioning: MAJOR.MINOR.PATCH

import packageJson from '../package.json';

export interface VersionInfo {
  version: string;
  buildNumber: number;
  releaseDate: string;
  releaseType: 'stable' | 'beta' | 'rc' | 'alpha';
  environment: 'development' | 'staging' | 'production';
  features: string[];
  bugfixes: string[];
  breakingChanges: string[];
  notes: string;
}

export interface VersionHistory {
  [version: string]: VersionInfo;
}

// Current Version Configuration - Auto-synced with package.json
export const CURRENT_VERSION: VersionInfo = {
  version: packageJson.version,
  buildNumber: 202510272149, // Updated to current timestamp
  releaseDate: '2025-10-27',
  releaseType: 'beta',
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  features: [
    'User pass management system',
    'BSL 2025 event integration',
    'Speaker profile system with avatars',
    'Event agenda with live updates',
    'Unified search and filter system',
    'Dark mode support',
    'Event banner component',
    'Pass card UI with BSL branding',
    'Agenda tabbed interface',
    'Real-time countdown system',
    'Meeting request system with Supabase integration',
    'Speaker availability and booking system',
    'Complete networking center with horizontal scrolling',
    'My Requests view for managing sent meeting requests',
    'My Schedule view for scheduled meetings',
    'System Analytics with comprehensive statistics',
    'Blocked Users management system',
    'Horizontal scrolling quick access menu',
    'Enhanced networking statistics and insights',
    'Speaker dashboard for incoming request management',
    'Real-time networking activity tracking',
    'Automated version management and changelog updates'
  ],
  bugfixes: [
    'Fixed SVG logo rendering issues',
    'Resolved TypeScript undefined property errors',
    'Fixed agenda data grouping logic',
    'Corrected speaker count discrepancies',
    'Fixed dark mode contrast issues',
    'Resolved navigation routing problems',
    'Fixed React Navigation headerBackTitleVisible property error',
    'Fixed headerStyle borderBottomWidth property error',
    'Fixed pass number display showing "unknown" in explorer view',
    'Fixed speaker dashboard loading stuck issue',
    'Fixed get_speaker_meeting_requests SQL GROUP BY error',
    'Improved networking icon visibility in quick access menu',
    'Updated version display and changelog automation',
    'Fixed version history dates and formatting'
  ],
  breakingChanges: [],
  notes: 'Updated version display and changelog automation with fixed version history'
};

// Version History
export const VERSION_HISTORY: VersionHistory = {
  '1.3.2': {
    version: '1.3.2',
    buildNumber: 202510272149,
    releaseDate: '2025-10-27',
    releaseType: 'beta',
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    features: [
      'Automated version management and changelog updates',
      'Improved version display in UI'
    ],
    bugfixes: [
      'Fixed version history dates and formatting',
      'Updated version display to show correct information'
    ],
    breakingChanges: [],
    notes: 'Updated version display and changelog automation with fixed version history'
  },
  '1.2.9': {
    version: '1.2.9',
    buildNumber: 202510261852,
    releaseDate: '2025-10-26',
    releaseType: 'beta',
    environment: 'production',
    features: [],
    bugfixes: [
      'Fixed TypeScript error where "event" was possibly null in agenda.tsx',
      'Updated dependency array to use optional chaining for event.agenda'
    ],
    breakingChanges: [],
    notes: 'Fixed TypeScript errors and improved error handling'
  },
  '1.2.3': {
    version: '1.2.3',
    buildNumber: 202510181800,
    releaseDate: '2025-10-18',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Complete networking center with horizontal scrolling',
      'My Requests view for managing sent meeting requests',
      'My Schedule view for scheduled meetings',
      'System Analytics with comprehensive statistics',
      'Blocked Users management system',
      'Enhanced networking statistics and insights',
      'Speaker dashboard for incoming request management',
      'Real-time networking activity tracking'
    ],
    bugfixes: [],
    breakingChanges: [],
    notes: 'Major networking system update with comprehensive meeting request management and analytics'
  },
  '1.2.2': {
    version: '1.2.2',
    buildNumber: 202510151600,
    releaseDate: '2025-10-15',
    releaseType: 'beta',
    environment: 'production',
    features: [],
    bugfixes: [
      'Fixed critical 404 errors in Supabase meeting request system',
      'Resolved database type mismatches',
      'Fixed Lambda deployment parameter issues',
      'Updated AWS SDK to v3 for better performance',
      'Resolved CloudFormation stack deployment errors',
      'Fixed 404 errors in Supabase database functions',
      'Resolved UUID/TEXT type mismatch in meeting request system',
      'Fixed can_make_meeting_request function type casting issues',
      'Updated database functions to handle mixed column types properly'
    ],
    breakingChanges: [],
    notes: 'Fixed critical 404 errors in Supabase meeting request system and resolved database type mismatches'
  },
  '1.2.1': {
    version: '1.2.1',
    buildNumber: 202510151510,
    releaseDate: '2025-10-15',
    releaseType: 'beta',
    environment: 'production',
    features: [],
    bugfixes: [
      'Fixed React Navigation headerBackTitleVisible property error',
      'Fixed headerStyle borderBottomWidth property error',
      'Fixed pass number display showing "unknown" in explorer view',
      'Fixed speaker dashboard loading stuck issue',
      'Fixed get_speaker_meeting_requests SQL GROUP BY error',
      'Improved networking icon visibility in quick access menu'
    ],
    breakingChanges: [],
    notes: 'UI display fixes and automatic version management'
  },
  '1.2.0': {
    version: '1.2.0',
    buildNumber: 202501150000,
    releaseDate: '2025-01-15',
    releaseType: 'beta',
    environment: 'production',
    features: [
      'User pass management system with database integration',
      'BSL 2025 event integration with live agenda updates',
      'Speaker profile system with avatar support and search functionality',
      'Event agenda with tabbed interface and real-time countdown',
      'Unified search and filter system across all views',
      'Dark mode support with proper contrast adjustments',
      'Event banner component for consistent branding',
      'Pass card UI with BSL2025 branding and logo seal',
      'Real-time countdown system for event timing',
      'Version tracking and display system'
    ],
    bugfixes: [
      'Fixed SVG logo rendering issues by implementing text-based fallback',
      'Resolved TypeScript undefined property errors with proper null checking',
      'Fixed agenda data grouping logic for proper day distribution',
      'Corrected speaker count discrepancies and duplicate entries',
      'Fixed dark mode contrast issues across all components',
      'Resolved navigation routing problems between views',
      'Fixed alphabetical dividers in speaker list',
      'Corrected filter and search system consistency'
    ],
    breakingChanges: [],
    notes: 'Initial beta release with core event features'
  }
};

// Version Utilities
export const getVersionInfo = (version?: string): VersionInfo => {
  if (version && VERSION_HISTORY[version]) {
    return VERSION_HISTORY[version];
  }
  return CURRENT_VERSION;
};

export const getLatestVersion = (): VersionInfo => {
  return CURRENT_VERSION;
};

export const getVersionHistory = (): VersionInfo[] => {
  return Object.values(VERSION_HISTORY).sort((a, b) => 
    new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
  );
};

export const getVersionBadgeColor = (releaseType: VersionInfo['releaseType']): string => {
  switch (releaseType) {
    case 'stable': return '#34A853';
    case 'beta': return '#007AFF';
    case 'rc': return '#FF9500';
    case 'alpha': return '#FF3B30';
    default: return '#8E8E93';
  }
};

export const getVersionBadgeText = (releaseType: VersionInfo['releaseType']): string => {
  return releaseType.toUpperCase();
};

// Environment Configuration
export const ENVIRONMENT_CONFIG = {
  development: {
    showVersion: true,
    enableAnalytics: false,
    logLevel: 'debug'
  },
  staging: {
    showVersion: true,
    enableAnalytics: true,
    logLevel: 'info'
  },
  production: {
    showVersion: false,
    enableAnalytics: true,
    logLevel: 'warn'
  }
} as const;
