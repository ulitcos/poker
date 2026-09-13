import type { Player, PlayerId } from '../domain/Player';
import type { Table, TableId, ScoringAlgorithm } from '../domain/Table';
import type { Task, TaskId } from '../domain/Task';
import type { Vote } from '../domain/Vote';
import type { ScoreResult, SessionResult } from '../domain/ScoreResult';

// ─── Client → Server ─────────────────────────────────────────────────────────

export interface ClientToServerEvents {
  'session:join': (payload: { playerName: string }, callback: (response: JoinResponse) => void) => void;

  'table:create': (payload: { name: string }, callback: (response: TableResponse) => void) => void;
  'table:join': (payload: { tableId: TableId }, callback: (response: TableStateResponse) => void) => void;
  'table:leave': () => void;

  'task:add': (payload: { tableId: TableId; url: string }, callback: (response: TaskResponse) => void) => void;
  'task:remove': (payload: { tableId: TableId; taskId: TaskId }) => void;
  'task:reorder': (payload: { tableId: TableId; orderedIds: TaskId[] }) => void;
  'task:switch': (payload: { tableId: TableId; taskId: TaskId }) => void;

  'voting:start': (payload: { tableId: TableId }) => void;
  'voting:update-value': (payload: { tableId: TableId; value: number }) => void;
  'voting:submit': (payload: { tableId: TableId }) => void;
  'voting:retract': (payload: { tableId: TableId }) => void;
  'voting:reveal': (payload: { tableId: TableId }) => void;
  'voting:set-manual-score': (payload: { tableId: TableId; score: number }) => void;
  'voting:revert-to-calculated': (payload: { tableId: TableId }) => void;
  'voting:finalize': (payload: { tableId: TableId }) => void;
  'voting:restart': (payload: { tableId: TableId; taskId: TaskId }) => void;

  'player:update-weight': (payload: { tableId: TableId; playerId: PlayerId; weight: number }) => void;
  'player:toggle-can-vote': (payload: { tableId: TableId; playerId: PlayerId; canVote: boolean }) => void;

  'table:set-algorithm': (payload: { tableId: TableId; algorithm: ScoringAlgorithm }) => void;
}

// ─── Server → Client ─────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  'table:list-updated': (tables: TableListItem[]) => void;
  'table:state': (state: TableState) => void;
  'table:player-joined': (player: Player) => void;
  'table:player-left': (playerId: PlayerId) => void;
  'table:player-status-changed': (payload: { playerId: PlayerId; status: 'online' | 'offline' }) => void;
  'table:player-settings-changed': (payload: { playerId: PlayerId; canVote: boolean; voteWeight: number }) => void;
  'table:algorithm-changed': (algorithm: ScoringAlgorithm) => void;

  'task:added': (task: Task) => void;
  'task:removed': (taskId: TaskId) => void;
  'task:reordered': (tasks: Task[]) => void;
  'task:switched': (taskId: TaskId) => void;
  'task:status-changed': (payload: { taskId: TaskId; status: Task['status']; finalScore?: number; isManualScore?: boolean }) => void;

  'voting:started': (payload: { taskId: TaskId }) => void;
  'voting:player-submitted': (playerId: PlayerId) => void;
  'voting:player-retracted': (playerId: PlayerId) => void;
  'voting:revealed': (payload: { votes: VoteView[]; calculatedScore: number; activeTaskId: TaskId }) => void;
  'voting:finalized': (payload: { taskId: TaskId; score: ScoreResult }) => void;
  'voting:restarted': (taskId: TaskId) => void;

  'error': (message: string) => void;
}

// ─── Shared Response Types ────────────────────────────────────────────────────

export interface JoinResponse {
  success: boolean;
  player?: Player;
  error?: string;
}

export interface TableResponse {
  success: boolean;
  table?: Table;
  error?: string;
}

export interface TaskResponse {
  success: boolean;
  task?: Task;
  error?: string;
}

export interface TableStateResponse {
  success: boolean;
  state?: TableState;
  error?: string;
}

export interface TableListItem {
  id: TableId;
  name: string;
  playerCount: number;
  status: Table['status'];
}

export interface VoteView {
  playerId: PlayerId;
  playerName: string;
  value: number;
  weight: number;
  isDropped: boolean;
}

export interface TableState {
  table: Table;
  players: Player[];
  tasks: Task[];
  votes: VoteView[];
  calculatedScore: number | null;
  sessionId: string;
}
