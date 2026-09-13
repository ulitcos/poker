import type { PlayerId } from './Player';
import type { TaskId } from './Task';

export type TableId = string;

export type TableStatus = 'waiting' | 'active' | 'completed';

export type ScoringAlgorithm = 'average' | 'trimmed-average';

export interface Table {
  readonly id: TableId;
  name: string;
  adminId: PlayerId;
  status: TableStatus;
  activeTaskId: TaskId | null;
  scoringAlgorithm: ScoringAlgorithm;
  playerIds: PlayerId[];
}

export interface ITableRepository {
  findById(id: TableId): Table | undefined;
  findAll(): Table[];
  save(table: Table): void;
  delete(id: TableId): void;
}
