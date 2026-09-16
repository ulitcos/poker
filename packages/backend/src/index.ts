import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import type { ClientToServerEvents, ServerToClientEvents } from '@planning-poker/shared';

import { InMemoryPlayerRepository } from './infrastructure/repositories/InMemoryPlayerRepository';
import { InMemoryTableRepository } from './infrastructure/repositories/InMemoryTableRepository';
import { InMemoryTaskRepository } from './infrastructure/repositories/InMemoryTaskRepository';
import { InMemoryVoteRepository } from './infrastructure/repositories/InMemoryVoteRepository';
import { SocketSessionStore } from './infrastructure/repositories/SocketSessionStore';
import { FileSessionResultRepository } from './infrastructure/persistence/FileSessionResultRepository';

import { PlayerService } from './application/use-cases/PlayerService';
import { SessionService } from './application/use-cases/SessionService';
import { TableService } from './application/use-cases/TableService';
import { TaskService } from './application/use-cases/TaskService';
import { VotingService } from './application/use-cases/VotingService';
import { SocketHandler } from './application/handlers/SocketHandler';

const PORT = process.env.PORT ?? 4000;
const DATA_DIR = path.join(process.cwd(), 'data', 'sessions');

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
});

// ─── Infrastructure ───────────────────────────────────────────────────────────
const playerRepo = new InMemoryPlayerRepository();
const tableRepo = new InMemoryTableRepository();
const taskRepo = new InMemoryTaskRepository();
const voteRepo = new InMemoryVoteRepository();
const sessionStore = new SocketSessionStore();
const sessionResultRepo = new FileSessionResultRepository(DATA_DIR);

// ─── Application ──────────────────────────────────────────────────────────────
const playerService = new PlayerService(playerRepo);
const sessionService = new SessionService(playerRepo);
const tableService = new TableService(tableRepo, playerRepo, taskRepo, voteRepo, sessionService, sessionResultRepo);
const taskService = new TaskService(taskRepo, voteRepo, playerRepo, sessionService);
const votingService = new VotingService(
  tableRepo,
  taskRepo,
  voteRepo,
  playerRepo,
  sessionResultRepo,
  sessionService,
);

// ─── REST: Results ────────────────────────────────────────────────────────────
app.get('/api/results', async (_req, res) => {
  const sessions = await sessionResultRepo.findAll();
  res.json(sessions);
});

app.get('/api/results/:sessionId', async (req, res) => {
  const session = await sessionResultRepo.findById(req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json(session);
});

// ─── Socket.io ────────────────────────────────────────────────────────────────
const socketHandler = new SocketHandler(
  io,
  sessionStore,
  playerService,
  tableService,
  taskService,
  votingService,
);
socketHandler.register();

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Planning Poker server running on port ${PORT}`);
});
