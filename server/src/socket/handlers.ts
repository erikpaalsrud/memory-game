import type { Server, Socket } from 'socket.io';
import { CARD_FLIP_DELAY_MS, isCategoryId } from 'memory-game-shared';
import type { ClientToServerEvents, ServerToClientEvents } from 'memory-game-shared';
import type { GameManager } from '../game/GameManager.js';
import type { GameInstance } from '../game/GameInstance.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function setupSocketHandlers(io: TypedServer, gameManager: GameManager): void {
  /**
   * Helper: emit category-selecting to both players. The selector sees the
   * picker; the other player sees a "waiting" view. The client decides which
   * to render based on (yourPlayerId === gameState.categorySelectorId).
   */
  function broadcastCategorySelecting(io: TypedServer, game: GameInstance) {
    const [p1, p2] = game.players;
    const p1Socket = io.sockets.sockets.get(p1.id);
    const p2Socket = io.sockets.sockets.get(p2.id);

    const roomName = `game:${game.gameId}`;
    p1Socket?.join(roomName);
    p2Socket?.join(roomName);

    const clientState = game.toClientState();
    p1Socket?.emit('game:category-selecting', {
      gameState: clientState,
      yourPlayerId: p1.id,
    });
    p2Socket?.emit('game:category-selecting', {
      gameState: clientState,
      yourPlayerId: p2.id,
    });
  }

  function broadcastGameStart(io: TypedServer, game: GameInstance) {
    const [p1, p2] = game.players;
    const p1Socket = io.sockets.sockets.get(p1.id);
    const p2Socket = io.sockets.sockets.get(p2.id);

    const clientState = game.toClientState();
    p1Socket?.emit('game:start', {
      gameState: clientState,
      yourPlayerId: p1.id,
      imageExtension: game.imageExtension,
    });
    p2Socket?.emit('game:start', {
      gameState: clientState,
      yourPlayerId: p2.id,
      imageExtension: game.imageExtension,
    });
  }

  io.on('connection', (socket: TypedSocket) => {
    console.log(`Connected: ${socket.id}`);

    // --- MATCHMAKING ---
    socket.on('player:join', ({ playerName }) => {
      if (!playerName || typeof playerName !== 'string') {
        socket.emit('game:error', { message: 'Invalid player name' });
        return;
      }

      const name = playerName.trim().slice(0, 20);
      if (name.length === 0) {
        socket.emit('game:error', { message: 'Name cannot be empty' });
        return;
      }

      const game = gameManager.addToQueue(socket.id, name);

      if (!game) {
        socket.emit('game:waiting');
        return;
      }

      // Game created — drop both players into category selection.
      broadcastCategorySelecting(io, game);
    });

    // --- CATEGORY SELECTION ---
    socket.on('player:select-category', ({ category }) => {
      if (!isCategoryId(category)) {
        socket.emit('game:error', { message: 'Invalid category' });
        return;
      }

      const result = gameManager.finalizeCategory(socket.id, category);
      if (!result.ok) {
        socket.emit('game:error', { message: result.reason });
        return;
      }

      broadcastGameStart(io, result.game);
    });

    // --- CARD FLIP ---
    socket.on('player:flip-card', ({ cardId }) => {
      const game = gameManager.getGameForPlayer(socket.id);
      if (!game) {
        socket.emit('game:error', { message: 'Not in a game' });
        return;
      }

      const result = game.flipCard(socket.id, cardId);
      const roomName = `game:${game.gameId}`;

      switch (result.type) {
        case 'error':
          socket.emit('game:error', { message: result.message });
          break;

        case 'first-flip':
          io.to(roomName).emit('game:card-flipped', {
            cardId: result.cardId,
            imageId: result.imageId,
            label: result.label,
          });
          break;

        case 'match':
          io.to(roomName).emit('game:card-flipped', {
            cardId: result.cardId,
            imageId: result.imageId,
            label: result.label,
          });
          io.to(roomName).emit('game:pair-matched', {
            cardIds: result.matchedCardIds,
            playerId: result.playerId,
          });
          io.to(roomName).emit('game:state-update', {
            gameState: game.toClientState(),
          });
          break;

        case 'match-enter-sudden-death':
          // Last pair matched and scores are tied — enter sudden death
          io.to(roomName).emit('game:card-flipped', {
            cardId: result.cardId,
            imageId: result.imageId,
            label: result.label,
          });
          io.to(roomName).emit('game:pair-matched', {
            cardIds: result.matchedCardIds,
            playerId: result.playerId,
          });
          // Delay so the last match swoosh plays before sudden death takes over
          setTimeout(() => {
            const { coinTossWinnerId } = game.activateSuddenDeath();
            io.to(roomName).emit('game:sudden-death', { coinTossWinnerId });
            io.to(roomName).emit('game:state-update', {
              gameState: game.toClientState(),
            });
          }, 1500);
          break;

        case 'match-game-over':
          io.to(roomName).emit('game:card-flipped', {
            cardId: result.cardId,
            imageId: result.imageId,
            label: result.label,
          });
          io.to(roomName).emit('game:pair-matched', {
            cardIds: result.matchedCardIds,
            playerId: result.playerId,
          });
          io.to(roomName).emit('game:over', {
            gameState: game.toClientState(),
          });
          setTimeout(() => gameManager.removeGame(game.gameId), 30000);
          break;

        case 'mismatch':
          io.to(roomName).emit('game:card-flipped', {
            cardId: result.cardId,
            imageId: result.imageId,
            label: result.label,
          });
          setTimeout(() => {
            game.resolveMismatch();
            io.to(roomName).emit('game:pair-mismatch', {
              cardIds: result.mismatchedCardIds,
            });
            io.to(roomName).emit('game:turn-change', {
              currentTurnPlayerId: game.currentTurnPlayerId,
            });
            io.to(roomName).emit('game:state-update', {
              gameState: game.toClientState(),
            });
          }, CARD_FLIP_DELAY_MS);
          break;
      }
    });

    // --- REMATCH ---
    socket.on('player:rematch', () => {
      const game = gameManager.getGameForPlayer(socket.id);
      if (!game || game.phase !== 'finished') return;

      const wasNew = !game.rematchRequests.has(socket.id);
      game.rematchRequests.add(socket.id);

      // If only one player requested, tell them to wait AND tell the other
      // player that a rematch was requested so they can accept.
      if (game.rematchRequests.size < 2) {
        socket.emit('game:rematch-waiting');
        if (wasNew) {
          const opponent = game.players.find((p) => p.id !== socket.id);
          if (opponent) {
            io.sockets.sockets.get(opponent.id)?.emit('game:rematch-requested');
          }
        }
        return;
      }

      // Both players want a rematch — create new game and re-enter category selection
      const oldRoom = `game:${game.gameId}`;
      const newGame = gameManager.createRematch(game);

      const [p1, p2] = newGame.players;
      const p1Socket = io.sockets.sockets.get(p1.id);
      const p2Socket = io.sockets.sockets.get(p2.id);

      // Leave old room
      p1Socket?.leave(oldRoom);
      p2Socket?.leave(oldRoom);

      broadcastCategorySelecting(io, newGame);
    });

    // --- SPECTATE ---
    socket.on('spectator:join', ({ spectateCode }) => {
      const code = (spectateCode || '').trim().toUpperCase();
      if (!code) {
        socket.emit('game:error', { message: 'Invalid spectate code' });
        return;
      }

      const game = gameManager.getGameBySpectateCode(code);
      if (!game) {
        socket.emit('game:error', { message: 'Game not found' });
        return;
      }

      // Join the game room as spectator (receives all broadcasts)
      socket.join(`game:${game.gameId}`);
      socket.emit('game:spectate-start', {
        gameState: game.toClientState(),
        spectateCode: game.spectateCode,
        imageExtension: game.imageExtension,
      });
      console.log(`Spectator ${socket.id} joined game ${game.spectateCode}`);
    });

    // --- PLAY AGAIN (back to lobby) ---
    socket.on('player:play-again', () => {
      const game = gameManager.getGameForPlayer(socket.id);
      if (game) {
        socket.leave(`game:${game.gameId}`);
        gameManager.removeGame(game.gameId);
      }
    });

    // --- LEAVE ---
    socket.on('player:leave', () => {
      gameManager.removeFromQueue(socket.id);
      const game = gameManager.getGameForPlayer(socket.id);
      if (game) {
        game.markDisconnected(socket.id);
        io.to(`game:${game.gameId}`).emit('game:opponent-disconnected');
        socket.leave(`game:${game.gameId}`);
      }
    });

    // --- DISCONNECT ---
    socket.on('disconnect', () => {
      console.log(`Disconnected: ${socket.id}`);
      const game = gameManager.handleDisconnect(socket.id);
      if (game) {
        io.to(`game:${game.gameId}`).emit('game:opponent-disconnected');
      }
    });
  });
}
