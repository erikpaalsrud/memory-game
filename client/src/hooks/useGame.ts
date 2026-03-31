import { useState, useEffect, useCallback, useRef } from 'react';
import type { ClientGameState } from 'memory-game-shared';
import { useSocket } from './useSocket';

export type AppPhase = 'lobby' | 'waiting' | 'playing' | 'finished' | 'opponent-left';

export function useGame() {
  const { socket, isConnected } = useSocket();
  const [phase, setPhase] = useState<AppPhase>('lobby');
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageExtension, setImageExtension] = useState('svg');
  const [matchedCardIds, setMatchedCardIds] = useState<number[]>([]); // cards that just matched (for glow)
  const [stillYourTurn, setStillYourTurn] = useState(false); // true briefly after you match
  const [suddenDeath, setSuddenDeath] = useState(false);
  const stillTurnTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const matchGlowTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const myPlayerIdRef = useRef<string | null>(null);

  useEffect(() => {
    socket.on('game:waiting', () => setPhase('waiting'));

    socket.on('game:start', ({ gameState, yourPlayerId, imageExtension: ext }) => {
      setGameState(gameState);
      setMyPlayerId(yourPlayerId);
      myPlayerIdRef.current = yourPlayerId;
      setImageExtension(ext);
      setPhase('playing');
    });

    socket.on('game:state-update', ({ gameState }) => {
      setGameState(gameState);
    });

    socket.on('game:card-flipped', ({ cardId, imageId, label }) => {
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
      // Flash the matched cards
      setMatchedCardIds(cardIds);
      clearTimeout(matchGlowTimerRef.current);
      matchGlowTimerRef.current = setTimeout(() => setMatchedCardIds([]), 1200);

      setGameState((prev) => {
        if (!prev) return prev;

        // If I matched, show "Still your turn!"
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
      setPhase('finished');
    });

    socket.on('game:sudden-death', () => {
      setSuddenDeath(true);
    });

    socket.on('game:opponent-disconnected', () => {
      setPhase('opponent-left');
    });

    socket.on('game:error', ({ message }) => {
      setError(message);
      setTimeout(() => setError(null), 3000);
    });

    return () => {
      socket.off('game:waiting');
      socket.off('game:start');
      socket.off('game:state-update');
      socket.off('game:card-flipped');
      socket.off('game:pair-matched');
      socket.off('game:pair-mismatch');
      socket.off('game:turn-change');
      socket.off('game:over');
      socket.off('game:sudden-death');
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

  const flipCard = useCallback(
    (cardId: number) => {
      socket.emit('player:flip-card', { cardId });
    },
    [socket]
  );

  const leaveGame = useCallback(() => {
    socket.emit('player:leave');
    setPhase('lobby');
    setGameState(null);
    setMyPlayerId(null);
    setSuddenDeath(false);
  }, [socket]);

  const playAgain = useCallback(() => {
    socket.emit('player:play-again');
    setPhase('lobby');
    setGameState(null);
    setSuddenDeath(false);
  }, [socket]);

  const isMyTurn = gameState?.currentTurnPlayerId === myPlayerId;

  return {
    phase,
    gameState,
    myPlayerId,
    error,
    isConnected,
    isMyTurn,
    imageExtension,
    matchedCardIds,
    stillYourTurn,
    suddenDeath,
    joinGame,
    flipCard,
    leaveGame,
    playAgain,
  };
}
