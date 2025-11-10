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
  buildNumber: 202511101904, // Updated to current timestamp
  releaseDate: '2025-11-10',
  releaseType: 'beta',
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  features: [
    'Added Privacy/Terms modal component for in-app viewing',
    'Improved mobile responsiveness for theme/language switcher on auth page'
  ],
  bugfixes: [
    'Fixed theme and language switcher overlapping with auth card on mobile views',
    'Replaced navigation with modal for privacy and terms links on auth screen'
  ],
  breakingChanges: [],
  notes: 'Version 1.6.10 release'
};

// Version History
export const VERSION_HISTORY: VersionHistory = {
  '1.6.10': {
    version: '1.6.10',
    buildNumber: 202511101904,
    releaseDate: '2025-11-10',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Added Privacy/Terms modal component for in-app viewing',
      'Improved mobile responsiveness for theme/language switcher on auth page'
    ],
    bugfixes: [
      'Fixed theme and language switcher overlapping with auth card on mobile views',
      'Replaced navigation with modal for privacy and terms links on auth screen'
    ],
    breakingChanges: [],
    notes: 'Version 1.6.10 release'
  },
  '1.6.9': {
    version: '1.6.9',
    buildNumber: 202511101015,
    releaseDate: '2025-11-10',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Added Privacy/Terms modal component for in-app viewing',
      'Improved mobile responsiveness for theme/language switcher on auth page'
    ],
    bugfixes: [
      'Fixed theme and language switcher overlapping with auth card on mobile views',
      'Replaced navigation with modal for privacy and terms links on auth screen'
    ],
    breakingChanges: [],
    notes: 'Version 1.6.9 release'
  },
  '1.6.8': {
    version: '1.6.8',
    buildNumber: 202511100828,
    releaseDate: '2025-11-10',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Added Privacy/Terms modal component for in-app viewing',
      'Improved mobile responsiveness for theme/language switcher on auth page'
    ],
    bugfixes: [
      'Fixed theme and language switcher overlapping with auth card on mobile views',
      'Replaced navigation with modal for privacy and terms links on auth screen'
    ],
    breakingChanges: [],
    notes: 'Version 1.6.8 release'
  },
  '1.6.7': {
    version: '1.6.7',
    buildNumber: 202511092344,
    releaseDate: '2025-11-09',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Added Privacy/Terms modal component for in-app viewing',
      'Improved mobile responsiveness for theme/language switcher on auth page'
    ],
    bugfixes: [
      'Fixed theme and language switcher overlapping with auth card on mobile views',
      'Replaced navigation with modal for privacy and terms links on auth screen'
    ],
    breakingChanges: [],
    notes: 'Storybook'
  },
  '1.6.6': {
    version: '1.6.6',
    buildNumber: 202511092132,
    releaseDate: '2025-11-09',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Added Privacy/Terms modal component for in-app viewing',
      'Improved mobile responsiveness for theme/language switcher on auth page'
    ],
    bugfixes: [
      'Fixed theme and language switcher overlapping with auth card on mobile views',
      'Replaced navigation with modal for privacy and terms links on auth screen'
    ],
    breakingChanges: [],
    notes: 'Version 1.6.6 release'
  },
  '1.6.5': {
    version: '1.6.5',
    buildNumber: 202511081641,
    releaseDate: '2025-11-08',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Added Privacy/Terms modal component for in-app viewing',
      'Improved mobile responsiveness for theme/language switcher on auth page'
    ],
    bugfixes: [
      'Fixed theme and language switcher overlapping with auth card on mobile views',
      'Replaced navigation with modal for privacy and terms links on auth screen'
    ],
    breakingChanges: [],
    notes: 'Version 1.6.5 release'
  },
  '1.6.4': {
    version: '1.6.4',
    buildNumber: 202511080702,
    releaseDate: '2025-11-08',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Added Privacy/Terms modal component for in-app viewing',
      'Improved mobile responsiveness for theme/language switcher on auth page'
    ],
    bugfixes: [
      'Fixed theme and language switcher overlapping with auth card on mobile views',
      'Replaced navigation with modal for privacy and terms links on auth screen'
    ],
    breakingChanges: [],
    notes: 'Version 1.6.4 release'
  },
  '1.6.3': {
    version: '1.6.3',
    buildNumber: 202511072207,
    releaseDate: '2025-11-07',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Added Privacy/Terms modal component for in-app viewing',
      'Improved mobile responsiveness for theme/language switcher on auth page'
    ],
    bugfixes: [
      'Fixed theme and language switcher overlapping with auth card on mobile views',
      'Replaced navigation with modal for privacy and terms links on auth screen'
    ],
    breakingChanges: [],
    notes: 'Version 1.6.3 release'
  },
  '1.6.2': {
    version: '1.6.2',
    buildNumber: 202511072038,
    releaseDate: '2025-11-07',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Added Privacy/Terms modal component for in-app viewing',
      'Improved mobile responsiveness for theme/language switcher on auth page'
    ],
    bugfixes: [
      'Fixed theme and language switcher overlapping with auth card on mobile views',
      'Replaced navigation with modal for privacy and terms links on auth screen'
    ],
    breakingChanges: [],
    notes: 'Version 1.6.2 release'
  },
  '1.6.1': {
    version: '1.6.1',
    buildNumber: 202511072036,
    releaseDate: '2025-11-07',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Added Privacy/Terms modal component for in-app viewing',
      'Improved mobile responsiveness for theme/language switcher on auth page'
    ],
    bugfixes: [
      'Fixed theme and language switcher overlapping with auth card on mobile views',
      'Replaced navigation with modal for privacy and terms links on auth screen'
    ],
    breakingChanges: [],
    notes: 'Version 1.6.1 release'
  },
  '1.6.0': {
    version: '1.6.0',
    buildNumber: 202511070811,
    releaseDate: '2025-11-07',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Added Privacy/Terms modal component for in-app viewing',
      'Improved mobile responsiveness for theme/language switcher on auth page'
    ],
    bugfixes: [
      'Fixed theme and language switcher overlapping with auth card on mobile views',
      'Replaced navigation with modal for privacy and terms links on auth screen'
    ],
    breakingChanges: [],
    notes: 'Version 1.6.0 release'
  },
  '1.5.16': {
    version: '1.5.16',
    buildNumber: 202511070644,
    releaseDate: '2025-11-07',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Added Privacy/Terms modal component for in-app viewing',
      'Improved mobile responsiveness for theme/language switcher on auth page'
    ],
    bugfixes: [
      'Fixed theme and language switcher overlapping with auth card on mobile views',
      'Replaced navigation with modal for privacy and terms links on auth screen'
    ],
    breakingChanges: [],
    notes: 'Added email provider detection with clickable links in toasts, fixed pass creation for deleted users, improved delete account flow with OTP verification, fixed cancel meeting request function, and updated meeting request labels in speaker view'
  },
  '1.5.15': {
    version: '1.5.15',
    buildNumber: 202511070329,
    releaseDate: '2025-11-07',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Added Privacy/Terms modal component for in-app viewing',
      'Improved mobile responsiveness for theme/language switcher on auth page'
    ],
    bugfixes: [
      'Fixed theme and language switcher overlapping with auth card on mobile views',
      'Replaced navigation with modal for privacy and terms links on auth screen'
    ],
    breakingChanges: [],
    notes: 'Fixed blocked users loading issue, improved dark mode contrast, added mute functionality, and fixed duplicate navigation bar'
  },
  '1.5.14': {
    version: '1.5.14',
    buildNumber: 202511070301,
    releaseDate: '2025-11-07',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Added Privacy/Terms modal component for in-app viewing',
      'Improved mobile responsiveness for theme/language switcher on auth page'
    ],
    bugfixes: [
      'Fixed theme and language switcher overlapping with auth card on mobile views',
      'Replaced navigation with modal for privacy and terms links on auth screen'
    ],
    breakingChanges: [],
    notes: 'Removed tutorial buttons from explore and networking screens, tutorials now auto-start automatically'
  },
  '1.5.13': {
    version: '1.5.13',
    buildNumber: 202511070249,
    releaseDate: '2025-11-07',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Added Privacy/Terms modal component for in-app viewing',
      'Improved mobile responsiveness for theme/language switcher on auth page'
    ],
    bugfixes: [
      'Fixed theme and language switcher overlapping with auth card on mobile views',
      'Replaced navigation with modal for privacy and terms links on auth screen'
    ],
    breakingChanges: [],
    notes: 'Improved toast styling to match theme colors and enhance text contrast'
  },
  '1.5.13': {
    version: '1.5.13',
    buildNumber: 202511070248,
    releaseDate: '2025-11-07',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Added Privacy/Terms modal component for in-app viewing',
      'Improved mobile responsiveness for theme/language switcher on auth page'
    ],
    bugfixes: [
      'Fixed theme and language switcher overlapping with auth card on mobile views',
      'Replaced navigation with modal for privacy and terms links on auth screen'
    ],
    breakingChanges: [],
    notes: 'Improved toast styling to match theme colors and enhance text contrast'
  },
  '1.5.12': {
    version: '1.5.12',
    buildNumber: 202511070059,
    releaseDate: '2025-11-07',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Added Privacy/Terms modal component for in-app viewing',
      'Improved mobile responsiveness for theme/language switcher on auth page'
    ],
    bugfixes: [
      'Fixed theme and language switcher overlapping with auth card on mobile views',
      'Replaced navigation with modal for privacy and terms links on auth screen'
    ],
    breakingChanges: [],
    notes: 'Fixed mobile overlap issue and added privacy/terms modal'
  },
  '1.5.11': {
    version: '1.5.11',
    buildNumber: 202511062244,
    releaseDate: '2025-11-06',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Improved language switching with smooth updates without remounting',
      'Enhanced I18nProvider to handle locale changes reactively',
      'Added useLingui hook to explore component for proper translation updates'
    ],
    bugfixes: [
      'Fixed language switching not updating explorer section immediately',
      'Fixed locale changes requiring page reload to see translations',
      'Improved translation reactivity without component remounting'
    ],
    breakingChanges: [],
    notes: 'Version 1.5.11 release'
  },
  '1.5.9': {
    version: '1.5.9',
    buildNumber: 202511062041,
    releaseDate: '2025-11-06',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Improved language switching with smooth updates without remounting',
      'Enhanced I18nProvider to handle locale changes reactively',
      'Added useLingui hook to explore component for proper translation updates'
    ],
    bugfixes: [
      'Fixed language switching not updating explorer section immediately',
      'Fixed locale changes requiring page reload to see translations',
      'Improved translation reactivity without component remounting'
    ],
    breakingChanges: [],
    notes: 'Version 1.5.9 release'
  },
  '1.5.8': {
    version: '1.5.8',
    buildNumber: 202511061859,
    releaseDate: '2025-11-06',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Improved language switching with smooth updates without remounting',
      'Enhanced I18nProvider to handle locale changes reactively',
      'Added useLingui hook to explore component for proper translation updates'
    ],
    bugfixes: [
      'Fixed language switching not updating explorer section immediately',
      'Fixed locale changes requiring page reload to see translations',
      'Improved translation reactivity without component remounting'
    ],
    breakingChanges: [],
    notes: 'Version 1.5.8 release'
  },
  '1.5.7': {
    version: '1.5.7',
    buildNumber: 202511061751,
    releaseDate: '2025-11-06',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Improved language switching with smooth updates without remounting',
      'Enhanced I18nProvider to handle locale changes reactively',
      'Added useLingui hook to explore component for proper translation updates'
    ],
    bugfixes: [
      'Fixed language switching not updating explorer section immediately',
      'Fixed locale changes requiring page reload to see translations',
      'Improved translation reactivity without component remounting'
    ],
    breakingChanges: [],
    notes: 'Version 1.5.7 release'
  },
  '1.5.6': {
    version: '1.5.6',
    buildNumber: 202511052256,
    releaseDate: '2025-11-05',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Improved language switching with smooth updates without remounting',
      'Enhanced I18nProvider to handle locale changes reactively',
      'Added useLingui hook to explore component for proper translation updates'
    ],
    bugfixes: [
      'Fixed language switching not updating explorer section immediately',
      'Fixed locale changes requiring page reload to see translations',
      'Improved translation reactivity without component remounting'
    ],
    breakingChanges: [],
    notes: 'Version 1.5.6 release'
  },
  '1.5.5': {
    version: '1.5.5',
    buildNumber: 202511052229,
    releaseDate: '2025-11-05',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Improved language switching with smooth updates without remounting',
      'Enhanced I18nProvider to handle locale changes reactively',
      'Added useLingui hook to explore component for proper translation updates'
    ],
    bugfixes: [
      'Fixed language switching not updating explorer section immediately',
      'Fixed locale changes requiring page reload to see translations',
      'Improved translation reactivity without component remounting'
    ],
    breakingChanges: [],
    notes: 'Version 1.5.5 release'
  },
  '1.5.4': {
    version: '1.5.4',
    buildNumber: 202511050332,
    releaseDate: '2025-11-05',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Improved language switching with smooth updates without remounting',
      'Enhanced I18nProvider to handle locale changes reactively',
      'Added useLingui hook to explore component for proper translation updates'
    ],
    bugfixes: [
      'Fixed language switching not updating explorer section immediately',
      'Fixed locale changes requiring page reload to see translations',
      'Improved translation reactivity without component remounting'
    ],
    breakingChanges: [],
    notes: 'Version 1.5.4 release'
  },
  '1.5.3': {
    version: '1.5.3',
    buildNumber: 202511050324,
    releaseDate: '2025-11-05',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Improved language switching with smooth updates without remounting',
      'Enhanced I18nProvider to handle locale changes reactively',
      'Added useLingui hook to explore component for proper translation updates'
    ],
    bugfixes: [
      'Fixed language switching not updating explorer section immediately',
      'Fixed locale changes requiring page reload to see translations',
      'Improved translation reactivity without component remounting'
    ],
    breakingChanges: [],
    notes: 'Version 1.5.3 release'
  },
  '1.5.2': {
    version: '1.5.2',
    buildNumber: 202511050316,
    releaseDate: '2025-11-05',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Improved language switching with smooth updates without remounting',
      'Enhanced I18nProvider to handle locale changes reactively',
      'Added useLingui hook to explore component for proper translation updates'
    ],
    bugfixes: [
      'Fixed language switching not updating explorer section immediately',
      'Fixed locale changes requiring page reload to see translations',
      'Improved translation reactivity without component remounting'
    ],
    breakingChanges: [],
    notes: 'Version 1.5.2 release'
  },
  '1.5.1': {
    version: '1.5.1',
    buildNumber: 202511050304,
    releaseDate: '2025-11-05',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Improved language switching with smooth updates without remounting',
      'Enhanced I18nProvider to handle locale changes reactively',
      'Added useLingui hook to explore component for proper translation updates'
    ],
    bugfixes: [
      'Fixed language switching not updating explorer section immediately',
      'Fixed locale changes requiring page reload to see translations',
      'Improved translation reactivity without component remounting'
    ],
    breakingChanges: [],
    notes: 'Version 1.5.1 release'
  },
  '1.5.0': {
    version: '1.5.0',
    buildNumber: 202511050249,
    releaseDate: '2025-11-05',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Improved language switching with smooth updates without remounting',
      'Enhanced I18nProvider to handle locale changes reactively',
      'Added useLingui hook to explore component for proper translation updates'
    ],
    bugfixes: [
      'Fixed language switching not updating explorer section immediately',
      'Fixed locale changes requiring page reload to see translations',
      'Improved translation reactivity without component remounting'
    ],
    breakingChanges: [],
    notes: 'Version 1.5.0 release'
  },
  '1.4.9': {
    version: '1.4.9',
    buildNumber: 202511041603,
    releaseDate: '2025-11-04',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Improved language switching with smooth updates without remounting',
      'Enhanced I18nProvider to handle locale changes reactively',
      'Added useLingui hook to explore component for proper translation updates'
    ],
    bugfixes: [
      'Fixed language switching not updating explorer section immediately',
      'Fixed locale changes requiring page reload to see translations',
      'Improved translation reactivity without component remounting'
    ],
    breakingChanges: [],
    notes: 'Version 1.4.9 release - Improved language switching experience'
  },
  '1.4.8': {
    version: '1.4.8',
    buildNumber: 202511040915,
    releaseDate: '2025-11-04',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'HashPass logo clickable with zoom animation - navigates to home page',
      'Mouse wheel scroll support for Quick Access section on explore page',
      'Snap-to-interval scrolling for Quick Access cards matching networking center behavior'
    ],
    bugfixes: [
      'Fixed admin status check error (PGRST116) - multiple rows returned issue',
      'Fixed QR code authentication error - wait for auth to finish loading',
      'Fixed arrow button scrolling on small viewports in Quick Access section',
      'Fixed HashPass logo card background to not be affected by sidebar animation'
    ],
    breakingChanges: [],
    notes: 'Version 1.4.8 release'
  },
  '1.4.7': {
    version: '1.4.7',
    buildNumber: 202511030135,
    releaseDate: '2025-11-03',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'HashPass logo clickable with zoom animation - navigates to home page',
      'Mouse wheel scroll support for Quick Access section on explore page',
      'Snap-to-interval scrolling for Quick Access cards matching networking center behavior'
    ],
    bugfixes: [
      'Fixed admin status check error (PGRST116) - multiple rows returned issue',
      'Fixed QR code authentication error - wait for auth to finish loading',
      'Fixed arrow button scrolling on small viewports in Quick Access section',
      'Fixed HashPass logo card background to not be affected by sidebar animation'
    ],
    breakingChanges: [],
    notes: 'Version 1.4.7 release'
  },
  '1.4.6': {
    version: '1.4.6',
    buildNumber: 202511022340,
    releaseDate: '2025-11-02',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'HashPass logo clickable with zoom animation - navigates to home page',
      'Mouse wheel scroll support for Quick Access section on explore page',
      'Snap-to-interval scrolling for Quick Access cards matching networking center behavior'
    ],
    bugfixes: [
      'Fixed admin status check error (PGRST116) - multiple rows returned issue',
      'Fixed QR code authentication error - wait for auth to finish loading',
      'Fixed arrow button scrolling on small viewports in Quick Access section',
      'Fixed HashPass logo card background to not be affected by sidebar animation'
    ],
    breakingChanges: [],
    notes: 'Version 1.4.6 release'
  },
  '1.4.4': {
    version: '1.4.4',
    buildNumber: 202511020451,
    releaseDate: '2025-11-02',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'HashPass logo clickable with zoom animation - navigates to home page',
      'Mouse wheel scroll support for Quick Access section on explore page',
      'Snap-to-interval scrolling for Quick Access cards matching networking center behavior'
    ],
    bugfixes: [
      'Fixed admin status check error (PGRST116) - multiple rows returned issue',
      'Fixed QR code authentication error - wait for auth to finish loading',
      'Fixed arrow button scrolling on small viewports in Quick Access section',
      'Fixed HashPass logo card background to not be affected by sidebar animation'
    ],
    breakingChanges: [],
    notes: 'Version 1.4.4 release'
  },
  '1.4.3': {
    version: '1.4.3',
    buildNumber: 202511020310,
    releaseDate: '2025-11-02',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'HashPass logo clickable with zoom animation - navigates to home page',
      'Mouse wheel scroll support for Quick Access section on explore page',
      'Snap-to-interval scrolling for Quick Access cards matching networking center behavior'
    ],
    bugfixes: [
      'Fixed admin status check error (PGRST116) - multiple rows returned issue',
      'Fixed QR code authentication error - wait for auth to finish loading',
      'Fixed arrow button scrolling on small viewports in Quick Access section',
      'Fixed HashPass logo card background to not be affected by sidebar animation'
    ],
    breakingChanges: [],
    notes: 'Version 1.4.3 release'
  },
  '1.4.2': {
    version: '1.4.2',
    buildNumber: 202511012207,
    releaseDate: '2025-11-01',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'HashPass logo clickable with zoom animation - navigates to home page',
      'Mouse wheel scroll support for Quick Access section on explore page',
      'Snap-to-interval scrolling for Quick Access cards matching networking center behavior'
    ],
    bugfixes: [
      'Fixed admin status check error (PGRST116) - multiple rows returned issue',
      'Fixed QR code authentication error - wait for auth to finish loading',
      'Fixed arrow button scrolling on small viewports in Quick Access section',
      'Fixed HashPass logo card background to not be affected by sidebar animation'
    ],
    breakingChanges: [],
    notes: 'Version 1.4.2 release - UI improvements and bug fixes'
  },
  '1.4.1': {
    version: '1.4.1',
    buildNumber: 202511020246,
    releaseDate: '2025-11-02',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Unified LoadingScreen component for consistent loading states across the app',
      'Integrated LoadingScreen in networking, agenda, and speakers screens',
      'Global loader implementation for agenda screen to prevent banner expansion issues'
    ],
    bugfixes: [
      'Fixed LoadingScreen subtitle undefined error in getStyles function',
      'Fixed agenda banner expansion issue during initial loading',
      'Fixed missing LoadingScreen import in speakers calendar component',
      'Fixed loader not showing at beginning of agenda screen causing banner to expand'
    ],
    breakingChanges: [],
    notes: 'Version 1.4.1 release'
  },
  '1.4.0': {
    version: '1.4.0',
    buildNumber: 202511020054,
    releaseDate: '2025-11-02',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Unified LoadingScreen component for consistent loading states across the app',
      'Integrated LoadingScreen in networking, agenda, and speakers screens',
      'Global loader implementation for agenda screen to prevent banner expansion issues'
    ],
    bugfixes: [
      'Fixed LoadingScreen subtitle undefined error in getStyles function',
      'Fixed agenda banner expansion issue during initial loading',
      'Fixed missing LoadingScreen import in speakers calendar component',
      'Fixed loader not showing at beginning of agenda screen causing banner to expand'
    ],
    breakingChanges: [],
    notes: 'Version 1.4.0 release'
  },
  '1.4.0': {
    version: '1.4.0',
    buildNumber: 202511020054,
    releaseDate: '2025-11-02',
    releaseType: 'stable',
    environment: 'development',
    features: [
      'Unified LoadingScreen component for consistent loading states across the app',
      'Integrated LoadingScreen in networking, agenda, and speakers screens',
      'Global loader implementation for agenda screen to prevent banner expansion issues'
    ],
    bugfixes: [
      'Fixed LoadingScreen subtitle undefined error in getStyles function',
      'Fixed agenda banner expansion issue during initial loading',
      'Fixed missing LoadingScreen import in speakers calendar component',
      'Fixed loader not showing at beginning of agenda screen causing banner to expand'
    ],
    breakingChanges: [],
    notes: 'Polished profile view with avatar update functionality, removed sign out button and version display'
  },
  '1.3.9': {
    version: '1.3.9',
    buildNumber: 202510310833,
    releaseDate: '2025-10-31',
    releaseType: 'beta',
    environment: 'development',
    features: [
      'Unified LoadingScreen component for consistent loading states across the app',
      'Integrated LoadingScreen in networking, agenda, and speakers screens',
      'Global loader implementation for agenda screen to prevent banner expansion issues'
    ],
    bugfixes: [
      'Fixed LoadingScreen subtitle undefined error in getStyles function',
      'Fixed agenda banner expansion issue during initial loading',
      'Fixed missing LoadingScreen import in speakers calendar component',
      'Fixed loader not showing at beginning of agenda screen causing banner to expand'
    ],
    breakingChanges: [],
    notes: 'Version 1.3.9 release - Unified loading experience across all screens'
  },
  '1.3.8': {
    version: '1.3.8',
    buildNumber: 202510310801,
    releaseDate: '2025-10-31',
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
    notes: 'Version 1.3.8 release'
  },
  '1.3.7': {
    version: '1.3.7',
    buildNumber: 202510310647,
    releaseDate: '2025-10-31',
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
    notes: 'Version 1.3.7 release'
  },
  '1.3.6': {
    version: '1.3.6',
    buildNumber: 202510310635,
    releaseDate: '2025-10-31',
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
    notes: 'Version 1.3.6 release'
  },
  '1.3.5': {
    version: '1.3.5',
    buildNumber: 202510310540,
    releaseDate: '2025-10-31',
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
    notes: 'Version 1.3.5 release'
  },
  '1.3.5': {
    version: '1.3.5',
    buildNumber: 202510310421,
    releaseDate: '2025-10-31',
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
    notes: 'Version 1.3.5 release'
  },
  '1.3.4': {
    version: '1.3.4',
    buildNumber: 202510302121,
    releaseDate: '2025-10-30',
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
    notes: 'Version 1.3.4 release'
  },
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
