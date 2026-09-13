import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  TableId,
  PlayerId,
} from '@planning-poker/shared';
import type { PlayerService } from '../use-cases/PlayerService';
import type { TableService } from '../use-cases/TableService';
import type { TaskService } from '../use-cases/TaskService';
import type { VotingService } from '../use-cases/VotingService';
import type { SocketSessionStore } from '../../infrastructure/repositories/SocketSessionStore';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export class SocketHandler {
  constructor(
    private readonly io: TypedServer,
    private readonly sessionStore: SocketSessionStore,
    private readonly playerService: PlayerService,
    private readonly tableService: TableService,
    private readonly taskService: TaskService,
    private readonly votingService: VotingService,
  ) {}

  register(): void {
    this.io.on('connection', (socket: TypedSocket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: TypedSocket): void {
    socket.on('session:join', (payload, callback) => {
      try {
        const existing = this.sessionStore.getBySocket(socket.id);
        const player = this.playerService.getOrCreate(payload.playerName, existing?.playerId);

        this.sessionStore.set(socket.id, {
          socketId: socket.id,
          playerId: player.id,
          tableId: null,
        });

        callback({ success: true, player });
        this.broadcastTableList();
      } catch (err) {
        callback({ success: false, error: String(err) });
      }
    });

    socket.on('table:create', (payload, callback) => {
      try {
        const session = this.requireSession(socket.id);
        const table = this.tableService.createTable(session.playerId, payload.name);

        socket.join(table.id);
        this.sessionStore.setTableId(socket.id, table.id);

        callback({ success: true, table });
        this.broadcastTableList();
      } catch (err) {
        callback({ success: false, error: String(err) });
      }
    });

    socket.on('table:join', (payload, callback) => {
      try {
        const session = this.requireSession(socket.id);
        const table = this.tableService.joinTable(payload.tableId, session.playerId);

        socket.join(table.id);
        this.sessionStore.setTableId(socket.id, payload.tableId);

        const state = this.tableService.getTableState(payload.tableId);
        const joiningPlayer = this.playerService.findById(session.playerId);
        if (joiningPlayer) {
          socket.to(table.id).emit('table:player-joined', joiningPlayer);
        }
        callback({ success: true, state });
        this.broadcastTableList();
      } catch (err) {
        callback({ success: false, error: String(err) });
      }
    });

    socket.on('table:leave', () => {
      const session = this.sessionStore.getBySocket(socket.id);
      if (!session?.tableId) return;
      this.handlePlayerLeaveTable(socket, session.playerId, session.tableId);
    });

    socket.on('task:add', (payload, callback) => {
      try {
        this.requireAdmin(socket.id, payload.tableId);
        const task = this.taskService.addTask(payload.tableId, payload.url);
        this.io.to(payload.tableId).emit('task:added', task);
        callback({ success: true, task });
      } catch (err) {
        callback({ success: false, error: String(err) });
      }
    });

    socket.on('task:remove', (payload) => {
      try {
        this.requireAdmin(socket.id, payload.tableId);
        this.taskService.removeTask(payload.tableId, payload.taskId);
        this.io.to(payload.tableId).emit('task:removed', payload.taskId);
      } catch (err) {
        socket.emit('error', String(err));
      }
    });

    socket.on('task:reorder', (payload) => {
      try {
        this.requireAdmin(socket.id, payload.tableId);
        const tasks = this.taskService.reorderTasks(payload.tableId, payload.orderedIds);
        this.io.to(payload.tableId).emit('task:reordered', tasks);
      } catch (err) {
        socket.emit('error', String(err));
      }
    });

    socket.on('task:switch', (payload) => {
      try {
        this.requireAdmin(socket.id, payload.tableId);
        this.votingService.switchActiveTask(payload.tableId, payload.taskId);
        this.io.to(payload.tableId).emit('task:switched', payload.taskId);
      } catch (err) {
        socket.emit('error', String(err));
      }
    });

    socket.on('voting:start', (payload) => {
      try {
        this.requireAdmin(socket.id, payload.tableId);
        const taskId = this.votingService.startVoting(payload.tableId);
        this.io.to(payload.tableId).emit('voting:started', { taskId });
        this.io.to(payload.tableId).emit('task:status-changed', { taskId, status: 'voting' });
        this.broadcastTableState(payload.tableId);
      } catch (err) {
        socket.emit('error', String(err));
      }
    });

    socket.on('voting:update-value', (payload) => {
      try {
        const session = this.requireSession(socket.id);
        this.votingService.updateVoteValue(payload.tableId, session.playerId, payload.value);
      } catch (err) {
        socket.emit('error', String(err));
      }
    });

    socket.on('voting:submit', (payload) => {
      try {
        const session = this.requireSession(socket.id);
        this.votingService.submitVote(payload.tableId, session.playerId);
        this.io.to(payload.tableId).emit('voting:player-submitted', session.playerId);
        this.broadcastTableState(payload.tableId);
      } catch (err) {
        socket.emit('error', String(err));
      }
    });

    socket.on('voting:retract', (payload) => {
      try {
        const session = this.requireSession(socket.id);
        this.votingService.retractVote(payload.tableId, session.playerId);
        this.io.to(payload.tableId).emit('voting:player-retracted', session.playerId);
        this.broadcastTableState(payload.tableId);
      } catch (err) {
        socket.emit('error', String(err));
      }
    });

    socket.on('voting:reveal', (payload) => {
      try {
        this.requireAdmin(socket.id, payload.tableId);
        const result = this.votingService.revealVotes(payload.tableId);
        this.io.to(payload.tableId).emit('voting:revealed', result);
        this.io.to(payload.tableId).emit('task:status-changed', {
          taskId: result.activeTaskId,
          status: 'revealed',
        });
        this.broadcastTableState(payload.tableId);
      } catch (err) {
        socket.emit('error', String(err));
      }
    });

    socket.on('voting:set-manual-score', (payload) => {
      try {
        this.requireAdmin(socket.id, payload.tableId);
        this.votingService.setManualScore(payload.tableId, payload.score);
        const table = this.tableService.requireTable(payload.tableId);
        if (table.activeTaskId) {
          this.io.to(payload.tableId).emit('task:status-changed', {
            taskId: table.activeTaskId,
            status: 'revealed',
            finalScore: payload.score,
            isManualScore: true,
          });
        }
        this.broadcastTableState(payload.tableId);
      } catch (err) {
        socket.emit('error', String(err));
      }
    });

    socket.on('voting:revert-to-calculated', (payload) => {
      try {
        this.requireAdmin(socket.id, payload.tableId);
        const result = this.votingService.revertToCalculated(payload.tableId);
        this.io.to(payload.tableId).emit('voting:revealed', result);
        this.broadcastTableState(payload.tableId);
      } catch (err) {
        socket.emit('error', String(err));
      }
    });

    socket.on('voting:finalize', async (payload) => {
      try {
        this.requireAdmin(socket.id, payload.tableId);
        const scoreResult = await this.votingService.finalizeScore(payload.tableId);
        this.io.to(payload.tableId).emit('voting:finalized', {
          taskId: scoreResult.taskId,
          score: scoreResult,
        });
        this.io.to(payload.tableId).emit('task:status-changed', {
          taskId: scoreResult.taskId,
          status: 'finalized',
          finalScore: scoreResult.finalScore,
        });
        this.broadcastTableState(payload.tableId);
        this.broadcastTableList();
      } catch (err) {
        socket.emit('error', String(err));
      }
    });

    socket.on('voting:restart', (payload) => {
      try {
        this.requireAdmin(socket.id, payload.tableId);
        this.votingService.restartVoting(payload.tableId, payload.taskId);
        this.io.to(payload.tableId).emit('voting:restarted', payload.taskId);
        this.io.to(payload.tableId).emit('task:status-changed', {
          taskId: payload.taskId,
          status: 'ready',
        });
        this.broadcastTableState(payload.tableId);
      } catch (err) {
        socket.emit('error', String(err));
      }
    });

    socket.on('player:update-weight', (payload) => {
      try {
        this.requireAdmin(socket.id, payload.tableId);
        const player = this.playerService.updateWeight(payload.playerId, payload.weight);
        this.io.to(payload.tableId).emit('table:player-settings-changed', {
          playerId: payload.playerId,
          canVote: player.canVote,
          voteWeight: player.voteWeight,
        });
      } catch (err) {
        socket.emit('error', String(err));
      }
    });

    socket.on('player:toggle-can-vote', (payload) => {
      try {
        this.requireAdmin(socket.id, payload.tableId);
        const player = this.playerService.toggleCanVote(payload.playerId, payload.canVote);
        this.io.to(payload.tableId).emit('table:player-settings-changed', {
          playerId: payload.playerId,
          canVote: player.canVote,
          voteWeight: player.voteWeight,
        });
      } catch (err) {
        socket.emit('error', String(err));
      }
    });

    socket.on('table:set-algorithm', (payload) => {
      try {
        this.requireAdmin(socket.id, payload.tableId);
        this.tableService.setAlgorithm(payload.tableId, payload.algorithm);
        this.io.to(payload.tableId).emit('table:algorithm-changed', payload.algorithm);
        this.broadcastTableState(payload.tableId);
      } catch (err) {
        socket.emit('error', String(err));
      }
    });

    socket.on('disconnect', () => {
      const session = this.sessionStore.getBySocket(socket.id);
      if (!session) return;

      this.playerService.setOffline(session.playerId);

      if (session.tableId) {
        this.io.to(session.tableId).emit('table:player-status-changed', {
          playerId: session.playerId,
          status: 'offline',
        });
      }

      this.sessionStore.delete(socket.id);
    });
  }

  private handlePlayerLeaveTable(socket: TypedSocket, playerId: PlayerId, tableId: TableId): void {
    socket.leave(tableId);
    this.tableService.leaveTable(tableId, playerId);
    this.sessionStore.setTableId(socket.id, null);
    socket.to(tableId).emit('table:player-left', playerId);
    this.broadcastTableList();
  }

  private broadcastTableState(tableId: TableId): void {
    try {
      const state = this.tableService.getTableState(tableId);
      this.io.to(tableId).emit('table:state', state);
    } catch {
      // table may not exist
    }
  }

  private broadcastTableList(): void {
    const list = this.tableService.getTableList();
    this.io.emit('table:list-updated', list);
  }

  private requireSession(socketId: string) {
    const session = this.sessionStore.getBySocket(socketId);
    if (!session) throw new Error('Not authenticated');
    return session;
  }

  private requireAdmin(socketId: string, tableId: TableId): void {
    const session = this.requireSession(socketId);
    if (!this.tableService.isAdmin(tableId, session.playerId)) {
      throw new Error('Admin access required');
    }
  }

}
