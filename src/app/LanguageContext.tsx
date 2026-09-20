import React, {PropsWithChildren, createContext, useContext, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {I18nManager} from 'react-native';
import {ar} from '../i18n/ar';
import {en} from '../i18n/en';

export type Language = 'ar' | 'en';

type TranslationTree = typeof ar;
type LanguageContextValue = {
  language: Language;
  isRTL: boolean;
  setLanguage: (language: Language) => Promise<void>;
  t: <K1 extends keyof TranslationTree, K2 extends keyof TranslationTree[K1]>(
    section: K1,
    key: K2,
  ) => string;
};

const LANGUAGE_KEY = '@hbmonitor_language';

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({children}: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>(
    I18nManager.isRTL ? 'ar' : 'en',
  );

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY).then(saved => {
      if (saved === 'ar' || saved === 'en') {
        setLanguageState(saved);
      }
    });
  }, []);

  const setLanguage = async (nextLanguage: Language) => {
    await AsyncStorage.setItem(LANGUAGE_KEY, nextLanguage);
    setLanguageState(nextLanguage);

    const nextRTL = nextLanguage === 'ar';
    if (I18nManager.isRTL !== nextRTL) {
      I18nManager.allowRTL(nextRTL);
      I18nManager.forceRTL(nextRTL);
    }
  };

  const dictionary = language === 'ar' ? ar : en;

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      isRTL: language === 'ar',
      setLanguage,
      t: (section, key) => String(dictionary[section][key]),
    }),
    [language, dictionary],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }

  return context;
}
