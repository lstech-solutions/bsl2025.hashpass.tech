import React, { useCallback, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Localization from 'expo-localization';
import { setLocale } from '../i18n/i18n';
import { AppState, Platform } from 'react-native';

export type LanguageStoreType = {
  locale: string;
  setLocale: (locale: string) => Promise<void>;
};

export const useLanguageStore = (): LanguageStoreType => {
  const [locale, setLocaleState] = useState('en');

  const updateLocale = useCallback(async (newLocale: string) => {
    try {
      setLocaleState(newLocale);
      setLocale(newLocale);
      await SecureStore.setItemAsync('user_locale', newLocale);
    } catch (error) {
      console.error('Failed to update locale', error);
    }
  }, []);

  // Load saved language preference on initial render
  useEffect(() => {
    const loadLocale = async () => {
      try {
        const savedLocale = await SecureStore.getItemAsync('user_locale');
        if (savedLocale) {
          await updateLocale(savedLocale);
        } else {
          // If no saved preference, use device locale
          const deviceLocale = Localization.getLocales()[0].languageCode || 'en';
          if (['en', 'es', 'ko'].includes(deviceLocale)) {
            await updateLocale(deviceLocale);
          } else {
            await updateLocale('en'); // Fallback to English
          }
        }
      } catch (error) {
        console.error('Failed to load locale', error);
      }
    };

    loadLocale();
  }, [updateLocale]);

  // Listen for system locale changes
  useEffect(() => {
    if (Platform.OS === 'ios') {
      const subscription = AppState.addEventListener('change', async () => {
        const currentLocale = await SecureStore.getItemAsync('user_locale');
        if (!currentLocale) { // Only auto-update if user hasn't set a preference
          const deviceLocale = Localization.getLocales()[0].languageCode || 'en';
          if (['en', 'es', 'ko'].includes(deviceLocale) && deviceLocale !== locale) {
            await updateLocale(deviceLocale);
          }
        }
      });

      return () => {
        subscription.remove();
      };
    }
  }, [locale, updateLocale]);

  const changeLocale = async (newLocale: string) => {
    if (newLocale !== locale) {
      await updateLocale(newLocale);
    }
  };

  return { locale, setLocale: changeLocale };
};
