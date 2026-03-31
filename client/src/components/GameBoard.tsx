import { Card } from './Card';
import { ScoreBoard } from './ScoreBoard';
import { GRID_COLS, GRID_CELLS, CENTER_CELL } from 'memory-game-shared';
import type { ClientGameState } from 'memory-game-shared';
import type { SuddenDeathPhase } from '../hooks/useGame';

interface Props {
  gameState: ClientGameState;
  myPlayerId: string;
  isMyTurn: boolean;
  onFlipCard: (cardId: number) => void;
  error: string | null;
  imageExtension: string;
  matchedCardIds: number[];
  stillYourTurn: boolean;
  suddenDeathPhase: SuddenDeathPhase;
  coinTossWinnerId: string | null;
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
  suddenDeathPhase,
  coinTossWinnerId,
}: Props) {
  const remainingCards = gameState.cards.filter((c) => c.state !== 'matched');
  const coinTossWinner = gameState.players.find((p) => p.id === coinTossWinnerId);

  // --- Sudden Death: Transition (cards morph to hand + shuffle) ---
  if (suddenDeathPhase === 'transition') {
    return (
      <div className="game-container">
        <ScoreBoard
          players={gameState.players}
          currentTurnPlayerId={gameState.currentTurnPlayerId}
          myPlayerId={myPlayerId}
        />
        <div className="sd-overlay">
          <h2 className="sd-title">SUDDEN DEATH</h2>
          <p className="sd-subtitle">Shuffling remaining cards...</p>
          <div className="sd-shuffle-hand">
            {remainingCards.map((card, i) => (
              <div
                key={card.id}
                className="sd-shuffle-card"
                style={{
                  '--i': i,
                  '--n': remainingCards.length,
                  '--angle': `${(i - (remainingCards.length - 1) / 2) * 8}deg`,
                } as React.CSSProperties}
              >
                <img src={`/cards/card-back.${imageExtension}`} alt="Card" draggable={false} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Sudden Death: Coin Toss ---
  if (suddenDeathPhase === 'coin-toss') {
    return (
      <div className="game-container">
        <ScoreBoard
          players={gameState.players}
          currentTurnPlayerId={gameState.currentTurnPlayerId}
          myPlayerId={myPlayerId}
        />
        <div className="sd-overlay">
          <div className="coin-toss">
            <div className="coin">
              <div className="coin-face coin-front">?</div>
              <div className="coin-face coin-back-side">!</div>
            </div>
          </div>
          <div className="coin-result">
            <span className="coin-winner-name">{coinTossWinner?.name}</span>
            <span className="coin-goes-first">goes first!</span>
          </div>
        </div>
      </div>
    );
  }

  // --- Sudden Death: Playing (hand of cards) ---
  if (suddenDeathPhase === 'playing') {
    let turnText: string;
    let turnClass = 'sd-turn';

    if (isMyTurn) {
      turnText = 'Your turn — find a match to win!';
      turnClass = 'sd-turn your-turn';
    } else {
      turnText = "Opponent's turn...";
      turnClass = 'sd-turn';
    }

    return (
      <div className="game-container">
        <ScoreBoard
          players={gameState.players}
          currentTurnPlayerId={gameState.currentTurnPlayerId}
          myPlayerId={myPlayerId}
        />

        <div className={`turn-indicator ${turnClass}`}>{turnText}</div>

        {error && <div className="error-message">{error}</div>}

        <div className="sd-banner">SUDDEN DEATH — Next match wins!</div>

        <div className="sd-hand">
          {remainingCards.map((card) => (
            <div key={card.id} className="sd-hand-slot">
              <Card
                card={card}
                onClick={() => onFlipCard(card.id)}
                disabled={!isMyTurn || card.state !== 'face-down'}
                imageExtension={imageExtension}
                justMatched={matchedCardIds.includes(card.id)}
              />
            </div>
          ))}
        </div>

        <div className="pairs-remaining">{gameState.pairsRemaining} pairs remaining</div>
      </div>
    );
  }

  // --- Normal Grid Play ---
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

  // Build 5x5 grid cells with center empty
  const gridCells = [];
  let cardIndex = 0;
  for (let i = 0; i < GRID_CELLS; i++) {
    if (i === CENTER_CELL) {
      gridCells.push(<div key="center" className="center-cell" />);
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

      <div className={`turn-indicator ${turnClass}`}>{turnText}</div>

      {error && <div className="error-message">{error}</div>}

      <div className="game-board-wrapper">
        <div
          className="game-board"
          style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
        >
          {gridCells}
        </div>
      </div>

      <div className="pairs-remaining">{gameState.pairsRemaining} pairs remaining</div>
    </div>
  );
}
