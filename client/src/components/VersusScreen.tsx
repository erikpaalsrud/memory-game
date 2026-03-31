import type { ClientGameState } from 'memory-game-shared';

interface Props {
  gameState: ClientGameState;
  myPlayerId: string;
}

export function VersusScreen({ gameState, myPlayerId }: Props) {
  const [p1, p2] = gameState.players;
  const startsFirst = gameState.players.find(
    (p) => p.id === gameState.currentTurnPlayerId
  );
  const isMe = startsFirst?.id === myPlayerId;

  return (
    <div className="versus-screen">
      <div className="versus-players">
        <div className={`versus-player versus-p1 ${p1.id === myPlayerId ? 'is-me' : ''}`}>
          <span className="versus-name">{p1.name}</span>
          {p1.id === myPlayerId && <span className="versus-you">you</span>}
        </div>

        <div className="versus-vs">
          <span>VS</span>
        </div>

        <div className={`versus-player versus-p2 ${p2.id === myPlayerId ? 'is-me' : ''}`}>
          <span className="versus-name">{p2.name}</span>
          {p2.id === myPlayerId && <span className="versus-you">you</span>}
        </div>
      </div>

      <div className="versus-coin-section">
        <div className="versus-coin">
          <div className="coin-face coin-front">?</div>
          <div className="coin-face coin-back-side">!</div>
        </div>
      </div>

      <div className="versus-result">
        <span className="versus-starter-name">{startsFirst?.name}</span>
        <span className="versus-starts-text">
          {isMe ? 'You start!' : 'starts first'}
        </span>
      </div>

      <div className="versus-ready">Get ready...</div>
    </div>
  );
}
