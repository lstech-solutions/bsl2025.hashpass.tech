import * as Localization from 'expo-localization';

import en from './locales/en.json';
import es from './locales/es.json';
import ko from './locales/ko.json';

export const supportedLanguages = ['en', 'es', 'ko'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

export const translations: Record<SupportedLanguage, typeof en> = {
  en,
  es,
  ko,
};

export function getDeviceLanguage(): SupportedLanguage {
  // Returns 'en', 'es', or 'ko', defaulting to 'en' if not supported
  const locale = Localization.getLocales()[0].languageTag.split('-')[0];
  if (supportedLanguages.includes(locale as SupportedLanguage)) {
    return locale as SupportedLanguage;
  }
  return 'en';
}
