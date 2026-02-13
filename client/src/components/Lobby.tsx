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
    </div>
  );
}
