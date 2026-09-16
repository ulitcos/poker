import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '../../application/contexts/SessionContext';
import { useTable } from '../../application/contexts/TableContext';
import { getSocket } from '../../infrastructure/SocketClient';
import { TaskList } from '../components/TaskList';
import { PlayerList } from '../components/PlayerList';
import { ScoringAlgorithmPanel } from '../components/ScoringAlgorithmPanel';
import { CenterPanel } from '../components/CenterPanel';
import styles from './TablePage.module.css';

export function TablePage() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const { player } = useSession();
  const { table, players, tasks, isLoading, error, joinTable, leaveTable, finishSession } = useTable();

  useEffect(() => {
    if (!tableId) return;
    joinTable(tableId).catch(() => {});
  }, [tableId]);

  useEffect(() => {
    const socket = getSocket();
    const handleFinished = () => navigate('/');
    socket.on('session:finished', handleFinished);
    return () => { socket.off('session:finished', handleFinished); };
  }, [navigate]);

  const handleLeave = () => {
    leaveTable();
    navigate('/');
  };

  if (isLoading) {
    return <div className={styles.loading}>Подключение к столу...</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <button onClick={() => navigate('/')}>На главную</button>
      </div>
    );
  }

  if (!table || !player) return null;

  const isAdmin = table.adminId === player.id;
  const activeTask = tasks.find((t) => t.id === table.activeTaskId);
  const canSwitchTasks = !activeTask || activeTask.status === 'ready' || activeTask.status === 'finalized' || table.status === 'completed';
  const allTasksFinalized = tasks.length > 0 && tasks.every((t) => t.status === 'finalized');

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={handleLeave}>← Лобби</button>
          <h1 className={styles.tableName}>{table.name}</h1>
          {isAdmin && <span className={styles.adminBadge}>admin</span>}
        </div>
        <div className={styles.headerRight}>
          <span className={styles.playerName}>{player.name}</span>
        </div>
      </header>

      <div className={styles.body}>
        <TaskList
          tableId={table.id}
          tasks={tasks}
          activeTaskId={table.activeTaskId}
          isAdmin={isAdmin}
          canSwitch={canSwitchTasks}
          allFinalized={allTasksFinalized}
          onFinishSession={() => finishSession(table.id)}
          scoringAlgorithmPanel={
            <ScoringAlgorithmPanel
              tableId={table.id}
              current={table.scoringAlgorithm}
              isAdmin={isAdmin}
            />
          }
        />

        <main className={styles.main}>
          <CenterPanel
            tableId={table.id}
            activeTask={activeTask}
            tasks={tasks}
            allTasksFinalized={allTasksFinalized}
            isAdmin={isAdmin}
            currentPlayer={players.find((p) => p.id === player.id)}
            players={players}
          />
        </main>

        <PlayerList
          tableId={table.id}
          players={players}
          currentPlayerId={player.id}
          adminId={table.adminId}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
