import type { Task, TaskId, ITaskRepository } from '@planning-poker/shared';

export class InMemoryTaskRepository implements ITaskRepository {
  private readonly store = new Map<TaskId, Task>();

  findById(id: TaskId): Task | undefined {
    return this.store.get(id);
  }

  findAll(): Task[] {
    return Array.from(this.store.values()).sort((a, b) => a.order - b.order);
  }

  save(task: Task): void {
    this.store.set(task.id, { ...task });
  }

  delete(id: TaskId): void {
    this.store.delete(id);
  }

  reorder(orderedIds: TaskId[]): void {
    orderedIds.forEach((id, index) => {
      const task = this.store.get(id);
      if (task) {
        this.store.set(id, { ...task, order: index });
      }
    });
  }
}
