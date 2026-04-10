import { CATEGORIES, type CategoryId, type ClientGameState } from 'memory-game-shared';
import { useTranslation } from '../i18n/LanguageContext';

interface Props {
  gameState: ClientGameState;
  myPlayerId: string;
  onSelect: (category: CategoryId) => void;
}

/**
 * Shown after matchmaking, before the game begins. The coin-flip loser
 * (gameState.categorySelectorId) gets to pick a category — fair compensation
 * for not getting the first move. The other player sees a waiting view.
 */
export function CategoryPicker({ gameState, myPlayerId, onSelect }: Props) {
  const { t } = useTranslation();
  const isSelector = gameState.categorySelectorId === myPlayerId;
  const otherPlayer = gameState.players.find((p) => p.id !== myPlayerId);
  const starter = gameState.players.find((p) => p.id === gameState.currentTurnPlayerId);
  const isStarter = starter?.id === myPlayerId;

  if (!isSelector) {
    return (
      <div className="category-waiting">
        <div className="category-waiting-inner">
          <div className="cw-coin">🪙</div>
          <h2 className="cw-title">
            {isStarter
              ? t('category.youGoFirst')
              : t('category.otherGoesFirst', { name: starter?.name ?? '' })}
          </h2>
          <p className="cw-subtitle">
            {t('category.waitingForChoice', { name: otherPlayer?.name ?? '' })}
          </p>
          <div className="cw-dots" aria-hidden>
            <span /><span /><span />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="category-picker">
      <div className="cp-header">
        <div className="cp-coin">🪙</div>
        <h2 className="cp-title">
          {t('category.otherGoesFirst', { name: starter?.name ?? '' })}
        </h2>
        <p className="cp-subtitle">{t('category.chooseDeck')}</p>
      </div>

      <div className="cp-grid">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className="cp-tile"
            onClick={() => onSelect(cat.id)}
            type="button"
          >
            <div className="cp-tile-art">
              <img
                src={`/cards/${cat.id}/_cover.png`}
                alt=""
                draggable={false}
                onError={(e) => {
                  // Hide broken image gracefully if covers haven't been generated yet
                  (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
                }}
              />
            </div>
            <div className="cp-tile-body">
              <h3 className="cp-tile-title">{t(`category.${cat.id}.label`)}</h3>
              <p className="cp-tile-blurb">{t(`category.${cat.id}.blurb`)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
