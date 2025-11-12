import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useColorScheme } from 'nativewind';
import { isPWAInstalled, getInstallationStatus, canInstallPWA } from '../lib/pwa-utils';

const PWAPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    // Check installation status
    const checkStatus = () => {
      const status = getInstallationStatus();
      setIsInstalled(status.installed);
      
      // Show prompt if:
      // 1. Install prompt is available, OR
      // 2. App is installed but user wants to reinstall (always allow)
      // Don't auto-show if already installed, but allow manual trigger
      if (status.canInstall || status.allowReinstall) {
        setShowPrompt(true);
      }
    };

    checkStatus();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (event: any) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShowPrompt(true); // Show prompt when install is available
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      
      // Also check periodically in case status changes
      const interval = setInterval(checkStatus, 2000);
      
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        clearInterval(interval);
      };
    }
  }, []);

  const installPWA = () => {
    if (deferredPrompt) {
      // Use browser's install prompt if available
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('✅ User accepted the install prompt');
        }
        setDeferredPrompt(null);
      });
    } else {
      // Fallback: Show manual installation instructions
      // For iOS Safari
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        
        if (isIOS) {
          alert('To install: Tap the Share button, then "Add to Home Screen"');
        } else if (isAndroid) {
          alert('To install: Tap the menu (⋮) and select "Install app" or "Add to Home screen"');
        } else {
          alert('To install: Look for the install icon in your browser\'s address bar');
        }
      }
    }
  };

  // Don't show if no install option available and not installed
  if (!showPrompt && !isInstalled && !deferredPrompt) {
    return null;
  }

  // Show reinstall option even if already installed
  const buttonText = isInstalled ? 'Reinstall HashPass' : 'Install HashPass';

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colorScheme === 'dark' ? '#1D9BF0' : '#007AFF' }]} 
        onPress={installPWA}
      >
        <Text style={[styles.text, { color: colorScheme === 'dark' ? '#000000' : '#FFFFFF' }]}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'fixed',
    bottom: 20,
    right: 20,
    zIndex: 1000,
  },
  button: {
    padding: 12,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PWAPrompt;
