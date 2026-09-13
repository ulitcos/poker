export type TaskId = string;

export type TaskStatus =
  | 'ready'
  | 'voting'
  | 'revealed'
  | 'finalized';

export interface Task {
  readonly id: TaskId;
  url: string;
  status: TaskStatus;
  finalScore: number | null;
  isManualScore: boolean;
  order: number;
}

export interface ITaskRepository {
  findById(id: TaskId): Task | undefined;
  findAll(): Task[];
  save(task: Task): void;
  delete(id: TaskId): void;
  reorder(orderedIds: TaskId[]): void;
}
