import type { CategoryId } from './categories';

// === Game mode ===
// 'classic' = current behavior. 'mega' = grid expands on 3-streaks.
// Easy/Normal/Hard are difficulty variants on top of classic and may be added later.
export type GameMode = 'classic' | 'mega';

// === Card Types ===
export interface CardDefinition {
  imageId: string;
  label: string;
}

// Cards now carry explicit (row, col) so the grid can grow mid-game (Mega Mode)
// without shifting existing cards' positions. Row/col are 0-indexed.
export interface CardInstance {
  id: number;
  row: number;
  col: number;
  imageId: string;
  label: string;
  state: 'face-down' | 'face-up' | 'matched';
  isMegaPair?: boolean; // The special golden pair that ends Wave III
}

// === Player Types ===
export interface Player {
  id: string;
  name: string;
  score: number;
  connected: boolean;
}

// === Game State ===
export type GamePhase = 'waiting' | 'selecting-category' | 'playing' | 'finished';

export interface GameState {
  gameId: string;
  phase: GamePhase;
  players: [Player, Player];
  cards: CardInstance[];
  currentTurnPlayerId: string;
  flippedCardIds: number[];
  pairsRemaining: number;
  winnerId: string | null;
  suddenDeath: boolean;
  category: CategoryId | null;
  // The player who picks the category — the loser of the initial coin flip.
  categorySelectorId: string | null;

  // === Mega Mode state ===
  mode: GameMode;
  gridSize: number;          // current grid edge length (5, 7, 9, 11...)
  megaLevel: number;         // 0 = base, 1 = Wave I active, 2 = Wave II, 3 = Wave III
  finalDuel: boolean;        // true once Wave III hits — kicks in MEGA PAIR hunt
}

// === Client receives a masked version ===
export interface ClientCardInstance {
  id: number;
  row: number;
  col: number;
  imageId: string | null;
  label: string | null;
  state: 'face-down' | 'face-up' | 'matched';
  isMegaPair?: boolean;
}

export interface ClientGameState {
  gameId: string;
  spectateCode: string;
  phase: GamePhase;
  players: [Player, Player];
  cards: ClientCardInstance[];
  currentTurnPlayerId: string;
  flippedCardIds: number[];
  pairsRemaining: number;
  winnerId: string | null;
  suddenDeath: boolean;
  category: CategoryId | null;
  categorySelectorId: string | null;

  // === Mega Mode ===
  mode: GameMode;
  gridSize: number;
  megaLevel: number;
  finalDuel: boolean;
  // Per-player score multiplier currently active (1 in classic, 2/3/5 in mega waves)
  scoreMultipliers: { [playerId: string]: number };
}

// === Socket Event Payloads ===
export interface ClientToServerEvents {
  'player:join': (data: { playerName: string; mode?: GameMode }) => void;
  'player:flip-card': (data: { cardId: number }) => void;
  'player:leave': () => void;
  'player:play-again': () => void;
  'player:rematch': () => void;
  'player:select-category': (data: { category: CategoryId }) => void;
  'spectator:join': (data: { spectateCode: string }) => void;
}

export interface ServerToClientEvents {
  'game:waiting': () => void;
  'game:category-selecting': (data: {
    gameState: ClientGameState;
    yourPlayerId: string;
  }) => void;
  'game:start': (data: { gameState: ClientGameState; yourPlayerId: string; imageExtension: string }) => void;
  'game:state-update': (data: { gameState: ClientGameState }) => void;
  'game:card-flipped': (data: { cardId: number; imageId: string; label: string }) => void;
  'game:pair-matched': (data: { cardIds: [number, number]; playerId: string; pointsAwarded: number }) => void;
  'game:pair-mismatch': (data: { cardIds: [number, number] }) => void;
  'game:turn-change': (data: { currentTurnPlayerId: string }) => void;
  'game:over': (data: { gameState: ClientGameState }) => void;
  'game:sudden-death': (data: { coinTossWinnerId: string }) => void;
  'game:rematch-waiting': () => void;
  'game:rematch-requested': () => void;
  'game:spectate-start': (data: { gameState: ClientGameState; spectateCode: string; imageExtension: string }) => void;
  'game:spectate-ended': () => void;
  'game:opponent-disconnected': () => void;
  'game:error': (data: { message: string }) => void;

  // === Mega Mode events ===
  // Fired when a 3-streak triggers a Mega Wave. Includes the new full game state
  // (with expanded grid + new cards) so the client can re-render. The cinematic
  // effect on the client side is purely visual — server is the source of truth.
  'game:mega-triggered': (data: {
    gameState: ClientGameState;
    triggeringPlayerId: string;
    megaLevel: number;
    addedCardIds: number[]; // ids of cards that just appeared, for entrance animation
  }) => void;

  // Topsi's Peek — sent privately to the trailing player at the start of their
  // turn. Briefly reveals one face-down card to give them a memory hint.
  'game:topsi-peek': (data: {
    cardId: number;
    imageId: string;
    label: string;
  }) => void;
}
