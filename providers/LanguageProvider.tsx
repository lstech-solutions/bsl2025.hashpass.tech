import React, { createContext, useContext, ReactNode } from 'react';
import { useLanguageStore } from '../hooks/useLanguageStore';

const LanguageContext = createContext<{
  locale: string;
  setLocale: (locale: string) => Promise<void>;
} | undefined>(undefined);

type LanguageProviderProps = {
  children: ReactNode;
};

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { locale, setLocale } = useLanguageStore();

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): {
  locale: string;
  setLocale: (locale: string) => Promise<void>;
} => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};