import type { ClientGameState } from 'memory-game-shared';
import { useTranslation } from '../i18n/LanguageContext';

interface Props {
  gameState: ClientGameState | null;
  myPlayerId: string | null;
  opponentLeft: boolean;
  rematchWaiting: boolean;
  opponentWantsRematch: boolean;
  onRematch: () => void;
  onPlayAgain: () => void;
  onLeave: () => void;
}

export function GameOver({
  gameState,
  myPlayerId,
  opponentLeft,
  rematchWaiting,
  opponentWantsRematch,
  onRematch,
  onPlayAgain,
  onLeave,
}: Props) {
  const { t } = useTranslation();

  if (opponentLeft) {
    return (
      <div className="game-over">
        <div className="game-over-card">
          <h2>{t('gameover.opponentLeft.title')}</h2>
          <p>{t('gameover.opponentLeft.body')}</p>
          <div className="game-over-actions">
            <button onClick={onPlayAgain}>{t('gameover.findNew')}</button>
            <button className="btn-secondary" onClick={onLeave}>{t('gameover.backToLobby')}</button>
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
    resultText = t('gameover.draw');
    resultClass = 'draw';
  } else if (gameState.winnerId === myPlayerId) {
    resultText = t('gameover.win');
    resultClass = 'win';
  } else {
    resultText = t('gameover.loss');
    resultClass = 'loss';
  }

  // Rematch button label + state depend on who's requested:
  //   - Neither      → "Rematch"
  //   - I requested  → "✓ Waiting for opponent…" (disabled, green)
  //   - They requested → "✨ Accept Rematch" (highlighted, pulsing)
  let rematchLabel: string;
  let rematchClass = 'btn-rematch';
  let rematchDisabled = false;
  if (rematchWaiting) {
    rematchLabel = t('gameover.rematch.waiting');
    rematchClass = 'btn-rematch is-waiting';
    rematchDisabled = true;
  } else if (opponentWantsRematch) {
    rematchLabel = t('gameover.rematch.accept');
    rematchClass = 'btn-rematch is-incoming';
  } else {
    rematchLabel = t('gameover.rematch');
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
          <span className="vs">{t('gameover.vs')}</span>
          <div className="final-score">
            <span className="final-name">{opponent?.name ?? 'Opponent'}</span>
            <span className="final-points">{opponent?.score ?? 0}</span>
          </div>
        </div>

        {opponentWantsRematch && !rematchWaiting && (
          <div className="rematch-banner">
            <span className="rematch-banner-icon">⚔️</span>
            <span className="rematch-banner-text">
              <strong>{opponent?.name ?? ''}</strong> {t('gameover.rematch.banner.suffix')}
            </span>
          </div>
        )}

        <div className="game-over-actions">
          <button className={rematchClass} onClick={onRematch} disabled={rematchDisabled}>
            {rematchLabel}
          </button>
          <button onClick={onPlayAgain}>{t('gameover.findNew')}</button>
          <button className="btn-secondary" onClick={onLeave}>{t('gameover.backToLobby')}</button>
        </div>
      </div>
    </div>
  );
}
