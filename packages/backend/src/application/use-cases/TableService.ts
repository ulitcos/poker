import { v4 as uuidv4 } from 'uuid';
import type {
  Table,
  TableId,
  ITableRepository,
  IPlayerRepository,
  ITaskRepository,
  IVoteRepository,
  ISessionResultRepository,
  Player,
  PlayerId,
  Task,
  TaskId,
  ScoringAlgorithm,
  VoteView,
  TableState,
  TableListItem,
} from '@planning-poker/shared';
import { ScoringStrategyFactory } from '@planning-poker/shared';
import type { SessionService } from './SessionService';

export class TableService {
  constructor(
    private readonly tableRepo: ITableRepository,
    private readonly playerRepo: IPlayerRepository,
    private readonly taskRepo: ITaskRepository,
    private readonly voteRepo: IVoteRepository,
    private readonly sessionService: SessionService,
    private readonly sessionResultRepo: ISessionResultRepository,
  ) {}

  createTable(adminId: PlayerId, name: string): Table {
    const table: Table = {
      id: uuidv4(),
      name,
      adminId,
      status: 'waiting',
      activeTaskId: null,
      scoringAlgorithm: 'average',
      playerIds: [adminId],
    };
    this.tableRepo.save(table);
    return table;
  }

  async joinTable(tableId: TableId, playerId: PlayerId): Promise<Table> {
    let table = this.tableRepo.findById(tableId);

    if (!table) {
      table = await this.restoreFromSession(tableId);
    }

    if (!table.playerIds.includes(playerId)) {
      table.playerIds.push(playerId);
      this.tableRepo.save(table);
    }
    return table;
  }

  private async restoreFromSession(tableId: TableId): Promise<Table> {
    const sessions = await this.sessionResultRepo.findAll();
    const session = sessions.find((s) => s.tableId === tableId && s.finishedAt == null);
    if (!session) throw new Error(`Table ${tableId} not found`);

    const lastScore = session.scores[session.scores.length - 1];
    const algorithm: ScoringAlgorithm = lastScore?.algorithm ?? 'average';

    const uniqueTaskIds = Array.from(new Set(session.scores.map((s) => s.taskId)));
    const tasks: Task[] = uniqueTaskIds.map((taskId, index) => {
      const scoreEntry = session.scores.filter((s) => s.taskId === taskId).pop()!;
      const task: Task = {
        id: taskId,
        url: scoreEntry.taskUrl,
        status: 'finalized',
        finalScore: scoreEntry.finalScore,
        isManualScore: scoreEntry.isManualScore,
        order: index,
      };
      this.taskRepo.save(task);
      this.sessionService.registerTask(tableId, taskId);
      return task;
    });

    const sessionId = session.sessionId;
    this.sessionService.restoreSession(tableId, sessionId);

    const table: Table = {
      id: tableId,
      name: session.tableName,
      adminId: '',
      status: tasks.length > 0 ? 'completed' : 'waiting',
      activeTaskId: tasks[tasks.length - 1]?.id ?? null,
      scoringAlgorithm: algorithm,
      playerIds: [],
    };
    this.tableRepo.save(table);
    return table;
  }

  leaveTable(tableId: TableId, playerId: PlayerId): void {
    const table = this.tableRepo.findById(tableId);
    if (!table) return;
    table.playerIds = table.playerIds.filter((id) => id !== playerId);
    this.tableRepo.save(table);
  }

  getTableState(tableId: TableId): TableState {
    const table = this.requireTable(tableId);
    const players = table.playerIds
      .map((id) => this.playerRepo.findById(id))
      .filter((p): p is Player => p !== undefined);
    const tasks = this.taskRepo.findAll().filter((t) => {
      // tasks belong to table via session
      return this.sessionService.taskBelongsToTable(t.id, tableId);
    });
    const activeTask = table.activeTaskId
      ? this.taskRepo.findById(table.activeTaskId)
      : undefined;

    let votes: VoteView[] = [];
    let calculatedScore: number | null = null;

    if (activeTask && (activeTask.status === 'revealed' || activeTask.status === 'finalized')) {
      const rawVotes = this.voteRepo.findByTaskId(activeTask.id);
      const strategy = ScoringStrategyFactory.create(table.scoringAlgorithm);
      const playerVotes = rawVotes
        .filter((v) => v.isSubmitted)
        .map((v) => {
          const player = this.playerRepo.findById(v.playerId);
          return {
            playerId: v.playerId,
            playerName: player?.name ?? v.playerId,
            value: v.value,
            weight: player?.voteWeight ?? 1,
            isDropped: false,
          };
        });

      const output = strategy.calculate(playerVotes);
      votes = output.votesWithMeta;
      calculatedScore = output.result;
    }

    return {
      table,
      players,
      tasks,
      votes,
      calculatedScore,
      sessionId: this.sessionService.getSessionId(tableId),
    };
  }

  async getTableList(): Promise<TableListItem[]> {
    const sessions = await this.sessionResultRepo.findAll();

    const finishedIds = new Set(
      sessions.filter((s) => s.finishedAt != null).map((s) => s.tableId)
    );

    // Tables from session files that haven't been finished
    const fromFiles: TableListItem[] = sessions
      .filter((s) => s.finishedAt == null)
      .map((s) => {
        const mem = this.tableRepo.findById(s.tableId);
        return {
          id: s.tableId,
          name: s.tableName,
          playerCount: mem?.playerIds.length ?? 0,
          status: mem?.status ?? 'active',
        };
      });

    const fromFilesIds = new Set(fromFiles.map((t) => t.id));

    // In-memory tables not yet written to any file (no votes finalized)
    const onlyInMemory: TableListItem[] = this.tableRepo.findAll()
      .filter((t) => !finishedIds.has(t.id) && !fromFilesIds.has(t.id))
      .map((t) => ({
        id: t.id,
        name: t.name,
        playerCount: t.playerIds.length,
        status: t.status,
      }));

    return [...fromFiles, ...onlyInMemory];
  }

  setAlgorithm(tableId: TableId, algorithm: ScoringAlgorithm): void {
    const table = this.requireTable(tableId);
    table.scoringAlgorithm = algorithm;
    this.tableRepo.save(table);
  }

  requireTable(tableId: TableId): Table {
    const table = this.tableRepo.findById(tableId);
    if (!table) throw new Error(`Table ${tableId} not found`);
    return table;
  }

  isAdmin(tableId: TableId, playerId: PlayerId): boolean {
    const table = this.tableRepo.findById(tableId);
    return table?.adminId === playerId;
  }
}
