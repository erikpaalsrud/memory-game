import { useState } from 'react';

interface Props {
  onJoin: (name: string) => void;
  onSpectate: (code: string) => void;
  isConnected: boolean;
}

const EMOJIS = ['🃏', '🧠', '⭐', '🎮', '🏆', '✨', '🎯', '🔮', '🌟', '💎', '🎪', '🦄'];

export function Lobby({ onJoin, onSpectate, isConnected }: Props) {
  const [name, setName] = useState('');
  const [spectateCode, setSpectateCode] = useState('');
  const [showSpectate, setShowSpectate] = useState(false);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (trimmed) onJoin(trimmed);
  };

  return (
    <div className="lobby">
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

      {/* Floating card backs */}
      <div className="lobby-cards-bg" aria-hidden>
        <div className="floating-card fc-1"><img src="/cards/card-back.svg" alt="" /></div>
        <div className="floating-card fc-2"><img src="/cards/card-back.svg" alt="" /></div>
        <div className="floating-card fc-3"><img src="/cards/card-back.svg" alt="" /></div>
        <div className="floating-card fc-4"><img src="/cards/card-back.svg" alt="" /></div>
      </div>

      {/* Sparkle dots */}
      <div className="lobby-sparkles" aria-hidden>
        {Array.from({ length: 20 }, (_, i) => (
          <span
            key={i}
            className="sparkle"
            style={{
              '--sx': `${5 + Math.random() * 90}%`,
              '--sy': `${5 + Math.random() * 90}%`,
              '--sd': `${2 + Math.random() * 4}s`,
              '--sdelay': `${Math.random() * 5}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="lobby-hero">
        <div className="lobby-emoji-row" aria-hidden>
          <span className="hero-emoji he-1">🃏</span>
          <span className="hero-emoji he-2">✨</span>
        </div>
        <h1 className="lobby-title">
          {'Mememory'.split('').map((letter, i) => (
            <span key={i} className="title-letter" style={{ animationDelay: `${i * 0.08}s` }}>
              {letter}
            </span>
          ))}
        </h1>
        <p className="lobby-tagline">The classic card game — now multiplayer</p>
        <div className="lobby-emoji-row" aria-hidden>
          <span className="hero-emoji he-3">🧠</span>
          <span className="hero-emoji he-4">⭐</span>
        </div>
      </div>

      <div className="lobby-card">
        <h2>Join a Game</h2>
        <p>Enter your name to challenge an opponent</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What's your name?"
          maxLength={20}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <button className="lobby-play-btn" onClick={handleSubmit} disabled={!name.trim() || !isConnected}>
          {isConnected ? '🎮 Find Game' : 'Connecting...'}
        </button>
      </div>

      <div className="lobby-info">
        <div className="info-step">
          <span className="info-icon bounce-1">🃏</span>
          <span>Flip cards to reveal images</span>
        </div>
        <div className="info-step">
          <span className="info-icon bounce-2">🧠</span>
          <span>Remember & find matching pairs</span>
        </div>
        <div className="info-step">
          <span className="info-icon bounce-3">🏆</span>
          <span>Outscore your opponent to win!</span>
        </div>
      </div>

      <div className="lobby-spectate">
        {!showSpectate ? (
          <button className="btn-spectate-toggle" onClick={() => setShowSpectate(true)}>
            👀 Watch a game
          </button>
        ) : (
          <div className="spectate-form">
            <input
              type="text"
              value={spectateCode}
              onChange={(e) => setSpectateCode(e.target.value.toUpperCase())}
              placeholder="Enter watch code"
              maxLength={5}
              onKeyDown={(e) => e.key === 'Enter' && spectateCode.trim() && onSpectate(spectateCode.trim())}
            />
            <button
              onClick={() => spectateCode.trim() && onSpectate(spectateCode.trim())}
              disabled={!spectateCode.trim() || !isConnected}
            >
              Watch
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
