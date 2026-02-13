import type { ClientCardInstance } from 'memory-game-shared';

interface Props {
  card: ClientCardInstance;
  onClick: () => void;
  disabled: boolean;
  imageExtension: string;
  justMatched: boolean;
}

export function Card({ card, onClick, disabled, imageExtension, justMatched }: Props) {
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
          {card.imageId && (
            <img
              src={`/cards/${card.imageId}.${ext}`}
              alt={card.label ?? ''}
              draggable={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}
