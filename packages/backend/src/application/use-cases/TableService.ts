import { v4 as uuidv4 } from 'uuid';
import type {
  Table,
  TableId,
  ITableRepository,
  IPlayerRepository,
  ITaskRepository,
  IVoteRepository,
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

  joinTable(tableId: TableId, playerId: PlayerId): Table {
    const table = this.requireTable(tableId);
    if (!table.playerIds.includes(playerId)) {
      table.playerIds.push(playerId);
      this.tableRepo.save(table);
    }
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

  getTableList(): TableListItem[] {
    return this.tableRepo.findAll().map((t) => ({
      id: t.id,
      name: t.name,
      playerCount: t.playerIds.length,
      status: t.status,
    }));
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
