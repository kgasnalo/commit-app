import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import i18n, { setLanguage as setI18nLanguage, loadLanguage } from '../i18n';

interface LanguageContextType {
  language: string;
  setLanguage: (code: string) => Promise<void>;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState(i18n.locale);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved language on mount
  useEffect(() => {
    let isMounted = true;
    loadLanguage().then(locale => {
      if (isMounted) {
        setLanguageState(locale);
        setIsLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const setLanguage = useCallback(async (code: string) => {
    await setI18nLanguage(code);
    setLanguageState(code);
  }, []);

  const value = useMemo(() => ({ language, setLanguage, isLoading }), [language, setLanguage, isLoading]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
