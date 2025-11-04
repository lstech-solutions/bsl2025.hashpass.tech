import React, { useEffect, useState } from 'react';
import { I18nProvider as LinguiI18nProvider } from '@lingui/react';
import { i18n, initI18n, loadMessages } from '../i18n/i18n';
import { useLanguage } from '../providers/LanguageProvider';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useLanguage?.() || { locale: undefined } as any;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setReady(true)).catch(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready && locale && locale !== i18n.locale) {
      loadMessages(locale).catch(() => {});
    }
  }, [locale, ready]);

  if (!ready) return null;

  return (
    <LinguiI18nProvider i18n={i18n}>
      {children}
    </LinguiI18nProvider>
  );
}
