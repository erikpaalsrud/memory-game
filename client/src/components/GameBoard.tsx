import { Card } from './Card';
import { ScoreBoard } from './ScoreBoard';
import { Topsi } from './Topsi';
import { GRID_COLS, GRID_CELLS, CENTER_CELL } from 'memory-game-shared';
import type { ClientGameState } from 'memory-game-shared';
import type { SuddenDeathPhase } from '../hooks/useGame';
import { useTranslation } from '../i18n/LanguageContext';

interface Props {
  gameState: ClientGameState;
  myPlayerId: string;
  isMyTurn: boolean;
  isSpectator: boolean;
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
  isSpectator,
  onFlipCard,
  error,
  imageExtension,
  matchedCardIds,
  stillYourTurn,
  suddenDeathPhase,
  coinTossWinnerId,
}: Props) {
  const { t } = useTranslation();
  const canInteract = isMyTurn && !isSpectator;
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
          <h2 className="sd-title">{t('sd.title')}</h2>
          <p className="sd-subtitle">{t('sd.shuffling')}</p>
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
            <span className="coin-goes-first">{t('sd.goesFirst')}</span>
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
      turnText = t('sd.turnYours');
      turnClass = 'sd-turn your-turn';
    } else {
      turnText = t('game.turn.opponent');
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

        <div className="sd-banner">{t('sd.banner')}</div>

        <div className="sd-hand">
          {remainingCards.map((card) => (
            <div key={card.id} className="sd-hand-slot">
              <Card
                card={card}
                category={gameState.category}
                onClick={() => onFlipCard(card.id)}
                disabled={!canInteract || card.state !== 'face-down'}
                imageExtension={imageExtension}
                justMatched={matchedCardIds.includes(card.id)}
              />
            </div>
          ))}
        </div>

        <div className="pairs-remaining">{t('game.pairsRemaining', { n: gameState.pairsRemaining })}</div>
      </div>
    );
  }

  // --- Normal Grid Play ---
  const currentPlayer = gameState.players.find((p) => p.id === gameState.currentTurnPlayerId);
  let turnText: string;
  let turnClass = '';

  if (isSpectator) {
    turnText = t('game.turn.spectator', { name: currentPlayer?.name ?? '' });
    turnClass = '';
  } else if (stillYourTurn && isMyTurn) {
    turnText = t('game.turn.yoursAgain');
    turnClass = 'your-turn still-turn';
  } else if (isMyTurn) {
    turnText = t('game.turn.yours');
    turnClass = 'your-turn';
  } else {
    turnText = t('game.turn.opponent');
  }

  // Build 5x5 grid cells with center empty
  const gridCells = [];
  let cardIndex = 0;
  for (let i = 0; i < GRID_CELLS; i++) {
    if (i === CENTER_CELL) {
      gridCells.push(
        <div key="center" className="center-cell">
          <Topsi
            gameState={gameState}
            myPlayerId={myPlayerId}
            isMyTurn={isMyTurn}
            matchedCardIds={matchedCardIds}
            stillYourTurn={stillYourTurn}
            suddenDeath={suddenDeathPhase !== null}
          />
        </div>
      );
    } else {
      const card = gameState.cards[cardIndex];
      gridCells.push(
        <Card
          key={card.id}
          card={card}
          category={gameState.category}
          onClick={() => onFlipCard(card.id)}
          disabled={!canInteract || card.state !== 'face-down'}
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

      <div className="pairs-remaining">{t('game.pairsRemaining', { n: gameState.pairsRemaining })}</div>

      {isSpectator && <div className="spectator-badge">{t('game.spectatorBadge')}</div>}

      {!isSpectator && gameState.spectateCode && (
        <div className="spectate-code">
          <span>{t('game.spectateCode')} <strong>{gameState.spectateCode}</strong></span>
          <button
            className="btn-copy"
            onClick={() => {
              const url = `${window.location.origin}?watch=${gameState.spectateCode}`;
              navigator.clipboard.writeText(url).catch(() => {});
            }}
          >
            {t('game.copyLink')}
          </button>
        </div>
      )}
    </div>
  );
}
