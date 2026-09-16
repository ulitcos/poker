import { v4 as uuidv4 } from 'uuid';
import type {
  Table,
  TableId,
  TaskId,
  PlayerId,
  Vote,
  ITableRepository,
  ITaskRepository,
  IVoteRepository,
  IPlayerRepository,
  ISessionResultRepository,
  VoteView,
  ScoreResult,
  SessionResult,
  ScoringAlgorithm,
} from '@planning-poker/shared';
import { ScoringStrategyFactory } from '@planning-poker/shared';
import type { SessionService } from './SessionService';

export interface RevealResult {
  votes: VoteView[];
  calculatedScore: number;
  activeTaskId: TaskId;
}

export class VotingService {
  constructor(
    private readonly tableRepo: ITableRepository,
    private readonly taskRepo: ITaskRepository,
    private readonly voteRepo: IVoteRepository,
    private readonly playerRepo: IPlayerRepository,
    private readonly sessionResultRepo: ISessionResultRepository,
    private readonly sessionService: SessionService,
  ) {}

  startVoting(tableId: TableId): TaskId {
    const table = this.requireTable(tableId);
    const tasks = this.getOrderedTasks(tableId);
    const activeTask = table.activeTaskId
      ? this.taskRepo.findById(table.activeTaskId)
      : tasks[0];

    if (!activeTask) throw new Error('No tasks available');
    if (activeTask.status !== 'ready') throw new Error('Task is not in ready state');

    activeTask.status = 'voting';
    this.taskRepo.save(activeTask);

    if (!table.activeTaskId) {
      table.activeTaskId = activeTask.id;
      this.tableRepo.save(table);
    }

    const votingPlayers = table.playerIds
      .map((id) => this.playerRepo.findById(id))
      .filter((p) => p?.canVote);

    votingPlayers.forEach((player) => {
      if (!player) return;
      player.votingStatus = 'pending';
      this.playerRepo.save(player);
    });

    return activeTask.id;
  }

  updateVoteValue(tableId: TableId, playerId: PlayerId, value: number): void {
    const table = this.requireTable(tableId);
    if (!table.activeTaskId) throw new Error('No active task');

    const task = this.taskRepo.findById(table.activeTaskId);
    if (!task || task.status !== 'voting') throw new Error('Voting not in progress');

    const existing = this.voteRepo.findByTaskAndPlayer(table.activeTaskId, playerId);
    if (existing && existing.isSubmitted) return;

    const vote: Vote = {
      id: existing?.id ?? uuidv4(),
      taskId: table.activeTaskId,
      playerId,
      value,
      isSubmitted: false,
    };
    this.voteRepo.save(vote);
  }

  retractVote(tableId: TableId, playerId: PlayerId): void {
    const table = this.requireTable(tableId);
    if (!table.activeTaskId) throw new Error('No active task');

    const task = this.taskRepo.findById(table.activeTaskId);
    if (!task || task.status !== 'voting') throw new Error('Voting not in progress');

    const existing = this.voteRepo.findByTaskAndPlayer(table.activeTaskId, playerId);
    if (existing) {
      existing.isSubmitted = false;
      this.voteRepo.save(existing);
    }

    const player = this.playerRepo.findById(playerId);
    if (player) {
      player.votingStatus = 'pending';
      this.playerRepo.save(player);
    }
  }

  submitVote(tableId: TableId, playerId: PlayerId): void {
    const table = this.requireTable(tableId);
    if (!table.activeTaskId) throw new Error('No active task');

    const existing = this.voteRepo.findByTaskAndPlayer(table.activeTaskId, playerId);
    if (!existing) throw new Error('No vote found');

    existing.isSubmitted = true;
    this.voteRepo.save(existing);

    const player = this.playerRepo.findById(playerId);
    if (player) {
      player.votingStatus = 'voted';
      this.playerRepo.save(player);
    }
  }

  revealVotes(tableId: TableId): RevealResult {
    const table = this.requireTable(tableId);
    if (!table.activeTaskId) throw new Error('No active task');

    const task = this.taskRepo.findById(table.activeTaskId);
    if (!task) throw new Error('Task not found');

    task.status = 'revealed';
    this.taskRepo.save(task);

    return this.calculateCurrentScore(table);
  }

  setManualScore(tableId: TableId, score: number): void {
    const table = this.requireTable(tableId);
    if (!table.activeTaskId) throw new Error('No active task');

    const task = this.taskRepo.findById(table.activeTaskId);
    if (!task) throw new Error('Task not found');

    task.finalScore = score;
    task.isManualScore = true;
    this.taskRepo.save(task);
  }

  revertToCalculated(tableId: TableId): RevealResult {
    const table = this.requireTable(tableId);
    if (!table.activeTaskId) throw new Error('No active task');

    const task = this.taskRepo.findById(table.activeTaskId);
    if (!task) throw new Error('Task not found');

    const result = this.calculateCurrentScore(table);
    task.finalScore = result.calculatedScore;
    task.isManualScore = false;
    this.taskRepo.save(task);

    return result;
  }

  async finalizeScore(tableId: TableId): Promise<ScoreResult> {
    const table = this.requireTable(tableId);
    if (!table.activeTaskId) throw new Error('No active task');

    const task = this.taskRepo.findById(table.activeTaskId);
    if (!task) throw new Error('Task not found');

    const result = this.calculateCurrentScore(table);
    const finalScore = task.isManualScore && task.finalScore !== null
      ? task.finalScore
      : result.calculatedScore;

    task.finalScore = finalScore;
    task.status = 'finalized';
    this.taskRepo.save(task);

    const scoreResult: ScoreResult = {
      taskId: task.id,
      tableId,
      taskUrl: task.url,
      algorithm: table.scoringAlgorithm,
      votes: result.votes,
      calculatedScore: result.calculatedScore,
      finalScore,
      isManualScore: task.isManualScore,
      timestamp: Date.now(),
    };

    await this.persistScoreResult(tableId, table.name, scoreResult);

    const orderedTasks = this.getOrderedTasks(tableId);
    const currentIndex = orderedTasks.findIndex((t) => t.id === task.id);
    const nextTask = orderedTasks[currentIndex + 1];

    if (nextTask) {
      table.activeTaskId = nextTask.id;
      table.status = 'active';
    } else {
      table.status = 'completed';
    }
    this.tableRepo.save(table);

    const votingPlayers = table.playerIds
      .map((id) => this.playerRepo.findById(id))
      .filter(Boolean);
    votingPlayers.forEach((player) => {
      if (!player) return;
      player.votingStatus = null;
      this.playerRepo.save(player);
    });

    return scoreResult;
  }

  restartVoting(tableId: TableId, taskId: TaskId): void {
    const table = this.requireTable(tableId);
    const task = this.taskRepo.findById(taskId);
    if (!task) throw new Error('Task not found');

    task.status = 'ready';
    task.finalScore = null;
    task.isManualScore = false;
    this.taskRepo.save(task);

    this.voteRepo.deleteByTaskId(taskId);

    table.activeTaskId = taskId;
    this.tableRepo.save(table);

    const votingPlayers = table.playerIds
      .map((id) => this.playerRepo.findById(id))
      .filter(Boolean);
    votingPlayers.forEach((player) => {
      if (!player) return;
      player.votingStatus = null;
      this.playerRepo.save(player);
    });
  }

  switchActiveTask(tableId: TableId, taskId: TaskId): void {
    const table = this.requireTable(tableId);
    const currentTask = table.activeTaskId
      ? this.taskRepo.findById(table.activeTaskId)
      : undefined;

    if (currentTask && currentTask.status !== 'ready' && currentTask.status !== 'finalized') {
      throw new Error('Cannot switch tasks during active voting');
    }

    table.activeTaskId = taskId;
    this.tableRepo.save(table);
  }

  private calculateCurrentScore(table: Table): RevealResult {
    if (!table.activeTaskId) throw new Error('No active task');

    const rawVotes = this.voteRepo.findByTaskId(table.activeTaskId);
    const submittedVotes = rawVotes.filter((v) => v.isSubmitted);

    const playerVotes = submittedVotes.map((v) => {
      const player = this.playerRepo.findById(v.playerId);
      return {
        playerId: v.playerId,
        playerName: player?.name ?? v.playerId,
        value: v.value,
        weight: player?.voteWeight ?? 1,
        isDropped: false,
      };
    });

    const strategy = ScoringStrategyFactory.create(table.scoringAlgorithm);
    const output = strategy.calculate(playerVotes);

    return {
      votes: output.votesWithMeta,
      calculatedScore: output.result,
      activeTaskId: table.activeTaskId,
    };
  }

  private async persistScoreResult(
    tableId: TableId,
    tableName: string,
    scoreResult: ScoreResult
  ): Promise<void> {
    const sessionId = this.sessionService.getSessionId(tableId);
    let session = await this.sessionResultRepo.findById(sessionId);

    if (!session) {
      const table = this.requireTable(tableId);
      session = {
        sessionId,
        tableName,
        tableId,
        adminId: table.adminId,
        startedAt: scoreResult.timestamp,
        finishedAt: null,
        scores: [],
      };
    }

    const idx = session.scores.findIndex((s) => s.taskId === scoreResult.taskId);
    if (idx !== -1) {
      session.scores[idx] = scoreResult;
    } else {
      session.scores.push(scoreResult);
    }
    await this.sessionResultRepo.save(session);
  }

  async finishSession(tableId: TableId): Promise<void> {
    const sessionId = this.sessionService.getSessionId(tableId);
    let session = await this.sessionResultRepo.findById(sessionId);

    const table = this.requireTable(tableId);

    if (!session) {
      session = {
        sessionId,
        tableName: table.name,
        tableId,
        adminId: table.adminId,
        startedAt: Date.now(),
        finishedAt: null,
        scores: [],
      };
    }

    session.finishedAt = Date.now();
    await this.sessionResultRepo.save(session);
  }

  private getOrderedTasks(tableId: TableId) {
    const taskIds = this.sessionService.getTasksForTable(tableId);
    return Array.from(taskIds)
      .map((id) => this.taskRepo.findById(id))
      .filter((t): t is NonNullable<typeof t> => t !== undefined)
      .sort((a, b) => a.order - b.order);
  }

  private requireTable(tableId: TableId): Table {
    const table = this.tableRepo.findById(tableId);
    if (!table) throw new Error(`Table ${tableId} not found`);
    return table;
  }
}
