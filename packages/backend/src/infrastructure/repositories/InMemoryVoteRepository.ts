import type { Vote, VoteId, PlayerId, TaskId, IVoteRepository } from '@planning-poker/shared';

export class InMemoryVoteRepository implements IVoteRepository {
  private readonly store = new Map<VoteId, Vote>();

  findByTaskId(taskId: TaskId): Vote[] {
    return Array.from(this.store.values()).filter((v) => v.taskId === taskId);
  }

  findByTaskAndPlayer(taskId: TaskId, playerId: PlayerId): Vote | undefined {
    return Array.from(this.store.values()).find(
      (v) => v.taskId === taskId && v.playerId === playerId
    );
  }

  save(vote: Vote): void {
    this.store.set(vote.id, { ...vote });
  }

  deleteByTaskId(taskId: TaskId): void {
    for (const [id, vote] of this.store.entries()) {
      if (vote.taskId === taskId) {
        this.store.delete(id);
      }
    }
  }
}
