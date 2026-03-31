import { useState } from 'react';

interface Props {
  onJoin: (name: string) => void;
  isConnected: boolean;
}

export function Lobby({ onJoin, isConnected }: Props) {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (trimmed) onJoin(trimmed);
  };

  return (
    <div className="lobby">
      {/* Floating card decorations */}
      <div className="lobby-cards-bg" aria-hidden>
        <div className="floating-card fc-1" />
        <div className="floating-card fc-2" />
        <div className="floating-card fc-3" />
        <div className="floating-card fc-4" />
        <div className="floating-card fc-5" />
        <div className="floating-card fc-6" />
      </div>

      <div className="lobby-hero">
        <h1 className="lobby-title">
          {'Mememory'.split('').map((letter, i) => (
            <span key={i} className="title-letter" style={{ animationDelay: `${i * 0.08}s` }}>
              {letter}
            </span>
          ))}
        </h1>
        <p className="lobby-tagline">The classic card game — now multiplayer</p>
      </div>

      <div className="lobby-card">
        <h2>Join a Game</h2>
        <p>Enter your name to find an opponent</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={20}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <button onClick={handleSubmit} disabled={!name.trim() || !isConnected}>
          {isConnected ? 'Find Game' : 'Connecting...'}
        </button>
      </div>

      <div className="lobby-info">
        <div className="info-step">
          <span className="info-icon">&#127183;</span>
          <span>Flip cards to reveal images</span>
        </div>
        <div className="info-step">
          <span className="info-icon">&#129504;</span>
          <span>Remember positions & find matching pairs</span>
        </div>
        <div className="info-step">
          <span className="info-icon">&#9876;</span>
          <span>Outscore your opponent to win</span>
        </div>
      </div>
    </div>
  );
}
