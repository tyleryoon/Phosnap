import { createContext, useContext, useState } from 'react';
import ko from '../i18n/ko.json';
import en from '../i18n/en.json';
import ja from '../i18n/ja.json';
import zh from '../i18n/zh.json';

const LANGS = { ko, en, ja, zh };

export const LANG_LABELS = [
  { code: 'ko', label: 'KR' },
  { code: 'en', label: 'EN' },
  { code: 'ja', label: 'JP' },
  { code: 'zh', label: 'CN' },
];

const LanguageContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────
export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState('ko');

  // t('nav.explore') → 해당 언어 번역 반환
  const t = (key) => {
    const keys = key.split('.');
    let val = LANGS[lang];
    for (const k of keys) {
      val = val?.[k];
    }
    return val ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// ─── Hook ──────────────────────────────────────────────────────────────
export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
};
