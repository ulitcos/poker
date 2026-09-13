import { v4 as uuidv4 } from 'uuid';
import type { TableId, TaskId, PlayerId, IPlayerRepository } from '@planning-poker/shared';

export class SessionService {
  private readonly tableToSession = new Map<TableId, string>();
  private readonly sessionToTable = new Map<string, TableId>();
  private readonly tableToTasks = new Map<TableId, Set<TaskId>>();

  constructor(private readonly playerRepo: IPlayerRepository) {}

  getSessionId(tableId: TableId): string {
    let sessionId = this.tableToSession.get(tableId);
    if (!sessionId) {
      sessionId = uuidv4();
      this.tableToSession.set(tableId, sessionId);
      this.sessionToTable.set(sessionId, tableId);
    }
    return sessionId;
  }

  registerTask(tableId: TableId, taskId: TaskId): void {
    const tasks = this.tableToTasks.get(tableId) ?? new Set();
    tasks.add(taskId);
    this.tableToTasks.set(tableId, tasks);
  }

  removeTask(tableId: TableId, taskId: TaskId): void {
    this.tableToTasks.get(tableId)?.delete(taskId);
  }

  taskBelongsToTable(taskId: TaskId, tableId: TableId): boolean {
    return this.tableToTasks.get(tableId)?.has(taskId) ?? false;
  }

  getTasksForTable(tableId: TableId): Set<TaskId> {
    return this.tableToTasks.get(tableId) ?? new Set();
  }
}
