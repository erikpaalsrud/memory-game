import type { Player } from 'memory-game-shared';

interface Props {
  players: [Player, Player];
  currentTurnPlayerId: string;
  myPlayerId: string;
}

export function ScoreBoard({ players, currentTurnPlayerId, myPlayerId }: Props) {
  return (
    <div className="scoreboard">
      {players.map((player) => {
        const isMe = player.id === myPlayerId;
        const isTurn = player.id === currentTurnPlayerId;

        return (
          <div key={player.id} className={`player-score ${isTurn ? 'active' : ''} ${isMe ? 'is-me' : ''}`}>
            <span className="player-name">
              {player.name}
              {isMe && <span className="you-tag"> (you)</span>}
            </span>
            <span className="score">{player.score}</span>
          </div>
        );
      })}
    </div>
  );
}
