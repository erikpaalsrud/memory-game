import type { CategoryId, ClientCardInstance } from 'memory-game-shared';

interface Props {
  card: ClientCardInstance;
  category: CategoryId | null;
  onClick: () => void;
  disabled: boolean;
  imageExtension: string;
  justMatched: boolean;
}

export function Card({ card, category, onClick, disabled, imageExtension, justMatched }: Props) {
  const isRevealed = card.state === 'face-up' || card.state === 'matched';
  const ext = imageExtension;

  const classes = [
    'card-container',
    card.state,
    disabled ? 'disabled' : '',
    justMatched ? 'just-matched' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Cards live under per-category folders. The card-back is shared across categories.
  const faceSrc = card.imageId && category
    ? `/cards/${category}/${card.imageId}.${ext}`
    : null;

  return (
    <div
      className={classes}
      onClick={disabled ? undefined : onClick}
      role="button"
      aria-label={isRevealed ? card.label ?? 'Card' : 'Face-down card'}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className={`card-inner ${isRevealed ? 'flipped' : ''}`}>
        <div className="card-front">
          <img src={`/cards/card-back.${ext}`} alt="Card back" draggable={false} />
        </div>
        <div className="card-back-face">
          {faceSrc && (
            <img
              src={faceSrc}
              alt={card.label ?? ''}
              draggable={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}
