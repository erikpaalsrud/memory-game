import { LANGUAGES } from '../i18n/translations';
import { useTranslation } from '../i18n/LanguageContext';

/**
 * Compact language toggle. Sits in the top-right next to the mute button.
 * Two-language pill with the current language highlighted.
 */
export function LanguageToggle() {
  const { lang, setLanguage } = useTranslation();

  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      {LANGUAGES.map((opt) => (
        <button
          key={opt.code}
          type="button"
          className={`lang-toggle-btn ${lang === opt.code ? 'is-active' : ''}`}
          onClick={() => setLanguage(opt.code)}
          aria-label={opt.label}
          aria-pressed={lang === opt.code}
          title={opt.label}
        >
          <span className="lang-toggle-flag" aria-hidden>{opt.flag}</span>
          <span className="lang-toggle-code">{opt.code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}
