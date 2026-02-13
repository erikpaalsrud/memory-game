import { Card } from './Card';
import { ScoreBoard } from './ScoreBoard';
import { GRID_COLS } from 'memory-game-shared';
import type { ClientGameState } from 'memory-game-shared';

interface Props {
  gameState: ClientGameState;
  myPlayerId: string;
  isMyTurn: boolean;
  onFlipCard: (cardId: number) => void;
  error: string | null;
  imageExtension: string;
  matchedCardIds: number[];
  stillYourTurn: boolean;
}

export function GameBoard({
  gameState,
  myPlayerId,
  isMyTurn,
  onFlipCard,
  error,
  imageExtension,
  matchedCardIds,
  stillYourTurn,
}: Props) {
  let turnText: string;
  let turnClass = '';

  if (stillYourTurn && isMyTurn) {
    turnText = 'Match! Still your turn — go again!';
    turnClass = 'your-turn still-turn';
  } else if (isMyTurn) {
    turnText = 'Your turn — pick a card!';
    turnClass = 'your-turn';
  } else {
    turnText = "Opponent's turn...";
  }

  return (
    <div className="game-container">
      <ScoreBoard
        players={gameState.players}
        currentTurnPlayerId={gameState.currentTurnPlayerId}
        myPlayerId={myPlayerId}
      />

      <div className={`turn-indicator ${turnClass}`}>
        {turnText}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div
        className="game-board"
        style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
      >
        {gameState.cards.map((card) => (
          <Card
            key={card.id}
            card={card}
            onClick={() => onFlipCard(card.id)}
            disabled={!isMyTurn || card.state !== 'face-down'}
            imageExtension={imageExtension}
            justMatched={matchedCardIds.includes(card.id)}
          />
        ))}
      </div>

      <div className="pairs-remaining">
        {gameState.pairsRemaining} pairs remaining
      </div>
    </div>
  );
}
