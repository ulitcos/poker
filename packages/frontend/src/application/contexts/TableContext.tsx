import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';
import type {
  Table,
  Player,
  Task,
  VoteView,
  ScoringAlgorithm,
  TableId,
  TaskId,
  PlayerId,
  ScoreResult,
} from '@planning-poker/shared';
import { getSocket } from '../../infrastructure/SocketClient';

interface TableState {
  table: Table | null;
  players: Player[];
  tasks: Task[];
  votes: VoteView[];
  calculatedScore: number | null;
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
  myVoteValue: number;
  myVoteSubmitted: boolean;
  revealedVotes: VoteView[] | null;
}

type TableAction =
  | { type: 'SET_STATE'; payload: Omit<TableState, 'isLoading' | 'error' | 'myVoteValue' | 'myVoteSubmitted' | 'revealedVotes'> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'PLAYER_JOINED'; payload: Player }
  | { type: 'PLAYER_LEFT'; payload: PlayerId }
  | { type: 'PLAYER_STATUS_CHANGED'; payload: { playerId: PlayerId; status: 'online' | 'offline' } }
  | { type: 'PLAYER_SETTINGS_CHANGED'; payload: { playerId: PlayerId; canVote: boolean; voteWeight: number } }
  | { type: 'TASK_ADDED'; payload: Task }
  | { type: 'TASK_REMOVED'; payload: TaskId }
  | { type: 'TASKS_REORDERED'; payload: Task[] }
  | { type: 'TASK_SWITCHED'; payload: TaskId }
  | { type: 'TASK_STATUS_CHANGED'; payload: { taskId: TaskId; status: Task['status']; finalScore?: number; isManualScore?: boolean } }
  | { type: 'VOTING_STARTED'; payload: { taskId: TaskId } }
  | { type: 'VOTING_PLAYER_SUBMITTED'; payload: PlayerId }
  | { type: 'VOTING_PLAYER_RETRACTED'; payload: PlayerId }
  | { type: 'MY_VOTE_RETRACTED' }
  | { type: 'VOTING_REVEALED'; payload: { votes: VoteView[]; calculatedScore: number; activeTaskId: TaskId } }
  | { type: 'VOTING_FINALIZED'; payload: { taskId: TaskId; score: ScoreResult } }
  | { type: 'VOTING_RESTARTED'; payload: TaskId }
  | { type: 'ALGORITHM_CHANGED'; payload: ScoringAlgorithm }
  | { type: 'UPDATE_MY_VOTE'; payload: number }
  | { type: 'MY_VOTE_SUBMITTED' }
  | { type: 'LEAVE_TABLE' };

const initialState: TableState = {
  table: null,
  players: [],
  tasks: [],
  votes: [],
  calculatedScore: null,
  sessionId: null,
  isLoading: false,
  error: null,
  myVoteValue: 0,
  myVoteSubmitted: false,
  revealedVotes: null,
};

function reducer(state: TableState, action: TableAction): TableState {
  switch (action.type) {
    case 'SET_STATE':
      return {
        ...state,
        ...action.payload,
        isLoading: false,
        error: null,
        myVoteValue: state.myVoteValue,
        myVoteSubmitted: state.myVoteSubmitted,
        revealedVotes: action.payload.votes.length > 0 ? action.payload.votes : null,
        calculatedScore: action.payload.calculatedScore,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'PLAYER_JOINED':
      return { ...state, players: [...state.players.filter((p) => p.id !== action.payload.id), action.payload] };
    case 'PLAYER_LEFT':
      return { ...state, players: state.players.filter((p) => p.id !== action.payload) };
    case 'PLAYER_STATUS_CHANGED':
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.payload.playerId ? { ...p, status: action.payload.status } : p
        ),
      };
    case 'PLAYER_SETTINGS_CHANGED':
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.payload.playerId
            ? { ...p, canVote: action.payload.canVote, voteWeight: action.payload.voteWeight }
            : p
        ),
      };
    case 'TASK_ADDED':
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'TASK_REMOVED':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.payload) };
    case 'TASKS_REORDERED':
      return { ...state, tasks: action.payload };
    case 'TASK_SWITCHED':
      return {
        ...state,
        table: state.table ? { ...state.table, activeTaskId: action.payload } : null,
        revealedVotes: null,
        myVoteValue: 0,
        myVoteSubmitted: false,
      };
    case 'TASK_STATUS_CHANGED':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.taskId
            ? {
                ...t,
                status: action.payload.status,
                finalScore: action.payload.finalScore ?? t.finalScore,
                isManualScore: action.payload.isManualScore ?? t.isManualScore,
              }
            : t
        ),
      };
    case 'VOTING_STARTED':
      return {
        ...state,
        myVoteValue: 0,
        myVoteSubmitted: false,
        revealedVotes: null,
        players: state.players.map((p) => ({ ...p, votingStatus: p.canVote ? 'pending' : null })),
      };
    case 'VOTING_PLAYER_SUBMITTED':
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.payload ? { ...p, votingStatus: 'voted' } : p
        ),
      };
    case 'VOTING_PLAYER_RETRACTED':
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.payload ? { ...p, votingStatus: 'pending' } : p
        ),
      };
    case 'MY_VOTE_RETRACTED':
      return { ...state, myVoteSubmitted: false };
    case 'VOTING_REVEALED':
      return {
        ...state,
        revealedVotes: action.payload.votes,
        calculatedScore: action.payload.calculatedScore,
      };
    case 'VOTING_FINALIZED':
      return {
        ...state,
        myVoteValue: 0,
        myVoteSubmitted: false,
        players: state.players.map((p) => ({ ...p, votingStatus: null })),
        table: state.table
          ? {
              ...state.table,
              activeTaskId: state.tasks.find(
                (t) => t.order > (state.tasks.find((x) => x.id === action.payload.taskId)?.order ?? -1)
                  && t.status === 'ready'
              )?.id ?? state.table.activeTaskId,
            }
          : null,
      };
    case 'VOTING_RESTARTED':
      return {
        ...state,
        revealedVotes: null,
        myVoteValue: 0,
        myVoteSubmitted: false,
        players: state.players.map((p) => ({ ...p, votingStatus: null })),
      };
    case 'ALGORITHM_CHANGED':
      return {
        ...state,
        table: state.table ? { ...state.table, scoringAlgorithm: action.payload } : null,
      };
    case 'UPDATE_MY_VOTE':
      return { ...state, myVoteValue: action.payload };
    case 'MY_VOTE_SUBMITTED':
      return { ...state, myVoteSubmitted: true };
    case 'LEAVE_TABLE':
      return initialState;
    default:
      return state;
  }
}

interface TableContextValue extends TableState {
  joinTable: (tableId: TableId) => Promise<void>;
  leaveTable: () => void;
  addTask: (tableId: TableId, url: string) => Promise<void>;
  removeTask: (tableId: TableId, taskId: TaskId) => void;
  reorderTasks: (tableId: TableId, orderedIds: TaskId[]) => void;
  switchTask: (tableId: TableId, taskId: TaskId) => void;
  startVoting: (tableId: TableId) => void;
  updateVoteValue: (tableId: TableId, value: number) => void;
  submitVote: (tableId: TableId) => void;
  retractVote: (tableId: TableId) => void;
  revealVotes: (tableId: TableId) => void;
  setManualScore: (tableId: TableId, score: number) => void;
  revertToCalculated: (tableId: TableId) => void;
  finalizeScore: (tableId: TableId) => void;
  restartVoting: (tableId: TableId, taskId: TaskId) => void;
  updatePlayerWeight: (tableId: TableId, playerId: PlayerId, weight: number) => void;
  togglePlayerCanVote: (tableId: TableId, playerId: PlayerId, canVote: boolean) => void;
  setAlgorithm: (tableId: TableId, algorithm: ScoringAlgorithm) => void;
}

const TableContext = createContext<TableContextValue | null>(null);

export function TableProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const socket = getSocket();

    socket.on('table:state', (s) => dispatch({ type: 'SET_STATE', payload: { table: s.table, players: s.players, tasks: s.tasks, votes: s.votes, calculatedScore: s.calculatedScore, sessionId: s.sessionId } }));
    socket.on('table:player-joined', (p) => dispatch({ type: 'PLAYER_JOINED', payload: p }));
    socket.on('table:player-left', (id) => dispatch({ type: 'PLAYER_LEFT', payload: id }));
    socket.on('table:player-status-changed', (p) => dispatch({ type: 'PLAYER_STATUS_CHANGED', payload: p }));
    socket.on('table:player-settings-changed', (p) => dispatch({ type: 'PLAYER_SETTINGS_CHANGED', payload: p }));
    socket.on('table:algorithm-changed', (alg) => dispatch({ type: 'ALGORITHM_CHANGED', payload: alg }));
    socket.on('task:added', (t) => dispatch({ type: 'TASK_ADDED', payload: t }));
    socket.on('task:removed', (id) => dispatch({ type: 'TASK_REMOVED', payload: id }));
    socket.on('task:reordered', (tasks) => dispatch({ type: 'TASKS_REORDERED', payload: tasks }));
    socket.on('task:switched', (id) => dispatch({ type: 'TASK_SWITCHED', payload: id }));
    socket.on('task:status-changed', (p) => dispatch({ type: 'TASK_STATUS_CHANGED', payload: p }));
    socket.on('voting:started', (p) => dispatch({ type: 'VOTING_STARTED', payload: p }));
    socket.on('voting:player-submitted', (id) => dispatch({ type: 'VOTING_PLAYER_SUBMITTED', payload: id }));
    socket.on('voting:player-retracted', (id) => dispatch({ type: 'VOTING_PLAYER_RETRACTED', payload: id }));
    socket.on('voting:revealed', (p) => dispatch({ type: 'VOTING_REVEALED', payload: p }));
    socket.on('voting:finalized', (p) => dispatch({ type: 'VOTING_FINALIZED', payload: p }));
    socket.on('voting:restarted', (id) => dispatch({ type: 'VOTING_RESTARTED', payload: id }));

    return () => {
      socket.off('table:state');
      socket.off('table:player-joined');
      socket.off('table:player-left');
      socket.off('table:player-status-changed');
      socket.off('table:player-settings-changed');
      socket.off('table:algorithm-changed');
      socket.off('task:added');
      socket.off('task:removed');
      socket.off('task:reordered');
      socket.off('task:switched');
      socket.off('task:status-changed');
      socket.off('voting:started');
      socket.off('voting:player-submitted');
      socket.off('voting:player-retracted');
      socket.off('voting:revealed');
      socket.off('voting:finalized');
      socket.off('voting:restarted');
    };
  }, []);

  const joinTable = useCallback(async (tableId: TableId) => {
    dispatch({ type: 'LEAVE_TABLE' });
    dispatch({ type: 'SET_LOADING', payload: true });
    return new Promise<void>((resolve, reject) => {
      getSocket().emit('table:join', { tableId }, (response) => {
        if (response.success && response.state) {
          dispatch({
            type: 'SET_STATE',
            payload: {
              table: response.state.table,
              players: response.state.players,
              tasks: response.state.tasks,
              votes: response.state.votes,
              calculatedScore: response.state.calculatedScore,
              sessionId: response.state.sessionId,
            },
          });
          resolve();
        } else {
          dispatch({ type: 'SET_ERROR', payload: response.error ?? 'Failed to join table' });
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  const leaveTable = useCallback(() => {
    getSocket().emit('table:leave');
    dispatch({ type: 'LEAVE_TABLE' });
  }, []);

  const addTask = useCallback(async (tableId: TableId, url: string) => {
    return new Promise<void>((resolve, reject) => {
      getSocket().emit('task:add', { tableId, url }, (response) => {
        if (response.success) resolve();
        else reject(new Error(response.error));
      });
    });
  }, []);

  const removeTask = useCallback((tableId: TableId, taskId: TaskId) => {
    getSocket().emit('task:remove', { tableId, taskId });
  }, []);

  const reorderTasks = useCallback((tableId: TableId, orderedIds: TaskId[]) => {
    getSocket().emit('task:reorder', { tableId, orderedIds });
  }, []);

  const switchTask = useCallback((tableId: TableId, taskId: TaskId) => {
    getSocket().emit('task:switch', { tableId, taskId });
  }, []);

  const startVoting = useCallback((tableId: TableId) => {
    getSocket().emit('voting:start', { tableId });
  }, []);

  const updateVoteValue = useCallback((tableId: TableId, value: number) => {
    dispatch({ type: 'UPDATE_MY_VOTE', payload: value });
    getSocket().emit('voting:update-value', { tableId, value });
  }, []);

  const submitVote = useCallback((tableId: TableId) => {
    dispatch({ type: 'MY_VOTE_SUBMITTED' });
    getSocket().emit('voting:submit', { tableId });
  }, []);

  const retractVote = useCallback((tableId: TableId) => {
    dispatch({ type: 'MY_VOTE_RETRACTED' });
    getSocket().emit('voting:retract', { tableId });
  }, []);

  const revealVotes = useCallback((tableId: TableId) => {
    getSocket().emit('voting:reveal', { tableId });
  }, []);

  const setManualScore = useCallback((tableId: TableId, score: number) => {
    getSocket().emit('voting:set-manual-score', { tableId, score });
  }, []);

  const revertToCalculated = useCallback((tableId: TableId) => {
    getSocket().emit('voting:revert-to-calculated', { tableId });
  }, []);

  const finalizeScore = useCallback((tableId: TableId) => {
    getSocket().emit('voting:finalize', { tableId });
  }, []);

  const restartVoting = useCallback((tableId: TableId, taskId: TaskId) => {
    getSocket().emit('voting:restart', { tableId, taskId });
  }, []);

  const updatePlayerWeight = useCallback((tableId: TableId, playerId: PlayerId, weight: number) => {
    getSocket().emit('player:update-weight', { tableId, playerId, weight });
  }, []);

  const togglePlayerCanVote = useCallback((tableId: TableId, playerId: PlayerId, canVote: boolean) => {
    getSocket().emit('player:toggle-can-vote', { tableId, playerId, canVote });
  }, []);

  const setAlgorithm = useCallback((tableId: TableId, algorithm: ScoringAlgorithm) => {
    getSocket().emit('table:set-algorithm', { tableId, algorithm });
  }, []);

  return (
    <TableContext.Provider
      value={{
        ...state,
        joinTable,
        leaveTable,
        addTask,
        removeTask,
        reorderTasks,
        switchTask,
        startVoting,
        updateVoteValue,
        submitVote,
        retractVote,
        revealVotes,
        setManualScore,
        revertToCalculated,
        finalizeScore,
        restartVoting,
        updatePlayerWeight,
        togglePlayerCanVote,
        setAlgorithm,
      }}
    >
      {children}
    </TableContext.Provider>
  );
}

export function useTable(): TableContextValue {
  const ctx = useContext(TableContext);
  if (!ctx) throw new Error('useTable must be used inside TableProvider');
  return ctx;
}
