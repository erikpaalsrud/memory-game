import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { SERVER_PORT, CLIENT_PORT } from 'memory-game-shared';
import type { ClientToServerEvents, ServerToClientEvents } from 'memory-game-shared';
import { GameManager } from './game/GameManager.js';
import { setupSocketHandlers } from './socket/handlers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: [`http://localhost:${CLIENT_PORT}`],
    methods: ['GET', 'POST'],
  },
});

app.use(cors());

// Serve card images as static files
app.use('/cards', express.static(path.join(__dirname, '../public/cards')));

// Initialize game manager and socket handlers
const gameManager = new GameManager();
setupSocketHandlers(io, gameManager);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    games: gameManager.getActiveGameCount(),
    queue: gameManager.getQueueSize(),
  });
});

httpServer.listen(SERVER_PORT, () => {
  console.log(`Memory Game server running on http://localhost:${SERVER_PORT}`);
});
