import type { Player } from 'memory-game-shared';

interface Props {
  players: [Player, Player];
  currentTurnPlayerId: string;
  myPlayerId: string;
  scoreMultipliers?: { [playerId: string]: number };
}

export function ScoreBoard({ players, currentTurnPlayerId, myPlayerId, scoreMultipliers }: Props) {
  return (
    <div className="scoreboard">
      {players.map((player) => {
        const isMe = player.id === myPlayerId;
        const isTurn = player.id === currentTurnPlayerId;
        const multiplier = scoreMultipliers?.[player.id] ?? 1;

        return (
          <div key={player.id} className={`player-score ${isTurn ? 'active' : ''} ${isMe ? 'is-me' : ''}`}>
            <span className="player-name">
              {player.name}
              {isMe && <span className="you-tag"> (you)</span>}
            </span>
            <span className="score">
              {player.score}
              {multiplier > 1 && (
                <span className="score-multiplier-badge" aria-label={`${multiplier}× multiplier`}>
                  ×{multiplier}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
