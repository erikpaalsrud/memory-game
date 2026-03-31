// === Card Types ===
export interface CardDefinition {
  imageId: string;
  label: string;
}

export interface CardInstance {
  id: number;
  imageId: string;
  label: string;
  state: 'face-down' | 'face-up' | 'matched';
}

// === Player Types ===
export interface Player {
  id: string;
  name: string;
  score: number;
  connected: boolean;
}

// === Game State ===
export type GamePhase = 'waiting' | 'playing' | 'finished';

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
}

// === Client receives a masked version ===
export interface ClientCardInstance {
  id: number;
  imageId: string | null;
  label: string | null;
  state: 'face-down' | 'face-up' | 'matched';
}

export interface ClientGameState {
  gameId: string;
  phase: GamePhase;
  players: [Player, Player];
  cards: ClientCardInstance[];
  currentTurnPlayerId: string;
  flippedCardIds: number[];
  pairsRemaining: number;
  winnerId: string | null;
  suddenDeath: boolean;
}

// === Socket Event Payloads ===
export interface ClientToServerEvents {
  'player:join': (data: { playerName: string }) => void;
  'player:flip-card': (data: { cardId: number }) => void;
  'player:leave': () => void;
  'player:play-again': () => void;
  'player:rematch': () => void;
}

export interface ServerToClientEvents {
  'game:waiting': () => void;
  'game:start': (data: { gameState: ClientGameState; yourPlayerId: string; imageExtension: string }) => void;
  'game:state-update': (data: { gameState: ClientGameState }) => void;
  'game:card-flipped': (data: { cardId: number; imageId: string; label: string }) => void;
  'game:pair-matched': (data: { cardIds: [number, number]; playerId: string }) => void;
  'game:pair-mismatch': (data: { cardIds: [number, number] }) => void;
  'game:turn-change': (data: { currentTurnPlayerId: string }) => void;
  'game:over': (data: { gameState: ClientGameState }) => void;
  'game:sudden-death': (data: { coinTossWinnerId: string }) => void;
  'game:rematch-waiting': () => void;
  'game:opponent-disconnected': () => void;
  'game:error': (data: { message: string }) => void;
}
