import { shuffle } from './shuffler.js';
import { TOTAL_PAIRS, SUDDEN_DEATH_THRESHOLD } from 'memory-game-shared';
import type {
  CardDefinition,
  CardInstance,
  Player,
  GamePhase,
  ClientGameState,
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
      suddenDeathActivated: boolean;
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
      type: 'mismatch';
      cardId: number;
      imageId: string;
      label: string;
      mismatchedCardIds: [number, number];
    }
  | { type: 'error'; message: string };

export class GameInstance {
  public gameId: string;
  public players: [Player, Player];
  public cards: CardInstance[];
  public currentTurnIndex: number;
  public flippedCardIds: number[];
  public pairsRemaining: number;
  public phase: GamePhase;
  public winnerId: string | null;
  public imageExtension: string; // 'png' or 'svg'
  public suddenDeath = false;
  private flipLocked = false;

  constructor(
    gameId: string,
    p1: QueuedPlayer,
    p2: QueuedPlayer,
    imagePool: CardDefinition[],
    imageExtension: string
  ) {
    this.gameId = gameId;
    this.players = [
      { id: p1.socketId, name: p1.name, score: 0, connected: true },
      { id: p2.socketId, name: p2.name, score: 0, connected: true },
    ];
    this.currentTurnIndex = 0;
    this.flippedCardIds = [];
    this.pairsRemaining = TOTAL_PAIRS;
    this.phase = 'playing';
    this.winnerId = null;
    this.imageExtension = imageExtension;

    // Pick TOTAL_PAIRS random images, create pairs, shuffle
    const selected = shuffle([...imagePool]).slice(0, TOTAL_PAIRS);
    const cardPairs = [...selected, ...selected];
    const shuffled = shuffle(cardPairs);

    this.cards = shuffled.map((def, index) => ({
      id: index,
      imageId: def.imageId,
      label: def.label,
      state: 'face-down' as const,
    }));
  }

  get currentTurnPlayerId(): string {
    return this.players[this.currentTurnIndex].id;
  }

  flipCard(playerId: string, cardId: number): FlipResult {
    if (this.phase !== 'playing') return { type: 'error', message: 'Game is over' };
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

      // Sudden death instant win: first match in sudden death wins
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

      // Normal game over
      if (this.pairsRemaining === 0) {
        this.phase = 'finished';
        this.winnerId = this.determineWinner(playerId);
        return {
          type: 'match-game-over',
          cardId,
          imageId: card.imageId,
          label: card.label,
          matchedCardIds: [firstId, secondId],
          playerId,
        };
      }

      // Check if sudden death should activate (don't set flag yet — handler calls activateSuddenDeath)
      let suddenDeathActivated = false;
      if (!this.suddenDeath && this.isScoreTied() && this.pairsRemaining <= SUDDEN_DEATH_THRESHOLD) {
        suddenDeathActivated = true;
      }

      return {
        type: 'match',
        cardId,
        imageId: card.imageId,
        label: card.label,
        matchedCardIds: [firstId, secondId],
        playerId,
        suddenDeathActivated,
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

    // Shuffle the imageIds of remaining face-down cards so prior memory is useless
    const faceDownCards = this.cards.filter((c) => c.state === 'face-down');
    const imageData = faceDownCards.map((c) => ({ imageId: c.imageId, label: c.label }));
    const shuffledData = shuffle(imageData);
    faceDownCards.forEach((card, i) => {
      card.imageId = shuffledData[i].imageId;
      card.label = shuffledData[i].label;
    });

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

  private determineWinner(lastMatchPlayerId?: string): string | null {
    const [p1, p2] = this.players;
    if (p1.score > p2.score) return p1.id;
    if (p2.score > p1.score) return p2.id;
    // Tiebreaker: last player to match wins (no draws allowed)
    if (lastMatchPlayerId) return lastMatchPlayerId;
    return null;
  }

  markDisconnected(socketId: string): void {
    const player = this.players.find((p) => p.id === socketId);
    if (player) player.connected = false;
    if (this.phase === 'playing') {
      this.phase = 'finished';
      this.winnerId = this.players.find((p) => p.id !== socketId)?.id ?? null;
    }
  }

  toClientState(): ClientGameState {
    return {
      gameId: this.gameId,
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
    };
  }
}
