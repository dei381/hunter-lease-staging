import { create } from 'zustand';

type Language = 'en' | 'ru';

interface LanguageState {
  language: Language;
  hasSelectedLanguage: boolean;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>((set) => {
  const savedLang = localStorage.getItem('language') as Language | null;
  const initialLang = savedLang || 'en';
  const hasSelectedLanguage = savedLang !== null;
  
  document.documentElement.lang = initialLang;
  
  return {
    language: initialLang,
    hasSelectedLanguage,
    setLanguage: (lang: Language) => {
      localStorage.setItem('language', lang);
      document.documentElement.lang = lang;
      set({ language: lang, hasSelectedLanguage: true });
    },
  };
});
