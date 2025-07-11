import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import { useCallback, useState, useEffect } from 'react';
import { EventEmitter } from 'events';
import en from './locales/en.json';
import es from './locales/es.json';
import ko from './locales/ko.json';

// Create an event emitter for locale changes
const eventEmitter = new EventEmitter();

// Initialize i18n
const i18n = new I18n({
  en,
  es,
  ko,
});

// Add event emitter to i18n instance
(i18n as any).eventEmitter = eventEmitter;

// Set default locale to English
i18n.defaultLocale = 'en';

// When a value is missing from a language it'll fallback to another language with the key present
i18n.enableFallback = true;

// Helper function to get device locale
const getDeviceLocaleCode = (): string => {
  const locales = Localization.getLocales();
  if (locales.length > 0) {
    const languageCode = locales[0].languageCode || '';
    if (['en', 'es', 'ko'].includes(languageCode)) {
      return languageCode;
    }
  }
  return 'en';
};

// Initialize with device locale
i18n.locale = getDeviceLocaleCode();

export const translate = (key: string, params = {}) => {
  return i18n.t(key, params);
};

export const setLocale = (locale: string) => {
  if (['en', 'es', 'ko'].includes(locale) && i18n.locale !== locale) {
    i18n.locale = locale;
    // Emit event to notify listeners about the locale change
    eventEmitter.emit('localeChange', locale);
    return true;
  }
  return false;
};

export const getCurrentLocale = (): string => {
  return i18n.locale;
};

export const getDeviceLocale = (): string => {
  return getDeviceLocaleCode();
};

export const getAvailableLocales = () => {
  return [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'ko', name: '한국어' },
  ];
};

// Hook to use translations with namespace
export const useTranslation = (namespace: string) => {
  const [_, setLocale] = useState(i18n.locale);

  useEffect(() => {
    const onLocaleChange = () => {
      setLocale(i18n.locale);
    };

    eventEmitter.on('localeChange', onLocaleChange);
    return () => {
      eventEmitter.off('localeChange', onLocaleChange);
    };
  }, []);

  const t = useCallback(
    (key: string, params = {}) => {
      return i18n.t(`${namespace}.${key}`, params);
    },
    [namespace, _]
  );

  return { t };
};

export default i18n;
