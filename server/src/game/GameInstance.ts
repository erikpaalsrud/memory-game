import { shuffle } from './shuffler.js';
import {
  TOTAL_PAIRS,
  INITIAL_GRID_SIZE,
  MEGA_STREAK_THRESHOLD,
  MAX_MEGA_LEVEL,
  MEGA_SCORE_MULTIPLIERS,
  MEGA_MULTIPLIER_DURATION,
  TOPSIS_FAVOR_DEFICIT,
} from 'memory-game-shared';
import type {
  CardDefinition,
  CardInstance,
  Player,
  GamePhase,
  GameMode,
  ClientGameState,
  ClientCardInstance,
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
      pointsAwarded: number;
    }
  | {
      type: 'match-and-mega-trigger';
      cardId: number;
      imageId: string;
      label: string;
      matchedCardIds: [number, number];
      playerId: string;
      pointsAwarded: number;
      newMegaLevel: number;
      addedCardIds: number[];
    }
  | {
      type: 'match-game-over';
      cardId: number;
      imageId: string;
      label: string;
      matchedCardIds: [number, number];
      playerId: string;
      pointsAwarded: number;
    }
  | {
      type: 'match-enter-sudden-death';
      cardId: number;
      imageId: string;
      label: string;
      matchedCardIds: [number, number];
      playerId: string;
      pointsAwarded: number;
    }
  | {
      type: 'mismatch';
      cardId: number;
      imageId: string;
      label: string;
      mismatchedCardIds: [number, number];
    }
  | { type: 'error'; message: string };

const SUDDEN_DEATH_PAIRS = 2;

// Topsi sits at this row/col for the entire game regardless of grid size.
// Picking a fixed anchor (instead of "always center") avoids displacing
// existing cards when the grid expands during Mega Mode.
const TOPSI_ROW = 2;
const TOPSI_COL = 2;

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

  // === Mega Mode state ===
  public mode: GameMode;
  public gridSize: number;
  public megaLevel: number = 0;
  public finalDuel: boolean = false;
  // streaks: how many consecutive matches the player has made (resets on mismatch)
  private playerStreaks: Map<string, number> = new Map();
  // multipliers: { remainingMatches, multiplier } per player
  private playerMultipliers: Map<string, { remaining: number; multiplier: number }> = new Map();
  // monotonic id source so new cards added by mega expansion get unique ids
  private nextCardId: number = 0;

  private flipLocked = false;
  private imagePool: CardDefinition[] = [];

  private static generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  constructor(
    gameId: string,
    p1: QueuedPlayer,
    p2: QueuedPlayer,
    imageExtension: string,
    mode: GameMode = 'classic',
  ) {
    this.gameId = gameId;
    this.spectateCode = GameInstance.generateCode();
    this.players = [
      { id: p1.socketId, name: p1.name, score: 0, connected: true },
      { id: p2.socketId, name: p2.name, score: 0, connected: true },
    ];

    // Coin flip up front. The non-starter picks the category (fairness compensation).
    this.currentTurnIndex = Math.random() < 0.5 ? 0 : 1;
    this.categorySelectorId = this.players[1 - this.currentTurnIndex].id;

    this.flippedCardIds = [];
    this.pairsRemaining = TOTAL_PAIRS;
    this.phase = 'selecting-category';
    this.winnerId = null;
    this.imageExtension = imageExtension;
    this.cards = [];
    this.mode = mode;
    this.gridSize = INITIAL_GRID_SIZE;
  }

  /** Lock in category, deal initial cards. */
  selectCategory(category: CategoryId, pool: CardDefinition[]): { ok: true } | { ok: false; reason: string } {
    if (this.phase !== 'selecting-category') return { ok: false, reason: 'Category already selected' };
    if (pool.length < TOTAL_PAIRS) {
      return { ok: false, reason: `Category "${category}" has too few cards (${pool.length}/${TOTAL_PAIRS})` };
    }

    this.category = category;
    this.imagePool = pool;

    // Pick TOTAL_PAIRS random images, double them, shuffle, then place in the
    // 5×5 grid skipping Topsi at (2,2).
    const selected = shuffle([...pool]).slice(0, TOTAL_PAIRS);
    const cardPairs = [...selected, ...selected];
    const shuffled = shuffle(cardPairs);

    this.cards = [];
    let cardIdx = 0;
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (row === TOPSI_ROW && col === TOPSI_COL) continue;
        const def = shuffled[cardIdx++];
        this.cards.push({
          id: this.nextCardId++,
          row,
          col,
          imageId: def.imageId,
          label: def.label,
          state: 'face-down',
        });
      }
    }

    this.phase = 'playing';
    return { ok: true };
  }

  get currentTurnPlayerId(): string {
    return this.players[this.currentTurnIndex].id;
  }

  /**
   * Active scoring multiplier for a player. Combines two sources:
   *   1. Wave multiplier (2/3/5×) when a Mega Wave just triggered for them
   *   2. Topsi's Favor (×2) — continuous, applies whenever they're behind by
   *      TOPSIS_FAVOR_DEFICIT or more. Drops back the moment they catch up.
   * Both stack: a trailing player who triggers a Wave I gets 2 × 2 = 4×.
   */
  private getMultiplier(playerId: string): number {
    const waveMultiplier = this.playerMultipliers.get(playerId)?.multiplier ?? 1;
    const player = this.players.find((p) => p.id === playerId);
    const opponent = this.players.find((p) => p.id !== playerId);
    if (player && opponent && opponent.score - player.score >= TOPSIS_FAVOR_DEFICIT) {
      return waveMultiplier * 2;
    }
    return waveMultiplier;
  }

  /** True if a player is currently trailing by enough to trigger Topsi's Favor. */
  private isTrailing(playerId: string): boolean {
    const player = this.players.find((p) => p.id === playerId);
    const opponent = this.players.find((p) => p.id !== playerId);
    if (!player || !opponent) return false;
    return opponent.score - player.score >= TOPSIS_FAVOR_DEFICIT;
  }

  /**
   * Topsi's Peek — picks a random face-down card to reveal to the player as
   * a hint. Returns null if the player isn't trailing or no cards are eligible.
   * This is the only place we leak the imageId of a face-down card to a client,
   * so the server is still the source of truth.
   */
  getPeekForPlayer(playerId: string): { cardId: number; imageId: string; label: string } | null {
    if (!this.isTrailing(playerId)) return null;
    if (this.phase !== 'playing') return null;

    // Eligible cards: face-down, not currently flipped, not the MEGA PAIR (too OP)
    const candidates = this.cards.filter(
      (c) =>
        c.state === 'face-down' &&
        !this.flippedCardIds.includes(c.id) &&
        !c.isMegaPair,
    );
    if (candidates.length === 0) return null;
    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    return { cardId: choice.id, imageId: choice.imageId, label: choice.label };
  }

  /** Decrement remaining-multiplier-uses after a match has been scored. */
  private consumeMultiplier(playerId: string): void {
    const mult = this.playerMultipliers.get(playerId);
    if (!mult) return;
    mult.remaining--;
    if (mult.remaining <= 0) this.playerMultipliers.delete(playerId);
  }

  flipCard(playerId: string, cardId: number): FlipResult {
    if (this.phase !== 'playing') return { type: 'error', message: 'Game is not in play' };
    if (playerId !== this.currentTurnPlayerId) return { type: 'error', message: 'Not your turn' };
    if (this.flipLocked) return { type: 'error', message: 'Wait for cards to flip back' };

    const card = this.cards.find((c) => c.id === cardId);
    if (!card) return { type: 'error', message: 'Invalid card' };
    if (card.state !== 'face-down') return { type: 'error', message: 'Card already flipped' };
    if (this.flippedCardIds.includes(cardId)) return { type: 'error', message: 'Card already selected' };

    card.state = 'face-up';
    this.flippedCardIds.push(cardId);

    if (this.flippedCardIds.length === 1) {
      return { type: 'first-flip', cardId, imageId: card.imageId, label: card.label };
    }

    // Second card — check for match
    const [firstId, secondId] = this.flippedCardIds;
    const firstCard = this.cards.find((c) => c.id === firstId)!;
    const secondCard = this.cards.find((c) => c.id === secondId)!;

    if (firstCard.imageId === secondCard.imageId) {
      firstCard.state = 'matched';
      secondCard.state = 'matched';

      const points = this.getMultiplier(playerId);
      this.players[this.currentTurnIndex].score += points;
      this.pairsRemaining--;
      this.flippedCardIds = [];

      // Multiplier consumed AFTER scoring
      this.consumeMultiplier(playerId);

      // Increment streak
      const newStreak = (this.playerStreaks.get(playerId) ?? 0) + 1;
      this.playerStreaks.set(playerId, newStreak);

      // Sudden death (Final Duel or classic tiebreaker): first match wins
      if (this.suddenDeath || this.finalDuel) {
        this.phase = 'finished';
        this.winnerId = playerId;
        return {
          type: 'match-game-over',
          cardId,
          imageId: card.imageId,
          label: card.label,
          matchedCardIds: [firstId, secondId],
          playerId,
          pointsAwarded: points,
        };
      }

      // Mega Mode: streak hit threshold → trigger a Mega Wave.
      // Catchup: trailing players only need 2 in a row instead of 3.
      const triggerThreshold = this.isTrailing(playerId)
        ? MEGA_STREAK_THRESHOLD - 1
        : MEGA_STREAK_THRESHOLD;
      if (
        this.mode === 'mega' &&
        newStreak >= triggerThreshold &&
        this.megaLevel < MAX_MEGA_LEVEL
      ) {
        // Reset streak so we don't infinite-loop on the same streak
        this.playerStreaks.set(playerId, 0);

        const addedIds = this.expandGridForMega(playerId);

        return {
          type: 'match-and-mega-trigger',
          cardId,
          imageId: card.imageId,
          label: card.label,
          matchedCardIds: [firstId, secondId],
          playerId,
          pointsAwarded: points,
          newMegaLevel: this.megaLevel,
          addedCardIds: addedIds,
        };
      }

      // All pairs found
      if (this.pairsRemaining === 0) {
        if (this.isScoreTied()) {
          return {
            type: 'match-enter-sudden-death',
            cardId,
            imageId: card.imageId,
            label: card.label,
            matchedCardIds: [firstId, secondId],
            playerId,
            pointsAwarded: points,
          };
        }
        this.phase = 'finished';
        this.winnerId = this.determineWinner();
        return {
          type: 'match-game-over',
          cardId,
          imageId: card.imageId,
          label: card.label,
          matchedCardIds: [firstId, secondId],
          playerId,
          pointsAwarded: points,
        };
      }

      return {
        type: 'match',
        cardId,
        imageId: card.imageId,
        label: card.label,
        matchedCardIds: [firstId, secondId],
        playerId,
        pointsAwarded: points,
      };
    }

    // Mismatch — streak broken
    this.playerStreaks.set(playerId, 0);
    this.flipLocked = true;
    return {
      type: 'mismatch',
      cardId,
      imageId: card.imageId,
      label: card.label,
      mismatchedCardIds: [firstId, secondId],
    };
  }

  /**
   * Expand the grid by 2 in each dimension (5→7→9→11). Existing cards keep
   * their (row, col) positions. New cells in the L-shaped fringe get filled
   * with new card pairs — preferring unused images, falling back to reuse.
   *
   * Also activates the score multiplier for the triggering player and, on
   * Wave III, transforms 2 random face-down cards into the MEGA PAIR which
   * ends the game when matched.
   */
  private expandGridForMega(triggeringPlayerId: string): number[] {
    this.megaLevel++;
    const oldSize = this.gridSize;
    const newSize = this.gridSize + 2;
    this.gridSize = newSize;

    // Activate the wave's multiplier for the triggering player. The trailing
    // player's continuous Topsi's Favor (×2) is applied separately at scoring
    // time, so we don't need a one-shot bump here.
    const multiplier = MEGA_SCORE_MULTIPLIERS[this.megaLevel] ?? 1;
    this.playerMultipliers.set(triggeringPlayerId, {
      multiplier,
      remaining: MEGA_MULTIPLIER_DURATION,
    });

    // Build the list of NEW cell positions (those that exist in newSize but
    // not in oldSize). Skip Topsi anchor cell.
    const newPositions: Array<{ row: number; col: number }> = [];
    for (let row = 0; row < newSize; row++) {
      for (let col = 0; col < newSize; col++) {
        if (row === TOPSI_ROW && col === TOPSI_COL) continue;
        if (row >= oldSize || col >= oldSize) {
          newPositions.push({ row, col });
        }
      }
    }
    // Sanity: should always be even
    if (newPositions.length % 2 !== 0) {
      newPositions.pop();
    }
    const newPairCount = newPositions.length / 2;

    // Pick newPairCount images: prefer unused from pool, then reuse already-played
    const usedImageIds = new Set(this.cards.map((c) => c.imageId));
    const unusedFromPool = shuffle(this.imagePool.filter((c) => !usedImageIds.has(c.imageId)));
    const allImageDefs: CardDefinition[] = [];

    for (let i = 0; i < newPairCount; i++) {
      if (unusedFromPool.length > 0) {
        allImageDefs.push(unusedFromPool.pop()!);
      } else {
        // Reuse an existing image — prefer matched ones (those are "memory anchors")
        const matched = this.cards.filter((c) => c.state === 'matched');
        const reuseSrc = matched.length > 0 ? matched : this.cards;
        const sample = reuseSrc[Math.floor(Math.random() * reuseSrc.length)];
        allImageDefs.push({ imageId: sample.imageId, label: sample.label });
      }
    }

    // Each chosen image becomes a pair (2 cards), then shuffle the positions
    const cardPairs: CardDefinition[] = [];
    for (const def of allImageDefs) {
      cardPairs.push(def, def);
    }
    const shuffledPairs = shuffle(cardPairs);
    const shuffledPositions = shuffle(newPositions);

    const addedIds: number[] = [];
    for (let i = 0; i < shuffledPairs.length; i++) {
      const pos = shuffledPositions[i];
      const def = shuffledPairs[i];
      const id = this.nextCardId++;
      this.cards.push({
        id,
        row: pos.row,
        col: pos.col,
        imageId: def.imageId,
        label: def.label,
        state: 'face-down',
      });
      addedIds.push(id);
      this.pairsRemaining++;
    }

    // Wave III: enter Final Duel mode and seed the MEGA PAIR
    if (this.megaLevel >= MAX_MEGA_LEVEL) {
      this.finalDuel = true;
      this.seedMegaPair();
    }

    return addedIds;
  }

  /**
   * Convert two random face-down cards into the MEGA PAIR — a special golden
   * pair using the category cover image. Matching them ends Final Duel
   * immediately as a win.
   */
  private seedMegaPair(): void {
    const candidates = this.cards.filter((c) => c.state === 'face-down' && !c.isMegaPair);
    if (candidates.length < 2) return;

    const shuffled = shuffle(candidates);
    const [a, b] = shuffled;
    a.imageId = '_cover';
    b.imageId = '_cover';
    a.label = 'Mega Pair';
    b.label = 'Mega Pair';
    a.isMegaPair = true;
    b.isMegaPair = true;
  }

  activateSuddenDeath(): { coinTossWinnerId: string } {
    this.suddenDeath = true;

    const selected = shuffle([...this.imagePool]).slice(0, SUDDEN_DEATH_PAIRS);
    const cardPairs = [...selected, ...selected];
    const shuffled = shuffle(cardPairs);

    // Sudden-death cards are dealt as a "hand" — we still give them row/col but
    // the client renders them as a hand layout, ignoring the grid.
    this.cards = shuffled.map((def, index) => ({
      id: this.nextCardId++,
      row: 0,
      col: index,
      imageId: def.imageId,
      label: def.label,
      state: 'face-down' as const,
    }));
    this.pairsRemaining = SUDDEN_DEATH_PAIRS;
    this.flippedCardIds = [];

    this.currentTurnIndex = Math.random() < 0.5 ? 0 : 1;

    return { coinTossWinnerId: this.players[this.currentTurnIndex].id };
  }

  resolveMismatch(): void {
    for (const id of this.flippedCardIds) {
      const card = this.cards.find((c) => c.id === id);
      if (card) card.state = 'face-down';
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
    const scoreMultipliers: { [playerId: string]: number } = {};
    for (const p of this.players) {
      scoreMultipliers[p.id] = this.getMultiplier(p.id);
    }

    return {
      gameId: this.gameId,
      spectateCode: this.spectateCode,
      phase: this.phase,
      players: [...this.players] as [Player, Player],
      cards: this.cards.map((card): ClientCardInstance => ({
        id: card.id,
        row: card.row,
        col: card.col,
        imageId: card.state === 'face-down' ? null : card.imageId,
        label: card.state === 'face-down' ? null : card.label,
        state: card.state,
        isMegaPair: card.isMegaPair,
      })),
      currentTurnPlayerId: this.currentTurnPlayerId,
      flippedCardIds: this.flippedCardIds,
      pairsRemaining: this.pairsRemaining,
      winnerId: this.winnerId,
      suddenDeath: this.suddenDeath,
      category: this.category,
      categorySelectorId: this.categorySelectorId,
      mode: this.mode,
      gridSize: this.gridSize,
      megaLevel: this.megaLevel,
      finalDuel: this.finalDuel,
      scoreMultipliers,
    };
  }
}
