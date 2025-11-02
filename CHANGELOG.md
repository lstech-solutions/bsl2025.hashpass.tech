# Changelog

## [1.4.2] - 2025-11-01

### Beta
- Version 1.4.2 release - UI improvements and bug fixes

### Features
- HashPass logo clickable with zoom animation - navigates to home page
- Mouse wheel scroll support for Quick Access section on explore page
- Snap-to-interval scrolling for Quick Access cards matching networking center behavior

### Bugfixes
- Fixed admin status check error (PGRST116) - multiple rows returned issue
- Fixed QR code authentication error - wait for auth to finish loading
- Fixed arrow button scrolling on small viewports in Quick Access section
- Fixed HashPass logo card background to not be affected by sidebar animation

### Technical Details
- Version: 1.4.2
- Release Type: beta
- Build Number: 202511012207
- Release Date: 2025-11-01T22:07:00.000Z


## [1.4.1] - 2025-11-02

### Beta
- Version 1.4.1 release

### Technical Details
- Version: 1.4.1
- Release Type: beta
- Build Number: 202511020246
- Release Date: 2025-11-02T02:46:49.394Z


## [1.4.0] - 2025-11-02

### Released
- Polished profile view with avatar update functionality, removed sign out button and version display

### Technical Details
- Version: 1.4.0
- Release Type: stable
- Build Number: 202511020054
- Release Date: 2025-11-02T00:54:07.190Z


## [1.3.9] - 2025-10-31

### Beta
- Version 1.3.9 release

### Technical Details
- Version: 1.3.9
- Release Type: beta
- Build Number: 202510310833
- Release Date: 2025-10-31T08:33:45.755Z


## [1.3.8] - 2025-10-31

### Beta
- Version 1.3.8 release

### Technical Details
- Version: 1.3.8
- Release Type: beta
- Build Number: 202510310801
- Release Date: 2025-10-31T08:01:01.844Z


## [1.3.7] - 2025-10-31

### Beta
- Version 1.3.7 release

### Technical Details
- Version: 1.3.7
- Release Type: beta
- Build Number: 202510310647
- Release Date: 2025-10-31T06:47:39.150Z


## [1.3.6] - 2025-10-31

### Beta
- Version 1.3.6 release

### Technical Details
- Version: 1.3.6
- Release Type: beta
- Build Number: 202510310635
- Release Date: 2025-10-31T06:35:14.616Z


## [1.3.5] - 2025-10-31

### Beta
- Version 1.3.5 release

### Technical Details
- Version: 1.3.5
- Release Type: beta
- Build Number: 202510310421
- Release Date: 2025-10-31T04:21:16.202Z


## [1.3.4] - 2025-10-30

### Beta
- Version 1.3.4 release

### Technical Details
- Version: 1.3.4
- Release Type: beta
- Build Number: 202510302121
- Release Date: 2025-10-30T21:21:17.896Z


## [1.3.2] - 2025-10-27

### Beta
- Updated version display and changelog automation

### Technical Details
- Version: 1.3.2
- Release Type: beta
- Build Number: 202510272149
- Release Date: 2025-10-27T21:49:11.400Z


## [1.2.9] - 2025-10-26

### Bug Fixes
- Fixed TypeScript error where 'event' was possibly null in agenda.tsx
- Updated dependency array to use optional chaining for event.agenda

### Technical Details
- Version bump to 1.2.9
- Build timestamp: 2025-10-26T18:52:00.000Z

## [1.1.7] - 2025-10-15

### Bug Fixes
- Version bump to 1.1.7
- Build: 202510150933
- Release Type: stable

### Technical Details
- Automated version update
- Build timestamp: 2025-10-15T14:33:27.375Z
All notable changes to the BSL 2025 HashPass application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-01-15

### New Features
- User pass management system with database integration
- BSL 2025 event integration with live agenda updates
- Speaker profile system with avatar support and search functionality
- Event agenda with tabbed interface and real-time countdown
- Unified search and filter system across all views
- Dark mode support with proper contrast adjustments
- Event banner component for consistent branding
- Pass card UI with BSL2025 branding and logo seal
- Real-time countdown system for event timing
- Version tracking and display system

### Bug Fixes
- Fixed SVG logo rendering issues by implementing text-based fallback
- Resolved TypeScript undefined property errors with proper null checking
- Fixed agenda data grouping logic for proper day distribution
- Corrected speaker count discrepancies and duplicate entries
- Fixed dark mode contrast issues across all components
- Resolved navigation routing problems between views
- Fixed alphabetical dividers in speaker list
- Corrected filter and search system consistency

### Technical Improvements
- Implemented comprehensive versioning system with semantic versioning
- Added version display component in sidebar
- Created automated version update scripts
- Enhanced error handling and fallback mechanisms
- Improved database integration with proper RLS policies
- Optimized UI performance and rendering

### Breaking Changes
- None in this version

### Notes
- Major UI overhaul with BSL 2025 branding and improved user experience
- All components now support both light and dark themes
- Database schema updated for better data consistency
- Version tracking system implemented for better development workflow

## [1.1.0] - 2025-01-14

### New Features
- Basic event management system
- Speaker listing functionality with search
- Simple agenda display
- Basic authentication system

### Bug Fixes
- Fixed initial setup issues
- Resolved database connection problems

### Breaking Changes
- None

### Notes
- Initial BSL 2025 integration

## [1.0.0] - 2025-01-13

### New Features
- Core HashPass application structure
- Basic navigation system with drawer
- Theme management (light/dark mode)
- Event context system
- Language support (English/Spanish)

### Bug Fixes
- None

### Breaking Changes
- None

### Notes
- Initial HashPass application release
- Foundation for BSL 2025 event integration
