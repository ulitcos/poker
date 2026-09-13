import type { Player, PlayerId, IPlayerRepository } from '@planning-poker/shared';

export class InMemoryPlayerRepository implements IPlayerRepository {
  private readonly store = new Map<PlayerId, Player>();

  findById(id: PlayerId): Player | undefined {
    return this.store.get(id);
  }

  findAll(): Player[] {
    return Array.from(this.store.values());
  }

  save(player: Player): void {
    this.store.set(player.id, { ...player });
  }

  delete(id: PlayerId): void {
    this.store.delete(id);
  }
}
