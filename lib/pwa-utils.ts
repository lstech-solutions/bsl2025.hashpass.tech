/**
 * PWA installation detection and utilities
 */

import { Platform } from 'react-native';

/**
 * Check if the app is running in standalone mode (installed as PWA)
 * This works for both iOS and Android PWAs
 */
export const isStandalone = (): boolean => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  // Check for iOS standalone mode
  if ((window.navigator as any).standalone === true) {
    return true;
  }

  // Check for Android standalone mode using display-mode media query
  if (window.matchMedia) {
    const standaloneMediaQuery = window.matchMedia('(display-mode: standalone)');
    if (standaloneMediaQuery.matches) {
      return true;
    }
  }

  // Check if running in fullscreen mode (another indicator)
  if (window.matchMedia) {
    const fullscreenMediaQuery = window.matchMedia('(display-mode: fullscreen)');
    if (fullscreenMediaQuery.matches) {
      return true;
    }
  }

  // Check if window is not in a browser tab (less reliable but can help)
  // This checks if the app is running in its own window
  if (
    window.matchMedia &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      (document as any).referrer.includes('android-app://'))
  ) {
    return true;
  }

  return false;
};

/**
 * Check if the app can be installed (PWA install prompt available)
 */
export const canInstallPWA = (): boolean => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  // Check if beforeinstallprompt event is supported
  // This means the browser supports PWA installation
  return 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window;
};

/**
 * Check if the app is already installed (more reliable check)
 * Combines multiple detection methods
 */
export const isPWAInstalled = (): boolean => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  // Primary check: standalone mode
  if (isStandalone()) {
    return true;
  }

  // Secondary check: check if running from home screen
  // iOS Safari specific
  if ((window.navigator as any).standalone === true) {
    return true;
  }

  // Tertiary check: check display mode
  if (window.matchMedia) {
    const displayMode = window.matchMedia('(display-mode: standalone)');
    if (displayMode.matches) {
      return true;
    }
  }

  return false;
};

/**
 * Get installation status with more details
 */
export const getInstallationStatus = () => {
  const installed = isPWAInstalled();
  const canInstall = canInstallPWA();
  const isStandaloneMode = isStandalone();

  return {
    installed,
    canInstall,
    isStandaloneMode,
    // Allow reinstall if user wants to update or reinstall
    allowReinstall: true, // Always allow reinstall option
  };
};

