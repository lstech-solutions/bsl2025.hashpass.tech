# Auth View Improvements - Changelog

## Version: 2025-01-XX

### Changes Made

#### 1. Fixed Theme/Language Switcher Overlapping on Mobile Views
**File:** `components/ThemeAndLanguageSwitcher.tsx`

**Changes:**
- Added responsive mobile detection using `Dimensions` API
- Added conditional positioning for mobile views on auth page
- Mobile positioning: `top: 10px` (web) / `60px` (native), `right: 10px`
- Prevents overlap with auth card on mobile devices

**Technical Details:**
- Added `Dimensions` and `Platform` imports
- Added `isMobile` state with responsive detection
- Added `useEffect` hook to listen for dimension changes
- Added `containerMobile` style that applies only on auth page when mobile

#### 2. Created Privacy/Terms Modal Component
**File:** `components/PrivacyTermsModal.tsx` (NEW FILE)

**Features:**
- Reusable modal component for displaying Privacy Policy and Terms of Service
- Slide-up animation on mobile, centered modal on web
- Full content from original privacy/terms pages
- Close button with proper hit slop
- Scrollable content with proper styling
- Platform-specific styling (web vs native)

**Props:**
- `visible: boolean` - Controls modal visibility
- `type: 'privacy' | 'terms'` - Determines which content to display
- `onClose: () => void` - Callback to close modal

#### 3. Updated Auth Screen to Use Modal Instead of Navigation
**File:** `app/(shared)/auth.tsx`

**Changes:**
- Replaced `router.push()` navigation with modal state management
- Added `modalVisible` state
- Added `modalType` state ('privacy' | 'terms')
- Updated privacy/terms link handlers to open modal
- Added `PrivacyTermsModal` component to render tree

**Before:**
```typescript
onPress={() => router.push('/(shared)/terms' as any)}
onPress={() => router.push('/(shared)/privacy' as any)}
```

**After:**
```typescript
onPress={() => {
  setModalType('terms');
  setModalVisible(true);
}}
onPress={() => {
  setModalType('privacy');
  setModalVisible(true);
}}
```

### Files Modified
1. `components/ThemeAndLanguageSwitcher.tsx` - Mobile positioning fix
2. `app/(shared)/auth.tsx` - Modal integration
3. `components/PrivacyTermsModal.tsx` - New modal component

### Files Created
1. `components/PrivacyTermsModal.tsx` - New reusable modal component

### Testing Recommendations
1. Test on mobile devices (< 768px width) to verify no overlap
2. Test modal opening/closing on both privacy and terms links
3. Test modal behavior on web vs native platforms
4. Verify scrollable content works properly in modal
5. Test theme switching in modal (dark/light mode)

### Browser/Platform Compatibility
- ✅ React Native (iOS/Android)
- ✅ Web (responsive)
- ✅ Expo Router compatible

### Dependencies
No new dependencies required. Uses existing:
- React Native `Modal` component
- `@lingui/macro` for translations
- Existing theme system
- Existing safe area context

