import { useState, useEffect } from 'react';
import type { ClientGameState } from 'memory-game-shared';

interface Props {
  gameState: ClientGameState;
  myPlayerId: string;
}

// Preload lightning frames
const LIGHTNING_FRAMES = Array.from({ length: 20 }, (_, i) => {
  // Files are named lighteningball_1_20_1 through lighteningball_1_20_20
  return `/gfx/lightning_lighteningball_1_20_${i + 1}.png`;
});

// Preload energy frames
const ENERGY_FRAMES = Array.from({ length: 32 }, (_, i) => {
  return `/gfx/energy_aura_test_1_32_${i + 1}.png`;
});

function SpriteAnimation({
  frames,
  fps = 20,
  className,
  delay = 0,
}: {
  frames: string[];
  fps?: number;
  className?: string;
  delay?: number;
}) {
  const [frame, setFrame] = useState(0);
  const [started, setStarted] = useState(delay === 0);

  useEffect(() => {
    if (delay > 0) {
      const t = setTimeout(() => setStarted(true), delay);
      return () => clearTimeout(t);
    }
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % frames.length);
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [started, frames.length, fps]);

  if (!started) return null;

  return (
    <img
      src={frames[frame]}
      className={className}
      alt=""
      draggable={false}
    />
  );
}

export function VersusScreen({ gameState, myPlayerId }: Props) {
  const [p1, p2] = gameState.players;
  const startsFirst = gameState.players.find(
    (p) => p.id === gameState.currentTurnPlayerId
  );
  const isMe = startsFirst?.id === myPlayerId;

  return (
    <div className="versus-screen">
      {/* Impact flash on clash */}
      <div className="vs-flash" aria-hidden />

      {/* Diagonal slash lines with real slash GFX */}
      <div className="vs-slashes" aria-hidden>
        <img src="/gfx/slash_02.png" className="vs-slash-img slash-img-1" alt="" />
        <img src="/gfx/slash_03.png" className="vs-slash-img slash-img-2" alt="" />
      </div>

      {/* Speed lines */}
      <div className="vs-speed-lines" aria-hidden>
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="speed-line"
            style={{
              '--angle': `${i * 30}deg`,
              '--delay': `${0.6 + i * 0.03}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Flare behind VS */}
      <img src="/gfx/flare_01.png" className="vs-flare" alt="" aria-hidden />

      {/* Energy ball aura behind VS text */}
      <div className="vs-energy" aria-hidden>
        <SpriteAnimation frames={ENERGY_FRAMES} fps={24} className="vs-energy-sprite" delay={400} />
      </div>

      {/* Scattered spark/star particles */}
      <div className="vs-particle-layer" aria-hidden>
        <img src="/gfx/spark_01.png" className="vs-gfx-particle vp-1" alt="" />
        <img src="/gfx/spark_04.png" className="vs-gfx-particle vp-2" alt="" />
        <img src="/gfx/spark_06.png" className="vs-gfx-particle vp-3" alt="" />
        <img src="/gfx/star_04.png" className="vs-gfx-particle vp-4" alt="" />
        <img src="/gfx/star_06.png" className="vs-gfx-particle vp-5" alt="" />
        <img src="/gfx/star_08.png" className="vs-gfx-particle vp-6" alt="" />
        <img src="/gfx/magic_04.png" className="vs-gfx-particle vp-7" alt="" />
        <img src="/gfx/magic_05.png" className="vs-gfx-particle vp-8" alt="" />
      </div>

      {/* Player names crash in from sides */}
      <div className="vs-players">
        <div className={`vs-player vs-left ${p1.id === myPlayerId ? 'is-me' : ''}`}>
          <span className="vs-player-name">{p1.name}</span>
          {p1.id === myPlayerId && <span className="vs-player-you">you</span>}
        </div>

        <div className="vs-clash">
          {/* Lightning animation on clash */}
          <div className="vs-lightning" aria-hidden>
            <SpriteAnimation frames={LIGHTNING_FRAMES} fps={20} className="vs-lightning-sprite" delay={450} />
          </div>
          <span className="vs-text">VS</span>
          {/* Impact sparks */}
          <div className="vs-sparks" aria-hidden>
            {Array.from({ length: 8 }, (_, i) => (
              <span
                key={i}
                className="vs-spark"
                style={{
                  '--spark-angle': `${i * 45}deg`,
                  '--spark-dist': `${40 + (i % 3) * 20}px`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        </div>

        <div className={`vs-player vs-right ${p2.id === myPlayerId ? 'is-me' : ''}`}>
          <span className="vs-player-name">{p2.name}</span>
          {p2.id === myPlayerId && <span className="vs-player-you">you</span>}
        </div>
      </div>

      {/* Coin toss */}
      <div className="versus-coin-section">
        <div className="versus-coin">
          <div className="coin-face coin-front">?</div>
          <div className="coin-face coin-back-side">!</div>
        </div>
      </div>

      <div className="versus-result">
        <span className="versus-starter-name">{startsFirst?.name}</span>
        <span className="versus-starts-text">
          {isMe ? 'You start!' : 'starts first'}
        </span>
      </div>

      <div className="versus-ready">Get ready...</div>
    </div>
  );
}
