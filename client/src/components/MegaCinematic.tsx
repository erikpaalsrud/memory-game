import { useEffect, useState } from 'react';
import type { ClientGameState } from 'memory-game-shared';
import { useTranslation } from '../i18n/LanguageContext';
import type { MegaTriggerEvent } from '../hooks/useGame';

interface Props {
  trigger: MegaTriggerEvent | null;
  gameState: ClientGameState;
}

const ROMAN = ['', 'I', 'II', 'III'];

/**
 * Full-screen cinematic overlay shown when a Mega Wave triggers. Plays for
 * ~2.5s, then fades. Driven entirely by the trigger.seq prop — every new
 * trigger remounts the inner content with a fresh animation.
 */
export function MegaCinematic({ trigger, gameState }: Props) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setVisible(true);
    const hideTimer = setTimeout(() => setVisible(false), 2700);
    return () => clearTimeout(hideTimer);
  }, [trigger?.seq]);

  if (!trigger || !visible) return null;

  const triggerer = gameState.players.find((p) => p.id === trigger.triggererId);
  const isFinalDuel = trigger.level >= 3;
  const title = isFinalDuel
    ? t('mega.wave.final.title')
    : `${t('mega.wave.banner.title')} ${ROMAN[trigger.level] ?? trigger.level}`;
  const subtitle = isFinalDuel
    ? t('mega.wave.final.subtitle')
    : t('mega.wave.unlock.subtitle', { name: triggerer?.name ?? '', level: ROMAN[trigger.level] ?? String(trigger.level) });

  return (
    <div
      className={`mega-cinematic level-${trigger.level} ${isFinalDuel ? 'is-final-duel' : ''}`}
      key={trigger.seq}
      aria-live="polite"
    >
      {/* Full screen flash */}
      <div className="mega-flash" aria-hidden />

      {/* Speed lines burst */}
      <div className="mega-speed-lines" aria-hidden>
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="mega-speed-line"
            style={{ ['--angle' as string]: `${(360 / 16) * i}deg` } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Big title */}
      <div className="mega-title-wrap">
        <div className="mega-title">{title}</div>
        <div className="mega-subtitle">{subtitle}</div>
      </div>

      {/* Spark particles around the title */}
      <div className="mega-particles" aria-hidden>
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="mega-spark"
            style={{
              ['--mx' as string]: `${(Math.random() - 0.5) * 120}vw`,
              ['--my' as string]: `${(Math.random() - 0.5) * 120}vh`,
              ['--md' as string]: `${0.4 + Math.random() * 0.6}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}
