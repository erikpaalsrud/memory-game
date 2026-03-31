import { useState, useEffect, useRef } from 'react';
import type { ClientGameState } from 'memory-game-shared';

type TopsiMood =
  | 'idle'
  | 'happy'
  | 'sad'
  | 'excited'
  | 'battle'
  | 'streak'
  | 'nervous'
  | 'shocked'
  | 'thinking'
  | 'sleeping'
  | 'sudden_death'
  | 'victory'
  | 'defeat';

interface Props {
  gameState: ClientGameState;
  myPlayerId: string;
  isMyTurn: boolean;
  matchedCardIds: number[];
  stillYourTurn: boolean;
  suddenDeath: boolean;
}

function getMood(
  gameState: ClientGameState,
  myPlayerId: string,
  isMyTurn: boolean,
  matchedCardIds: number[],
  stillYourTurn: boolean,
  suddenDeath: boolean,
  streakCount: number
): TopsiMood {
  if (suddenDeath) return 'sudden_death';

  const me = gameState.players.find((p) => p.id === myPlayerId);
  const opponent = gameState.players.find((p) => p.id !== myPlayerId);
  if (!me || !opponent) return 'idle';

  const pairsLeft = gameState.pairsRemaining;
  const scoreDiff = me.score - opponent.score;

  // Just matched a pair
  if (matchedCardIds.length > 0 && stillYourTurn) {
    if (streakCount >= 2) return 'streak';
    return 'happy';
  }

  // Opponent just matched (we see matched cards but it's not our turn and not stillYourTurn)
  if (matchedCardIds.length > 0 && !stillYourTurn && !isMyTurn) {
    return 'sad';
  }

  // Close game, few pairs left
  if (pairsLeft <= 3 && Math.abs(scoreDiff) <= 1) return 'nervous';

  // Winning comfortably
  if (scoreDiff >= 3) return 'excited';

  // Losing badly
  if (scoreDiff <= -3) return 'sad';

  // My turn
  if (isMyTurn) return 'thinking';

  // Opponent's turn — waiting
  return 'sleeping';
}

export function Topsi({
  gameState,
  myPlayerId,
  isMyTurn,
  matchedCardIds,
  stillYourTurn,
  suddenDeath,
}: Props) {
  const [mood, setMood] = useState<TopsiMood>('idle');
  const [prevMood, setPrevMood] = useState<TopsiMood>('idle');
  const streakRef = useRef(0);
  const prevTurnRef = useRef(isMyTurn);

  // Track match streaks
  useEffect(() => {
    if (stillYourTurn && matchedCardIds.length > 0) {
      streakRef.current++;
    } else if (isMyTurn !== prevTurnRef.current) {
      // Turn changed — reset streak
      streakRef.current = 0;
    }
    prevTurnRef.current = isMyTurn;
  }, [stillYourTurn, matchedCardIds, isMyTurn]);

  useEffect(() => {
    const newMood = getMood(
      gameState,
      myPlayerId,
      isMyTurn,
      matchedCardIds,
      stillYourTurn,
      suddenDeath,
      streakRef.current
    );
    if (newMood !== mood) {
      setPrevMood(mood);
      setMood(newMood);
    }
  }, [gameState, myPlayerId, isMyTurn, matchedCardIds, stillYourTurn, suddenDeath]);

  const changed = mood !== prevMood;

  return (
    <div className={`topsi-container ${changed ? 'topsi-changed' : ''}`}>
      <img
        src={`/mascot/topsi_${mood}.png`}
        alt={`Topsi is ${mood}`}
        className="topsi-img"
        draggable={false}
      />
    </div>
  );
}
