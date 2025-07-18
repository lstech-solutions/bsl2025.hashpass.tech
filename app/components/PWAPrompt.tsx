import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';

const PWAPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: any) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installPWA = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the A2HS prompt');
      }
      setDeferredPrompt(null);
    });
  };

  if (!deferredPrompt) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colorScheme === 'dark' ? '#1D9BF0' : '#007AFF' }]} 
        onPress={installPWA}
      >
        <Text style={[styles.text, { color: colorScheme === 'dark' ? '#000000' : '#FFFFFF' }]}>Install HashPass</Text>
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
