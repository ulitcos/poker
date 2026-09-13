import type { Table, TableId, ITableRepository } from '@planning-poker/shared';

export class InMemoryTableRepository implements ITableRepository {
  private readonly store = new Map<TableId, Table>();

  findById(id: TableId): Table | undefined {
    return this.store.get(id);
  }

  findAll(): Table[] {
    return Array.from(this.store.values());
  }

  save(table: Table): void {
    this.store.set(table.id, { ...table, playerIds: [...table.playerIds] });
  }

  delete(id: TableId): void {
    this.store.delete(id);
  }
}
