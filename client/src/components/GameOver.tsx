import type { ClientGameState } from 'memory-game-shared';

interface Props {
  gameState: ClientGameState | null;
  myPlayerId: string | null;
  opponentLeft: boolean;
  onPlayAgain: () => void;
  onLeave: () => void;
}

export function GameOver({ gameState, myPlayerId, opponentLeft, onPlayAgain, onLeave }: Props) {
  if (opponentLeft) {
    return (
      <div className="game-over">
        <div className="game-over-card">
          <h2>Opponent Left</h2>
          <p>Your opponent disconnected from the game.</p>
          <div className="game-over-actions">
            <button onClick={onPlayAgain}>Play Again</button>
            <button className="btn-secondary" onClick={onLeave}>Back to Lobby</button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) return null;

  const me = gameState.players.find((p) => p.id === myPlayerId);
  const opponent = gameState.players.find((p) => p.id !== myPlayerId);

  let resultText: string;
  let resultClass: string;

  if (gameState.winnerId === null) {
    resultText = "It's a Draw!";
    resultClass = 'draw';
  } else if (gameState.winnerId === myPlayerId) {
    resultText = 'You Won!';
    resultClass = 'win';
  } else {
    resultText = 'You Lost';
    resultClass = 'loss';
  }

  return (
    <div className="game-over">
      <div className="game-over-card">
        <h2 className={`result-${resultClass}`}>{resultText}</h2>

        <div className="final-scores">
          <div className="final-score">
            <span className="final-name">{me?.name ?? 'You'}</span>
            <span className="final-points">{me?.score ?? 0}</span>
          </div>
          <span className="vs">vs</span>
          <div className="final-score">
            <span className="final-name">{opponent?.name ?? 'Opponent'}</span>
            <span className="final-points">{opponent?.score ?? 0}</span>
          </div>
        </div>

        <div className="game-over-actions">
          <button onClick={onPlayAgain}>Play Again</button>
          <button className="btn-secondary" onClick={onLeave}>Back to Lobby</button>
        </div>
      </div>
    </div>
  );
}
