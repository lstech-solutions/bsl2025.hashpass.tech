// Version Configuration for BSL 2025 HashPass App
// Semantic Versioning: MAJOR.MINOR.PATCH

import packageJson from '../package.json';

export interface VersionInfo {
  version: string;
  buildNumber: number;
  releaseDate: string;
  releaseType: 'stable' | 'beta' | 'rc' | 'stable';
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
  buildNumber: 202510151600,
  releaseDate: '2025-10-15',
  releaseType: 'beta',
  environment: 'development',
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
    'Speaker availability and booking system'
  ],
  bugfixes: [
    'Fixed SVG logo rendering issues',
    'Resolved TypeScript undefined property errors',
    'Fixed agenda data grouping logic',
    'Corrected speaker count discrepancies',
    'Fixed dark mode contrast issues',
    'Resolved navigation routing problems',
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
};

// Version History
export const VERSION_HISTORY: VersionHistory = {
  '1.2.2': {
    version: '1.2.2',
    buildNumber: 202510151600,
    releaseDate: '2025-10-15',
    releaseType: 'beta',
    environment: 'development',
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
      'Speaker availability and booking system'
    ],
    bugfixes: [
      'Fixed SVG logo rendering issues',
      'Resolved TypeScript undefined property errors',
      'Fixed agenda data grouping logic',
      'Corrected speaker count discrepancies',
      'Fixed dark mode contrast issues',
      'Resolved navigation routing problems',
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
    environment: 'development',
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
      'Real-time countdown system'
    ],
    bugfixes: [
      'Fixed SVG logo rendering issues',
      'Resolved TypeScript undefined property errors',
      'Fixed agenda data grouping logic',
      'Corrected speaker count discrepancies',
      'Fixed dark mode contrast issues',
      'Resolved navigation routing problems',
      'Fixed Lambda deployment parameter issues',
      'Updated AWS SDK to v3 for better performance',
      'Resolved CloudFormation stack deployment errors'
    ],
    breakingChanges: [],
    notes: 'UI display fixes and automatic version management'
  },
  '1.1.9': {
    version: '1.1.9',
    buildNumber: 202510151510,
    releaseDate: '2025-10-15',
    releaseType: 'beta',
    environment: 'development',
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
      'Real-time countdown system'
    ],
    bugfixes: [
      'Fixed SVG logo rendering issues',
      'Resolved TypeScript undefined property errors',
      'Fixed agenda data grouping logic',
      'Corrected speaker count discrepancies',
      'Fixed dark mode contrast issues',
      'Resolved navigation routing problems'
    ],
    breakingChanges: [],
    notes: 'UI display fixes and automatic version management'
  },
  '1.1.8': {
    version: '1.1.8',
    buildNumber: 202510150934,
    releaseDate: '2025-10-15',
    releaseType: 'beta',
    environment: 'development',
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
      'Real-time countdown system'
    ],
    bugfixes: [
      'Fixed SVG logo rendering issues',
      'Resolved TypeScript undefined property errors',
      'Fixed agenda data grouping logic',
      'Corrected speaker count discrepancies',
      'Fixed dark mode contrast issues',
      'Resolved navigation routing problems',
      'Fixed Lambda deployment parameter issues',
      'Updated AWS SDK to v3 for better performance',
      'Resolved CloudFormation stack deployment errors'
    ],
    breakingChanges: [],
    notes: 'Lambda deployment fixes and AWS SDK v3 migration for improved stability'
  },
  [packageJson.version]: {
    version: packageJson.version,
    buildNumber: 2025011501,
    releaseDate: '2025-01-15',
    releaseType: 'beta',
    environment: 'development',
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
      'Real-time countdown system'
    ],
    bugfixes: [
      'Fixed SVG logo rendering issues',
      'Resolved TypeScript undefined property errors',
      'Fixed agenda data grouping logic',
      'Corrected speaker count discrepancies',
      'Fixed dark mode contrast issues',
      'Resolved navigation routing problems'
    ],
    breakingChanges: [],
    notes: 'Major UI overhaul with BSL 2025 branding and improved user experience'
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
    b.buildNumber - a.buildNumber
  );
};

export const getVersionBadgeColor = (releaseType: string): string => {
  switch (releaseType) {
    case 'stable': return '#34A853';
    case 'rc': return '#FF9500';
    case 'beta': return '#007AFF';
    case 'alpha': return '#FF3B30';
    default: return '#8E8E93';
  }
};

export const getVersionBadgeText = (releaseType: string): string => {
  switch (releaseType) {
    case 'stable': return 'STABLE';
    case 'rc': return 'RC';
    case 'beta': return 'BETA';
    case 'alpha': return 'ALPHA';
    default: return 'DEV';
  }
};

// Environment Configuration
export const ENVIRONMENT_CONFIG = {
  development: {
    showVersion: true,
    showDebugInfo: true,
    enableHotReload: true,
    logLevel: 'debug'
  },
  staging: {
    showVersion: true,
    showDebugInfo: false,
    enableHotReload: false,
    logLevel: 'info'
  },
  production: {
    showVersion: false,
    showDebugInfo: false,
    enableHotReload: false,
    logLevel: 'error'
  }
};

export default CURRENT_VERSION;
