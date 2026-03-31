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
const isProd = process.env.NODE_ENV === 'production';
const port = parseInt(process.env.PORT || String(SERVER_PORT), 10);

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: isProd
    ? {}
    : {
        origin: [`http://localhost:${CLIENT_PORT}`],
        methods: ['GET', 'POST'],
      },
});

if (!isProd) {
  app.use(cors());
}

// Serve static assets
app.use('/cards', express.static(path.join(__dirname, '../public/cards')));
app.use('/music', express.static(path.join(__dirname, '../public/music')));

// In production, serve the built Vite client
if (isProd) {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));

  // SPA fallback — serve index.html for any non-API/non-asset routes
  app.get('*', (_req, res, next) => {
    if (_req.path.startsWith('/api') || _req.path.startsWith('/cards') || _req.path.startsWith('/music') || _req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

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

httpServer.listen(port, () => {
  console.log(`Memory Game server running on port ${port} (${isProd ? 'production' : 'development'})`);
});
