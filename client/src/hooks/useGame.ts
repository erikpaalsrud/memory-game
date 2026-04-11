import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { CategoryId, ClientGameState, GameMode } from 'memory-game-shared';
import { useSocket } from './useSocket';

interface TopsiPeek {
  cardId: number;
  imageId: string;
  label: string;
  startedAt: number;
}

const TOPSI_PEEK_DURATION_MS = 1400;

export type AppPhase =
  | 'lobby'
  | 'waiting'
  | 'category-select'
  | 'versus'
  | 'playing'
  | 'finished'
  | 'opponent-left'
  | 'spectating';
export type SuddenDeathPhase = null | 'transition' | 'coin-toss' | 'playing';

export interface MegaTriggerEvent {
  level: number;            // 1, 2, or 3
  triggererId: string;
  addedCardIds: number[];
  seq: number;              // re-renders even if level repeats
}

export function useGame() {
  const { socket, isConnected } = useSocket();
  const [phase, setPhase] = useState<AppPhase>('lobby');
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageExtension, setImageExtension] = useState('svg');
  const [matchedCardIds, setMatchedCardIds] = useState<number[]>([]); // cards that just matched (for glow)
  const [stillYourTurn, setStillYourTurn] = useState(false); // true briefly after you match
  const [suddenDeathPhase, setSuddenDeathPhase] = useState<SuddenDeathPhase>(null);
  const [coinTossWinnerId, setCoinTossWinnerId] = useState<string | null>(null);
  const [rematchWaiting, setRematchWaiting] = useState(false);
  const [opponentWantsRematch, setOpponentWantsRematch] = useState(false);
  const [megaTrigger, setMegaTrigger] = useState<MegaTriggerEvent | null>(null);
  const [topsiPeek, setTopsiPeek] = useState<TopsiPeek | null>(null);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [isSpectator, setIsSpectator] = useState(false);
  const [sfxEvent, setSfxEvent] = useState<{ type: string; seq: number }>({ type: '', seq: 0 });
  const stillTurnTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const matchGlowTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sdTransitionRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sdCoinTossRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const versusTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const myPlayerIdRef = useRef<string | null>(null);

  // Check URL for spectate code on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const watchCode = params.get('watch');
    if (watchCode && isConnected) {
      socket.emit('spectator:join', { spectateCode: watchCode });
    }
  }, [isConnected]);

  useEffect(() => {
    socket.on('game:waiting', () => setPhase('waiting'));

    socket.on('game:category-selecting', ({ gameState, yourPlayerId }) => {
      setGameState(gameState);
      setMyPlayerId(yourPlayerId);
      myPlayerIdRef.current = yourPlayerId;
      setRematchWaiting(false);
      setOpponentWantsRematch(false);
      setSuddenDeathPhase(null);
      setCoinTossWinnerId(null);
      setIsSpectator(false);
      setPhase('category-select');
    });

    socket.on('game:start', ({ gameState, yourPlayerId, imageExtension: ext }) => {
      setGameState(gameState);
      setMyPlayerId(yourPlayerId);
      myPlayerIdRef.current = yourPlayerId;
      setImageExtension(ext);
      setRematchWaiting(false);
      setOpponentWantsRematch(false);
      setSuddenDeathPhase(null);
      setCoinTossWinnerId(null);
      setIsSpectator(false);
      setPhase('versus');
      versusTimerRef.current = setTimeout(() => setPhase('playing'), 4500);
    });

    socket.on('game:spectate-start', ({ gameState, imageExtension: ext }) => {
      setGameState(gameState);
      setImageExtension(ext);
      setMyPlayerId(null);
      myPlayerIdRef.current = null;
      setIsSpectator(true);
      // Jump straight to playing if game is in progress, otherwise show state
      if (gameState.phase === 'playing') {
        setPhase('spectating');
      } else {
        setPhase('spectating');
      }
    });

    socket.on('game:spectate-ended', () => {
      setPhase('lobby');
      setGameState(null);
      setIsSpectator(false);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    });

    socket.on('game:rematch-waiting', () => {
      console.log('[rematch] received game:rematch-waiting');
      setRematchWaiting(true);
    });

    socket.on('game:rematch-requested', () => {
      console.log('[rematch] received game:rematch-requested');
      setOpponentWantsRematch(true);
    });

    socket.on('game:mega-triggered', ({ gameState: newState, triggeringPlayerId, megaLevel, addedCardIds }) => {
      console.log(`[mega] wave ${megaLevel} triggered by ${triggeringPlayerId}`);
      setGameState(newState);
      setSfxEvent((e) => ({ type: `mega${megaLevel}`, seq: e.seq + 1 }));
      setMegaTrigger((prev) => ({
        level: megaLevel,
        triggererId: triggeringPlayerId,
        addedCardIds,
        seq: (prev?.seq ?? 0) + 1,
      }));
    });

    socket.on('game:topsi-peek', ({ cardId, imageId, label }) => {
      setTopsiPeek({ cardId, imageId, label, startedAt: Date.now() });
      clearTimeout(peekTimerRef.current);
      peekTimerRef.current = setTimeout(() => setTopsiPeek(null), TOPSI_PEEK_DURATION_MS);
    });

    socket.on('game:state-update', ({ gameState }) => {
      setGameState(gameState);
    });

    socket.on('game:card-flipped', ({ cardId, imageId, label }) => {
      setSfxEvent(e => ({ type: 'flip', seq: e.seq + 1 }));
      setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cards: prev.cards.map((c) =>
            c.id === cardId ? { ...c, imageId, label, state: 'face-up' as const } : c
          ),
        };
      });
    });

    socket.on('game:pair-matched', ({ cardIds, playerId, pointsAwarded }) => {
      setSfxEvent(e => ({ type: 'match', seq: e.seq + 1 }));
      setMatchedCardIds(cardIds);
      clearTimeout(matchGlowTimerRef.current);
      matchGlowTimerRef.current = setTimeout(() => setMatchedCardIds([]), 1500);

      setGameState((prev) => {
        if (!prev) return prev;

        if (playerId === myPlayerIdRef.current) {
          setStillYourTurn(true);
          clearTimeout(stillTurnTimerRef.current);
          stillTurnTimerRef.current = setTimeout(() => setStillYourTurn(false), 2000);
        }

        return {
          ...prev,
          cards: prev.cards.map((c) =>
            cardIds.includes(c.id) ? { ...c, state: 'matched' as const } : c
          ),
          players: prev.players.map((p) =>
            p.id === playerId ? { ...p, score: p.score + pointsAwarded } : p
          ) as [typeof prev.players[0], typeof prev.players[1]],
        };
      });
    });

    socket.on('game:pair-mismatch', ({ cardIds }) => {
      setSfxEvent(e => ({ type: 'mismatch', seq: e.seq + 1 }));
      setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cards: prev.cards.map((c) =>
            cardIds.includes(c.id)
              ? { ...c, imageId: null, label: null, state: 'face-down' as const }
              : c
          ),
        };
      });
    });

    socket.on('game:turn-change', ({ currentTurnPlayerId }) => {
      setGameState((prev) => (prev ? { ...prev, currentTurnPlayerId } : prev));
    });

    socket.on('game:over', ({ gameState }) => {
      setGameState(gameState);
      setPhase(prev => prev === 'spectating' ? 'spectating' : 'finished');
    });

    socket.on('game:sudden-death', ({ coinTossWinnerId: winnerId }) => {
      setSfxEvent(e => ({ type: 'suddenDeath', seq: e.seq + 1 }));
      setCoinTossWinnerId(winnerId);
      setSuddenDeathPhase('transition');

      sdTransitionRef.current = setTimeout(() => setSuddenDeathPhase('coin-toss'), 2500);
      sdCoinTossRef.current = setTimeout(() => setSuddenDeathPhase('playing'), 5000);
    });

    socket.on('game:opponent-disconnected', () => {
      setPhase(prev => prev === 'spectating' ? 'spectating' : 'opponent-left');
    });

    socket.on('game:error', ({ message }) => {
      setError(message);
      setTimeout(() => setError(null), 3000);
    });

    return () => {
      socket.off('game:waiting');
      socket.off('game:category-selecting');
      socket.off('game:start');
      socket.off('game:spectate-start');
      socket.off('game:spectate-ended');
      socket.off('game:state-update');
      socket.off('game:card-flipped');
      socket.off('game:pair-matched');
      socket.off('game:pair-mismatch');
      socket.off('game:turn-change');
      socket.off('game:over');
      socket.off('game:sudden-death');
      socket.off('game:rematch-waiting');
      socket.off('game:rematch-requested');
      socket.off('game:mega-triggered');
      socket.off('game:topsi-peek');
      socket.off('game:opponent-disconnected');
      socket.off('game:error');
    };
  }, [socket]);

  const joinGame = useCallback(
    (playerName: string, mode: GameMode = 'classic') => {
      socket.emit('player:join', { playerName, mode });
    },
    [socket]
  );

  const spectateGame = useCallback(
    (code: string) => {
      socket.emit('spectator:join', { spectateCode: code });
    },
    [socket]
  );

  const flipCard = useCallback(
    (cardId: number) => {
      if (isSpectator) return;
      // The moment the player engages, clear any active peek so it doesn't
      // interfere with their real flips.
      setTopsiPeek(null);
      clearTimeout(peekTimerRef.current);
      socket.emit('player:flip-card', { cardId });
    },
    [socket, isSpectator]
  );

  const leaveGame = useCallback(() => {
    socket.emit('player:leave');
    setPhase('lobby');
    setGameState(null);
    setMyPlayerId(null);
    setIsSpectator(false);
    setSuddenDeathPhase(null);
    setCoinTossWinnerId(null);
    clearTimeout(sdTransitionRef.current);
    clearTimeout(sdCoinTossRef.current);
    clearTimeout(versusTimerRef.current);
    window.history.replaceState({}, '', window.location.pathname);
  }, [socket]);

  const playAgain = useCallback(() => {
    socket.emit('player:play-again');
    setPhase('lobby');
    setGameState(null);
    setIsSpectator(false);
    setSuddenDeathPhase(null);
    setCoinTossWinnerId(null);
    setRematchWaiting(false);
    setOpponentWantsRematch(false);
    clearTimeout(sdTransitionRef.current);
    clearTimeout(sdCoinTossRef.current);
    clearTimeout(versusTimerRef.current);
  }, [socket]);

  const requestRematch = useCallback(() => {
    console.log('[rematch] requestRematch called — emitting player:rematch');
    socket.emit('player:rematch');
  }, [socket]);

  const selectCategory = useCallback(
    (category: CategoryId) => {
      socket.emit('player:select-category', { category });
    },
    [socket]
  );

  const isMyTurn = gameState?.currentTurnPlayerId === myPlayerId;

  // Effective game state with the Topsi Peek card temporarily showing as
  // face-up. This way components don't need to know about peek state — they
  // just render whatever card.state says.
  const effectiveGameState = useMemo<ClientGameState | null>(() => {
    if (!gameState) return gameState;
    if (!topsiPeek) return gameState;
    return {
      ...gameState,
      cards: gameState.cards.map((c) =>
        c.id === topsiPeek.cardId
          ? { ...c, imageId: topsiPeek.imageId, label: topsiPeek.label, state: 'face-up' as const }
          : c,
      ),
    };
  }, [gameState, topsiPeek]);

  return {
    phase,
    gameState: effectiveGameState,
    myPlayerId,
    error,
    isConnected,
    isMyTurn,
    isSpectator,
    imageExtension,
    matchedCardIds,
    stillYourTurn,
    suddenDeathPhase,
    coinTossWinnerId,
    rematchWaiting,
    opponentWantsRematch,
    megaTrigger,
    sfxEvent,
    joinGame,
    spectateGame,
    flipCard,
    leaveGame,
    playAgain,
    requestRematch,
    selectCategory,
  };
}
