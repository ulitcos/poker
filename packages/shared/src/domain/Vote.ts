import type { PlayerId } from './Player';
import type { TaskId } from './Task';

export type VoteId = string;

export interface Vote {
  readonly id: VoteId;
  readonly taskId: TaskId;
  readonly playerId: PlayerId;
  value: number;
  isSubmitted: boolean;
}

export interface IVoteRepository {
  findByTaskId(taskId: TaskId): Vote[];
  findByTaskAndPlayer(taskId: TaskId, playerId: PlayerId): Vote | undefined;
  save(vote: Vote): void;
  deleteByTaskId(taskId: TaskId): void;
}
