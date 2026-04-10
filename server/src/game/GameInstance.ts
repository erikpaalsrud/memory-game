import { shuffle } from './shuffler.js';
import { TOTAL_PAIRS } from 'memory-game-shared';
import type {
  CardDefinition,
  CardInstance,
  Player,
  GamePhase,
  ClientGameState,
  CategoryId,
} from 'memory-game-shared';

export interface QueuedPlayer {
  socketId: string;
  name: string;
}

export type FlipResult =
  | { type: 'first-flip'; cardId: number; imageId: string; label: string }
  | {
      type: 'match';
      cardId: number;
      imageId: string;
      label: string;
      matchedCardIds: [number, number];
      playerId: string;
    }
  | {
      type: 'match-game-over';
      cardId: number;
      imageId: string;
      label: string;
      matchedCardIds: [number, number];
      playerId: string;
    }
  | {
      type: 'match-enter-sudden-death';
      cardId: number;
      imageId: string;
      label: string;
      matchedCardIds: [number, number];
      playerId: string;
    }
  | {
      type: 'mismatch';
      cardId: number;
      imageId: string;
      label: string;
      mismatchedCardIds: [number, number];
    }
  | { type: 'error'; message: string };

const SUDDEN_DEATH_PAIRS = 2; // 4 cards, 2 images — the decider

export class GameInstance {
  public gameId: string;
  public players: [Player, Player];
  public cards: CardInstance[];
  public currentTurnIndex: number;
  public flippedCardIds: number[];
  public pairsRemaining: number;
  public phase: GamePhase;
  public winnerId: string | null;
  public imageExtension: string;
  public spectateCode: string;
  public suddenDeath = false;
  public rematchRequests = new Set<string>();
  public category: CategoryId | null = null;
  public categorySelectorId: string | null = null;
  private flipLocked = false;
  private imagePool: CardDefinition[] = [];

  private static generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
    let code = '';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  constructor(
    gameId: string,
    p1: QueuedPlayer,
    p2: QueuedPlayer,
    imageExtension: string,
  ) {
    this.gameId = gameId;
    this.spectateCode = GameInstance.generateCode();
    this.players = [
      { id: p1.socketId, name: p1.name, score: 0, connected: true },
      { id: p2.socketId, name: p2.name, score: 0, connected: true },
    ];

    // Coin flip happens up front. The non-starter is the player who picks the
    // category — fairness compensation for not getting the first move.
    this.currentTurnIndex = Math.random() < 0.5 ? 0 : 1;
    this.categorySelectorId = this.players[1 - this.currentTurnIndex].id;

    this.flippedCardIds = [];
    this.pairsRemaining = TOTAL_PAIRS;
    this.phase = 'selecting-category';
    this.winnerId = null;
    this.imageExtension = imageExtension;
    this.cards = [];
  }

  /**
   * Called once the selector picks a category. Locks in the pool, deals the
   * cards, and shifts the game into the playing phase. Idempotent guard prevents
   * double-selection if both players race the event.
   */
  selectCategory(category: CategoryId, pool: CardDefinition[]): { ok: true } | { ok: false; reason: string } {
    if (this.phase !== 'selecting-category') return { ok: false, reason: 'Category already selected' };
    if (pool.length < TOTAL_PAIRS) {
      return { ok: false, reason: `Category "${category}" has too few cards (${pool.length}/${TOTAL_PAIRS})` };
    }

    this.category = category;
    this.imagePool = pool;

    const selected = shuffle([...pool]).slice(0, TOTAL_PAIRS);
    const cardPairs = [...selected, ...selected];
    const shuffled = shuffle(cardPairs);

    this.cards = shuffled.map((def, index) => ({
      id: index,
      imageId: def.imageId,
      label: def.label,
      state: 'face-down' as const,
    }));
    this.phase = 'playing';
    return { ok: true };
  }

  get currentTurnPlayerId(): string {
    return this.players[this.currentTurnIndex].id;
  }

  flipCard(playerId: string, cardId: number): FlipResult {
    if (this.phase !== 'playing') return { type: 'error', message: 'Game is not in play' };
    if (playerId !== this.currentTurnPlayerId) return { type: 'error', message: 'Not your turn' };
    if (this.flipLocked) return { type: 'error', message: 'Wait for cards to flip back' };
    if (cardId < 0 || cardId >= this.cards.length) return { type: 'error', message: 'Invalid card' };

    const card = this.cards[cardId];
    if (card.state !== 'face-down') return { type: 'error', message: 'Card already flipped' };
    if (this.flippedCardIds.includes(cardId)) return { type: 'error', message: 'Card already selected' };

    card.state = 'face-up';
    this.flippedCardIds.push(cardId);

    if (this.flippedCardIds.length === 1) {
      return { type: 'first-flip', cardId, imageId: card.imageId, label: card.label };
    }

    // Second card — check for match
    const [firstId, secondId] = this.flippedCardIds;
    const firstCard = this.cards[firstId];
    const secondCard = this.cards[secondId];

    if (firstCard.imageId === secondCard.imageId) {
      firstCard.state = 'matched';
      secondCard.state = 'matched';
      this.players[this.currentTurnIndex].score++;
      this.pairsRemaining--;
      this.flippedCardIds = [];

      // Sudden death: first match wins instantly
      if (this.suddenDeath) {
        this.phase = 'finished';
        this.winnerId = playerId;
        return {
          type: 'match-game-over',
          cardId,
          imageId: card.imageId,
          label: card.label,
          matchedCardIds: [firstId, secondId],
          playerId,
        };
      }

      // All pairs found
      if (this.pairsRemaining === 0) {
        if (this.isScoreTied()) {
          // Tie! Enter sudden death instead of ending
          return {
            type: 'match-enter-sudden-death',
            cardId,
            imageId: card.imageId,
            label: card.label,
            matchedCardIds: [firstId, secondId],
            playerId,
          };
        }
        // Clear winner
        this.phase = 'finished';
        this.winnerId = this.determineWinner();
        return {
          type: 'match-game-over',
          cardId,
          imageId: card.imageId,
          label: card.label,
          matchedCardIds: [firstId, secondId],
          playerId,
        };
      }

      return {
        type: 'match',
        cardId,
        imageId: card.imageId,
        label: card.label,
        matchedCardIds: [firstId, secondId],
        playerId,
      };
    }

    // Mismatch
    this.flipLocked = true;
    return {
      type: 'mismatch',
      cardId,
      imageId: card.imageId,
      label: card.label,
      mismatchedCardIds: [firstId, secondId],
    };
  }

  activateSuddenDeath(): { coinTossWinnerId: string } {
    this.suddenDeath = true;

    // Deal fresh cards: 2 pairs = 4 cards
    const selected = shuffle([...this.imagePool]).slice(0, SUDDEN_DEATH_PAIRS);
    const cardPairs = [...selected, ...selected];
    const shuffled = shuffle(cardPairs);

    this.cards = shuffled.map((def, index) => ({
      id: index,
      imageId: def.imageId,
      label: def.label,
      state: 'face-down' as const,
    }));
    this.pairsRemaining = SUDDEN_DEATH_PAIRS;
    this.flippedCardIds = [];

    // Coin toss for who goes first
    this.currentTurnIndex = Math.random() < 0.5 ? 0 : 1;

    return { coinTossWinnerId: this.players[this.currentTurnIndex].id };
  }

  resolveMismatch(): void {
    for (const id of this.flippedCardIds) {
      this.cards[id].state = 'face-down';
    }
    this.flippedCardIds = [];
    this.flipLocked = false;
    this.currentTurnIndex = this.currentTurnIndex === 0 ? 1 : 0;
  }

  private isScoreTied(): boolean {
    return this.players[0].score === this.players[1].score;
  }

  private determineWinner(): string | null {
    const [p1, p2] = this.players;
    if (p1.score > p2.score) return p1.id;
    if (p2.score > p1.score) return p2.id;
    return null;
  }

  markDisconnected(socketId: string): void {
    const player = this.players.find((p) => p.id === socketId);
    if (player) player.connected = false;
    if (this.phase === 'playing' || this.phase === 'selecting-category') {
      this.phase = 'finished';
      this.winnerId = this.players.find((p) => p.id !== socketId)?.id ?? null;
    }
  }

  toClientState(): ClientGameState {
    return {
      gameId: this.gameId,
      spectateCode: this.spectateCode,
      phase: this.phase,
      players: [...this.players] as [Player, Player],
      cards: this.cards.map((card) => ({
        id: card.id,
        imageId: card.state === 'face-down' ? null : card.imageId,
        label: card.state === 'face-down' ? null : card.label,
        state: card.state,
      })),
      currentTurnPlayerId: this.currentTurnPlayerId,
      flippedCardIds: this.flippedCardIds,
      pairsRemaining: this.pairsRemaining,
      winnerId: this.winnerId,
      suddenDeath: this.suddenDeath,
      category: this.category,
      categorySelectorId: this.categorySelectorId,
    };
  }
}
