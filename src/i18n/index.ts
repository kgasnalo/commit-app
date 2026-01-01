import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ja from './locales/ja.json';
import en from './locales/en.json';
import ko from './locales/ko.json';

const i18n = new I18n({
  ja,
  en,
  ko,
});

i18n.defaultLocale = 'ja';
i18n.locale = 'ja';
i18n.enableFallback = true;

export const LANGUAGES = [
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
];

export const setLanguage = async (languageCode: string) => {
  i18n.locale = languageCode;
  await AsyncStorage.setItem('userLanguage', languageCode);
};

export const loadLanguage = async () => {
  const savedLanguage = await AsyncStorage.getItem('userLanguage');
  if (savedLanguage) {
    i18n.locale = savedLanguage;
  }
  return i18n.locale;
};

export default i18n;
