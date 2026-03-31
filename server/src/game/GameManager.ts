import { v4 as uuid } from 'uuid';
import { GameInstance, type QueuedPlayer } from './GameInstance.js';
import { loadImagePool, getCardExtension } from '../images/imagePool.js';
import type { CardDefinition } from 'memory-game-shared';

export class GameManager {
  private queue: QueuedPlayer[] = [];
  private games = new Map<string, GameInstance>();
  private playerToGame = new Map<string, string>();
  private imagePool: CardDefinition[] = [];
  private imageExtension = 'svg';

  constructor() {
    this.imagePool = loadImagePool();
    if (this.imagePool.length > 0) {
      this.imageExtension = getCardExtension(this.imagePool[0].imageId);
    }
    console.log(`Image pool: ${this.imagePool.length} cards (${this.imageExtension})`);
  }

  addToQueue(socketId: string, name: string): GameInstance | null {
    if (this.playerToGame.has(socketId)) return null;
    if (this.queue.find((p) => p.socketId === socketId)) return null;

    this.queue.push({ socketId, name });

    if (this.queue.length >= 2) {
      const p1 = this.queue.shift()!;
      const p2 = this.queue.shift()!;
      return this.createGame(p1, p2);
    }

    return null;
  }

  removeFromQueue(socketId: string): void {
    this.queue = this.queue.filter((p) => p.socketId !== socketId);
  }

  private createGame(p1: QueuedPlayer, p2: QueuedPlayer): GameInstance {
    const gameId = uuid();
    const game = new GameInstance(gameId, p1, p2, this.imagePool, this.imageExtension);
    this.games.set(gameId, game);
    this.playerToGame.set(p1.socketId, gameId);
    this.playerToGame.set(p2.socketId, gameId);
    console.log(`Game created: ${gameId} — ${p1.name} vs ${p2.name}`);
    return game;
  }

  createRematch(oldGame: GameInstance): GameInstance {
    const p1: QueuedPlayer = { socketId: oldGame.players[0].id, name: oldGame.players[0].name };
    const p2: QueuedPlayer = { socketId: oldGame.players[1].id, name: oldGame.players[1].name };

    // Clean up old game
    this.removeGame(oldGame.gameId);

    return this.createGame(p1, p2);
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
