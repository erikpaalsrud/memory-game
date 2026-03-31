interface Props {
  size?: 'large' | 'compact';
  animate?: boolean;
}

const LETTERS = 'Mememory'.split('');

export function MememoryTitle({ size = 'large', animate = true }: Props) {
  if (size === 'compact') {
    return (
      <h1 className="mememory-title compact">
        {LETTERS.map((letter, i) => (
          <span key={i} className="mm-letter">
            {letter}
          </span>
        ))}
      </h1>
    );
  }

  return (
    <h1 className="mememory-title">
      {LETTERS.map((letter, i) => (
        <span
          key={i}
          className={`mm-letter ${animate ? 'mm-animate' : ''}`}
          style={animate ? { animationDelay: `${i * 0.08}s` } : undefined}
        >
          {letter}
        </span>
      ))}
    </h1>
  );
}
