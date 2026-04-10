import { useTranslation } from '../i18n/LanguageContext';

interface Props {
  onCancel: () => void;
}

export function WaitingRoom({ onCancel }: Props) {
  const { t } = useTranslation();
  return (
    <div className="waiting-room">
      <div className="waiting-card">
        <div className="spinner" />
        <h2>{t('waiting.title')}</h2>
        <p>{t('waiting.subtitle')}</p>
        <button className="btn-secondary" onClick={onCancel}>
          {t('waiting.cancel')}
        </button>
      </div>
    </div>
  );
}
