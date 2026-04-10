import { useState } from 'react';
import { CATEGORIES } from 'memory-game-shared';
import { MememoryTitle } from './MememoryTitle';
import { useTranslation } from '../i18n/LanguageContext';

interface Props {
  onJoin: (name: string) => void;
  onSpectate: (code: string) => void;
  isConnected: boolean;
}

const EMOJIS = ['🃏', '🧠', '⭐', '🎮', '🏆', '✨', '🎯', '🔮', '🌟', '💎', '🎪', '🦄'];
const RAY_COUNT = 14;
const SPARKLE_COUNT = 32;

// Stable pseudo-random offsets for sparkles — re-deriving them on every render
// would jitter them with React StrictMode's double-render. A small precomputed
// table is plenty for visual variety.
const SPARKLE_SEEDS = Array.from({ length: SPARKLE_COUNT }, (_, i) => ({
  x: ((i * 37 + 11) % 95) + 2,
  y: ((i * 53 + 17) % 92) + 4,
  d: 1.6 + ((i * 13) % 30) / 10,
  delay: ((i * 7) % 50) / 10,
  size: 3 + (i % 3),
}));

interface Rule {
  icon: string;
  textKey: string;
}

const RULES: Rule[] = [
  { icon: '🃏', textKey: 'lobby.info.flip' },
  { icon: '🧠', textKey: 'lobby.info.match' },
  { icon: '🏆', textKey: 'lobby.info.win' },
];

export function Lobby({ onJoin, onSpectate, isConnected }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [spectateCode, setSpectateCode] = useState('');
  const [showSpectate, setShowSpectate] = useState(false);
  const [flippedRules, setFlippedRules] = useState<boolean[]>([false, false, false]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (trimmed) onJoin(trimmed);
  };

  const toggleRule = (i: number) => {
    setFlippedRules((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  return (
    <div className="lobby">
      {/* Slow color-shifting magical aura behind everything */}
      <div className="lobby-aura" aria-hidden />

      {/* Radial light rays from center */}
      <div className="lobby-rays" aria-hidden>
        {Array.from({ length: RAY_COUNT }, (_, i) => (
          <div
            key={i}
            className="lobby-ray"
            style={{ '--ray-angle': `${(360 / RAY_COUNT) * i}deg` } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Floating emoji particles */}
      <div className="lobby-particles" aria-hidden>
        {EMOJIS.map((emoji, i) => (
          <span
            key={i}
            className="particle"
            style={{
              '--x': `${8 + (i * 7) % 84}%`,
              '--delay': `${i * 0.7}s`,
              '--duration': `${6 + (i % 5) * 2}s`,
              '--size': `${1.2 + (i % 3) * 0.5}rem`,
            } as React.CSSProperties}
          >
            {emoji}
          </span>
        ))}
      </div>

      {/* Floating card backs (now using the generated PNG) */}
      <div className="lobby-cards-bg" aria-hidden>
        <div className="floating-card fc-1"><img src="/cards/card-back.png" alt="" /></div>
        <div className="floating-card fc-2"><img src="/cards/card-back.png" alt="" /></div>
        <div className="floating-card fc-3"><img src="/cards/card-back.png" alt="" /></div>
        <div className="floating-card fc-4"><img src="/cards/card-back.png" alt="" /></div>
      </div>

      {/* Sparkle dots */}
      <div className="lobby-sparkles" aria-hidden>
        {SPARKLE_SEEDS.map((s, i) => (
          <span
            key={i}
            className="sparkle"
            style={{
              '--sx': `${s.x}%`,
              '--sy': `${s.y}%`,
              '--sd': `${s.d}s`,
              '--sdelay': `${s.delay}s`,
              '--ssize': `${s.size}px`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="lobby-hero">
        <div className="lobby-topsi-wrapper">
          <div className="topsi-speech-bubble">{t('lobby.topsi.greeting')}</div>
          <img src="/mascot/topsi_happy.png" className="lobby-topsi" alt="Topsi" draggable={false} />
        </div>
        <MememoryTitle size="large" animate />
        <p className="lobby-tagline">{t('lobby.tagline')}</p>
      </div>

      <div className="lobby-card">
        <h2>{t('lobby.join.heading')}</h2>
        <p>{t('lobby.join.subheading')}</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('lobby.join.namePlaceholder')}
          maxLength={20}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <button className="lobby-play-btn" onClick={handleSubmit} disabled={!name.trim() || !isConnected}>
          {isConnected ? t('lobby.join.button') : t('lobby.join.connecting')}
        </button>
      </div>

      {/* Magical themes preview — five worlds floating below the join card */}
      <div className="lobby-themes" aria-hidden>
        <div className="lobby-themes-label">
          <span className="themes-star">🌟</span>
          {t('lobby.themes.label')}
          <span className="themes-star">🌟</span>
        </div>
        <div className="lobby-themes-row">
          {CATEGORIES.map((cat, i) => (
            <div
              key={cat.id}
              className="theme-chip"
              style={{ '--i': i, '--n': CATEGORIES.length } as React.CSSProperties}
            >
              <div className="theme-chip-art">
                <img src={`/cards/${cat.id}/_cover.png`} alt="" draggable={false} />
                <div className="theme-chip-glow" />
              </div>
              <span className="theme-chip-name">{t(`category.${cat.id}.label`)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="lobby-rules">
        <p className="lobby-rules-heading">{t('lobby.rules.heading')}</p>
        <div className="lobby-rules-row">
          {RULES.map((rule, i) => {
            const isFlipped = flippedRules[i];
            return (
              <button
                key={i}
                type="button"
                className={`rule-card ${isFlipped ? 'is-flipped' : ''}`}
                onClick={() => toggleRule(i)}
                aria-pressed={isFlipped}
                aria-label={t(rule.textKey)}
                style={{ '--i': i } as React.CSSProperties}
              >
                <div className="rule-card-inner">
                  <div className="rule-card-front">
                    <img src="/cards/card-back.png" alt="" draggable={false} />
                  </div>
                  <div className="rule-card-back">
                    <span className="rule-card-icon">{rule.icon}</span>
                    <span className="rule-card-text">{t(rule.textKey)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="lobby-spectate">
        {!showSpectate ? (
          <button className="btn-spectate-toggle" onClick={() => setShowSpectate(true)}>
            {t('lobby.spectate.toggle')}
          </button>
        ) : (
          <div className="spectate-form">
            <input
              type="text"
              value={spectateCode}
              onChange={(e) => setSpectateCode(e.target.value.toUpperCase())}
              placeholder={t('lobby.spectate.placeholder')}
              maxLength={5}
              onKeyDown={(e) => e.key === 'Enter' && spectateCode.trim() && onSpectate(spectateCode.trim())}
            />
            <button
              onClick={() => spectateCode.trim() && onSpectate(spectateCode.trim())}
              disabled={!spectateCode.trim() || !isConnected}
            >
              {t('lobby.spectate.button')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
