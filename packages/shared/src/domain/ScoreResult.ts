import type { PlayerId } from './Player';
import type { TaskId } from './Task';
import type { TableId } from './Table';
import type { ScoringAlgorithm } from './Table';

export interface PlayerVoteRecord {
  playerId: PlayerId;
  playerName: string;
  value: number;
  weight: number;
  isDropped: boolean;
}

export interface ScoreResult {
  taskId: TaskId;
  tableId: TableId;
  taskUrl: string;
  algorithm: ScoringAlgorithm;
  votes: PlayerVoteRecord[];
  calculatedScore: number;
  finalScore: number;
  isManualScore: boolean;
  timestamp: number;
}

export interface SessionResult {
  readonly sessionId: string;
  readonly tableName: string;
  readonly tableId: TableId;
  readonly adminId: PlayerId;
  readonly startedAt: number;
  finishedAt: number | null;
  scores: ScoreResult[];
}

export interface ISessionResultRepository {
  save(result: SessionResult): Promise<void>;
  findAll(): Promise<SessionResult[]>;
  findById(sessionId: string): Promise<SessionResult | undefined>;
}
