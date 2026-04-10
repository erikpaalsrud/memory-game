import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { LANGUAGES, TRANSLATIONS, type Language } from './translations';

const STORAGE_KEY = 'mememory.lang';

type TFn = (key: string, params?: Record<string, string | number>) => string;

interface LanguageContextValue {
  lang: Language;
  setLanguage: (lang: Language) => void;
  t: TFn;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function detectInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGUAGES.some((l) => l.code === saved)) return saved as Language;
  } catch {
    /* ignore */
  }
  // Fall back to browser lang if it starts with "no" / "nb" / "nn"
  const nav = (typeof navigator !== 'undefined' && navigator.language) || 'en';
  if (/^(no|nb|nn)/i.test(nav)) return 'no';
  return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(detectInitialLanguage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const setLanguage = useCallback((next: Language) => setLang(next), []);

  const t = useCallback<TFn>(
    (key, params) => {
      const dict = TRANSLATIONS[lang];
      let str = dict[key] ?? TRANSLATIONS.en[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return str;
    },
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider');
  return ctx;
}
