import { useState, useEffect, useCallback, useRef } from 'react';
import type { ClientGameState } from 'memory-game-shared';
import { useSocket } from './useSocket';

export type AppPhase = 'lobby' | 'waiting' | 'versus' | 'playing' | 'finished' | 'opponent-left' | 'spectating';
export type SuddenDeathPhase = null | 'transition' | 'coin-toss' | 'playing';

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

    socket.on('game:start', ({ gameState, yourPlayerId, imageExtension: ext }) => {
      setGameState(gameState);
      setMyPlayerId(yourPlayerId);
      myPlayerIdRef.current = yourPlayerId;
      setImageExtension(ext);
      setRematchWaiting(false);
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
      setRematchWaiting(true);
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

    socket.on('game:pair-matched', ({ cardIds, playerId }) => {
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
            p.id === playerId ? { ...p, score: p.score + 1 } : p
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
      socket.off('game:opponent-disconnected');
      socket.off('game:error');
    };
  }, [socket]);

  const joinGame = useCallback(
    (playerName: string) => {
      socket.emit('player:join', { playerName });
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
    clearTimeout(sdTransitionRef.current);
    clearTimeout(sdCoinTossRef.current);
    clearTimeout(versusTimerRef.current);
  }, [socket]);

  const requestRematch = useCallback(() => {
    socket.emit('player:rematch');
  }, [socket]);

  const isMyTurn = gameState?.currentTurnPlayerId === myPlayerId;

  return {
    phase,
    gameState,
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
    sfxEvent,
    joinGame,
    spectateGame,
    flipCard,
    leaveGame,
    playAgain,
    requestRematch,
  };
}
