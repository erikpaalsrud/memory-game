import { v4 as uuid } from 'uuid';
import { GameInstance, type QueuedPlayer } from './GameInstance.js';
import { loadCategoryPools, CARD_IMAGE_EXTENSION, type CategoryPools } from '../images/imagePool.js';
import {
  CATEGORY_IDS,
  TOTAL_PAIRS,
  type CategoryId,
  type GameMode,
} from 'memory-game-shared';

interface QueuedPlayerWithMode extends QueuedPlayer {
  mode: GameMode;
}

export class GameManager {
  private queue: QueuedPlayerWithMode[] = [];
  private games = new Map<string, GameInstance>();
  private playerToGame = new Map<string, string>();
  private categoryPools: CategoryPools;

  constructor() {
    this.categoryPools = loadCategoryPools();
    const summary = CATEGORY_IDS.map((id) => `${id}=${this.categoryPools[id].length}`).join(', ');
    console.log(`Image pools: ${summary} (${CARD_IMAGE_EXTENSION})`);
  }

  addToQueue(socketId: string, name: string, mode: GameMode = 'classic'): GameInstance | null {
    if (this.playerToGame.has(socketId)) return null;
    if (this.queue.find((p) => p.socketId === socketId)) return null;

    this.queue.push({ socketId, name, mode });

    if (this.queue.length >= 2) {
      const p1 = this.queue.shift()!;
      const p2 = this.queue.shift()!;
      // Mode resolution: if both pick the same, use it. If they differ, the
      // first player in queue (p1) wins — they were waiting longer.
      const resolvedMode: GameMode = p1.mode === p2.mode ? p1.mode : p1.mode;
      return this.createGame(p1, p2, resolvedMode);
    }

    return null;
  }

  removeFromQueue(socketId: string): void {
    this.queue = this.queue.filter((p) => p.socketId !== socketId);
  }

  private createGame(p1: QueuedPlayer, p2: QueuedPlayer, mode: GameMode = 'classic'): GameInstance {
    const gameId = uuid();
    const game = new GameInstance(gameId, p1, p2, CARD_IMAGE_EXTENSION, mode);
    this.games.set(gameId, game);
    this.playerToGame.set(p1.socketId, gameId);
    this.playerToGame.set(p2.socketId, gameId);
    console.log(`Game created: ${gameId} — ${p1.name} vs ${p2.name} mode=${mode} selector=${game.categorySelectorId}`);
    return game;
  }

  /**
   * Resolve a category pick into a started game. Validates the requesting
   * player is the chosen selector, the category exists, and the pool is full.
   */
  finalizeCategory(
    socketId: string,
    category: CategoryId,
  ): { ok: true; game: GameInstance } | { ok: false; reason: string } {
    const game = this.getGameForPlayer(socketId);
    if (!game) return { ok: false, reason: 'Not in a game' };
    if (game.phase !== 'selecting-category') return { ok: false, reason: 'Game already started' };
    if (game.categorySelectorId !== socketId) return { ok: false, reason: 'You are not the category selector' };

    const pool = this.categoryPools[category];
    if (!pool || pool.length < TOTAL_PAIRS) {
      return { ok: false, reason: `Category "${category}" is not playable` };
    }

    const result = game.selectCategory(category, pool);
    if (!result.ok) return result;
    return { ok: true, game };
  }

  createRematch(oldGame: GameInstance): GameInstance {
    const p1: QueuedPlayer = { socketId: oldGame.players[0].id, name: oldGame.players[0].name };
    const p2: QueuedPlayer = { socketId: oldGame.players[1].id, name: oldGame.players[1].name };
    const mode = oldGame.mode;

    // Clean up old game
    this.removeGame(oldGame.gameId);

    return this.createGame(p1, p2, mode);
  }

  getGameBySpectateCode(code: string): GameInstance | undefined {
    for (const game of this.games.values()) {
      if (game.spectateCode === code) return game;
    }
    return undefined;
  }

  getGameForPlayer(socketId: string): GameInstance | undefined {
    const gameId = this.playerToGame.get(socketId);
    return gameId ? this.games.get(gameId) : undefined;
  }

  removeGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (game) {
      game.players.forEach((p) => this.playerToGame.delete(p.id));
      this.games.delete(gameId);
      console.log(`Game removed: ${gameId}`);
    }
  }

  handleDisconnect(socketId: string): GameInstance | undefined {
    this.removeFromQueue(socketId);
    const game = this.getGameForPlayer(socketId);
    if (game) {
      game.markDisconnected(socketId);
    }
    return game;
  }

  getActiveGameCount(): number {
    return this.games.size;
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}
