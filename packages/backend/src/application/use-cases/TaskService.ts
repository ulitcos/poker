import { v4 as uuidv4 } from 'uuid';
import type {
  Task,
  TaskId,
  TableId,
  PlayerId,
  ITaskRepository,
  IVoteRepository,
  IPlayerRepository,
} from '@planning-poker/shared';
import type { SessionService } from './SessionService';

export class TaskService {
  constructor(
    private readonly taskRepo: ITaskRepository,
    private readonly voteRepo: IVoteRepository,
    private readonly playerRepo: IPlayerRepository,
    private readonly sessionService: SessionService,
  ) {}

  addTask(tableId: TableId, url: string): Task {
    const existingTasks = this.getTasksForTable(tableId);
    const task: Task = {
      id: uuidv4(),
      url,
      status: 'ready',
      finalScore: null,
      isManualScore: false,
      order: existingTasks.length,
    };
    this.taskRepo.save(task);
    this.sessionService.registerTask(tableId, task.id);
    return task;
  }

  removeTask(tableId: TableId, taskId: TaskId): void {
    this.sessionService.removeTask(tableId, taskId);
    this.voteRepo.deleteByTaskId(taskId);
    this.taskRepo.delete(taskId);
  }

  reorderTasks(tableId: TableId, orderedIds: TaskId[]): Task[] {
    this.taskRepo.reorder(orderedIds);
    return this.getTasksForTable(tableId);
  }

  getTasksForTable(tableId: TableId): Task[] {
    const taskIds = this.sessionService.getTasksForTable(tableId);
    return Array.from(taskIds)
      .map((id) => this.taskRepo.findById(id))
      .filter((t): t is Task => t !== undefined)
      .sort((a, b) => a.order - b.order);
  }

  requireTask(taskId: TaskId): Task {
    const task = this.taskRepo.findById(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    return task;
  }
}
