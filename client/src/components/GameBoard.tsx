import { Card } from './Card';
import { ScoreBoard } from './ScoreBoard';
import { GRID_COLS, GRID_CELLS, CENTER_CELL } from 'memory-game-shared';
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
  suddenDeath: boolean;
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
  suddenDeath,
}: Props) {
  let turnText: string;
  let turnClass = '';

  if (suddenDeath) {
    if (isMyTurn) {
      turnText = 'SUDDEN DEATH — your turn!';
      turnClass = 'your-turn sudden-death-turn';
    } else {
      turnText = "SUDDEN DEATH — opponent's turn...";
      turnClass = 'sudden-death-turn';
    }
  } else if (stillYourTurn && isMyTurn) {
    turnText = 'Match! Still your turn — go again!';
    turnClass = 'your-turn still-turn';
  } else if (isMyTurn) {
    turnText = 'Your turn — pick a card!';
    turnClass = 'your-turn';
  } else {
    turnText = "Opponent's turn...";
  }

  // Build grid cells: 25 positions, with center empty
  const gridCells = [];
  let cardIndex = 0;
  for (let i = 0; i < GRID_CELLS; i++) {
    if (i === CENTER_CELL) {
      gridCells.push(
        <div key="center" className={`center-cell ${suddenDeath ? 'sudden-death-center' : ''}`}>
          {suddenDeath && <span className="skull-icon">&#9760;</span>}
        </div>
      );
    } else {
      const card = gameState.cards[cardIndex];
      gridCells.push(
        <Card
          key={card.id}
          card={card}
          onClick={() => onFlipCard(card.id)}
          disabled={!isMyTurn || card.state !== 'face-down'}
          imageExtension={imageExtension}
          justMatched={matchedCardIds.includes(card.id)}
        />
      );
      cardIndex++;
    }
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

      {suddenDeath && (
        <div className="sudden-death-banner">
          SUDDEN DEATH — Next match wins!
        </div>
      )}

      <div className={`game-board-wrapper ${suddenDeath ? 'sudden-death' : ''}`}>
        <div
          className="game-board"
          style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
        >
          {gridCells}
        </div>
      </div>

      <div className="pairs-remaining">
        {gameState.pairsRemaining} pairs remaining
      </div>
    </div>
  );
}
