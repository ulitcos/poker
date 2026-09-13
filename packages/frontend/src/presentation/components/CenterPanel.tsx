import React, { useState } from 'react';
import type { Task, TableId, VoteView, Player } from '@planning-poker/shared';
import { useTable } from '../../application/contexts/TableContext';
import { VotingWindow } from './VotingWindow';
import { formatHours } from '../utils/formatHours';
import styles from './CenterPanel.module.css';

interface Props {
  tableId: TableId;
  activeTask: Task | undefined;
  tasks: Task[];
  allTasksFinalized: boolean;
  isAdmin: boolean;
  currentPlayer: Player | undefined;
  players: Player[];
}

export function CenterPanel({ tableId, activeTask, tasks, allTasksFinalized, isAdmin, currentPlayer, players }: Props) {
  const {
    startVoting,
    revealVotes,
    setManualScore,
    revertToCalculated,
    finalizeScore,
    restartVoting,
    switchTask,
    revealedVotes,
    calculatedScore,
    myVoteSubmitted,
  } = useTable();

  const [manualScoreInput, setManualScoreInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const nextTask = (() => {
    if (!activeTask) return undefined;
    const unfinished = tasks.filter((t) => t.id !== activeTask.id && t.status !== 'finalized');
    return (
      unfinished.find((t) => t.order > activeTask.order) ??
      unfinished.find((t) => t.order < activeTask.order)
    );
  })();

  const canVote = currentPlayer?.canVote ?? false;
  const isVoting = activeTask?.status === 'voting';
  const isRevealed = activeTask?.status === 'revealed';
  const isReady = activeTask?.status === 'ready';
  const isFinalized = activeTask?.status === 'finalized';

  const votingPlayers = players.filter((p) => p.canVote);
  const allVoted = votingPlayers.length > 0 && votingPlayers.every((p) => p.votingStatus === 'voted');

  const handleManualScore = () => {
    const score = parseFloat(manualScoreInput);
    if (isNaN(score)) return;
    setManualScore(tableId, score);
    setShowManualInput(false);
    setManualScoreInput('');
  };

  if (!activeTask) {
    return (
      <div className={styles.center}>
        {allTasksFinalized
          ? <div className={styles.statusBadge} data-status="completed">Все задачи оценены</div>
          : <p className={styles.hint}>Добавьте задачи в список</p>
        }
      </div>
    );
  }

  const finalized = tasks.filter((t) => t.status === 'finalized');
  const totalHours = finalized.reduce((sum, t) => sum + (t.finalScore ?? 0), 0);

  return (
    <div className={styles.center}>
      {allTasksFinalized && (
        <div className={styles.statusBadge} data-status="completed">Все задачи оценены</div>
      )}
      <div className={styles.progressLine}>
        Оценено <strong>{finalized.length}</strong> из <strong>{tasks.length}</strong> задач на <strong>{formatHours(totalHours)}</strong>
      </div>

      <div className={styles.taskCard}>
        <span className={styles.taskLabel}>Текущая задача</span>
        <a
          href={activeTask.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.taskUrl}
        >
          {activeTask.url}
        </a>
      </div>

      <div className={styles.statusBadge} data-status={activeTask.status}>
        {statusLabel(activeTask.status)}
      </div>

      {isReady && (
        <>
          {isAdmin && (
            <button className={styles.primaryBtn} onClick={() => startVoting(tableId)}>
              Начать оценку
            </button>
          )}
          {!isAdmin && <p className={styles.hint}>Ожидание старта от администратора</p>}
        </>
      )}

      {isVoting && (
        <>
          {canVote && (
            <VotingWindow
              tableId={tableId}
              isLastToVote={
                !myVoteSubmitted &&
                votingPlayers.filter((p) => p.id !== currentPlayer?.id).every((p) => p.votingStatus === 'voted')
              }
            />
          )}
          {!canVote && <p className={styles.hint}>Вы наблюдатель в этом голосовании</p>}
          {isAdmin && allVoted && (
            <button className={styles.primaryBtn} onClick={() => revealVotes(tableId)}>
              Раскрыть оценки
            </button>
          )}
        </>
      )}

      {isRevealed && revealedVotes && (
        <div className={styles.revealedSection}>
          <div className={styles.voteGrid}>
            {revealedVotes.map((vote) => (
              <VoteCard key={vote.playerId} vote={vote} />
            ))}
          </div>

          <div className={styles.scoreResult}>
            {activeTask.isManualScore ? (
              <>
                <span className={styles.scoreLabel}>Оценка администратора</span>
                <span className={styles.scoreValue}>{formatHours(activeTask.finalScore ?? 0)}</span>
              </>
            ) : (
              <>
                <span className={styles.scoreLabel}>Результат</span>
                <span className={styles.scoreValue}>
                  {calculatedScore !== null ? formatHours(calculatedScore) : '–'}
                </span>
                {calculatedScore !== null && <FormulaBreakdown votes={revealedVotes} />}
              </>
            )}
          </div>

          {isAdmin && (
            <div className={styles.adminActions}>
              {!showManualInput && (
                <button className={styles.secondaryBtn} onClick={() => setShowManualInput(true)}>
                  Установить оценку вручную
                </button>
              )}
              {showManualInput && (
                <div className={styles.manualInput}>
                  <input
                    type="number"
                    value={manualScoreInput}
                    onChange={(e) => setManualScoreInput(e.target.value)}
                    placeholder="Введите оценку"
                    className={styles.input}
                  />
                  <button className={styles.primaryBtn} onClick={handleManualScore}>
                    Применить
                  </button>
                  <button className={styles.cancelBtn} onClick={() => setShowManualInput(false)}>
                    Отмена
                  </button>
                </div>
              )}
              {activeTask.isManualScore && (
                <button className={styles.secondaryBtn} onClick={() => revertToCalculated(tableId)}>
                  Вернуть результат от общей оценки
                </button>
              )}
              {nextTask ? (
                <button
                  className={styles.primaryBtn}
                  onClick={() => finalizeScore(tableId)}
                  title={nextTask.url}
                >
                  Перейти к следующей задаче →
                </button>
              ) : (
                <button className={styles.primaryBtn} onClick={() => finalizeScore(tableId)}>
                  Зафиксировать оценку
                </button>
              )}
              <button
                className={styles.dangerBtn}
                onClick={() => restartVoting(tableId, activeTask.id)}
              >
                Сбросить оценку
              </button>
            </div>
          )}
        </div>
      )}

      {isFinalized && (
        <div className={styles.revealedSection}>
          {revealedVotes && revealedVotes.length > 0 && (
            <div className={styles.voteGrid}>
              {revealedVotes.map((vote) => (
                <VoteCard key={vote.playerId} vote={vote} />
              ))}
            </div>
          )}
          <div className={styles.scoreResult}>
            {activeTask.isManualScore ? (
              <>
                <span className={styles.scoreLabel}>Оценка администратора</span>
                <span className={styles.scoreValue}>{formatHours(activeTask.finalScore ?? 0)}</span>
              </>
            ) : (
              <>
                <span className={styles.scoreLabel}>Итог по формуле</span>
                <span className={styles.scoreValue}>{formatHours(activeTask.finalScore ?? 0)}</span>
                {revealedVotes && revealedVotes.length > 0 && (
                  <FormulaBreakdown votes={revealedVotes} />
                )}
              </>
            )}
          </div>
          {isAdmin && (
            <div className={styles.adminActions}>
              {nextTask && (
                <button
                  className={styles.primaryBtn}
                  onClick={() => switchTask(tableId, nextTask.id)}
                  title={nextTask.url}
                >
                  Перейти к следующей задаче →
                </button>
              )}
              <button
                className={styles.dangerBtn}
                onClick={() => restartVoting(tableId, activeTask.id)}
              >
                Сбросить оценку
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FormulaBreakdown({ votes }: { votes: VoteView[] }) {
  const active = votes.filter((v) => !v.isDropped);
  const terms = active.map((v) => `${v.value} × ${v.weight.toFixed(1)}`).join(' + ');
  const weightedSum = active.reduce((sum, v) => sum + v.value * v.weight, 0);
  const result = Math.round((weightedSum / active.length) * 10) / 10;

  return (
    <div className={styles.formula}>
      <span className={styles.formulaStep}>({terms}) / {active.length}</span>
      <span className={styles.formulaArrow}>= {Math.round(weightedSum * 10) / 10} / {active.length}</span>
      <span className={styles.formulaArrow}>= {result} → {formatHours(result)}</span>
    </div>
  );
}

function VoteCard({ vote }: { vote: VoteView }) {
  return (
    <div className={`${styles.voteCard} ${vote.isDropped ? styles.dropped : ''}`}>
      <span className={styles.voterName}>{vote.playerName}</span>
      <span className={styles.voteValue}>{vote.value}</span>
      <span className={styles.voteWeight}>×{vote.weight.toFixed(1)}</span>
      {vote.isDropped && <span className={styles.droppedLabel}>откинута</span>}
    </div>
  );
}

function statusLabel(status: Task['status']): string {
  switch (status) {
    case 'ready': return 'Готов к оценке';
    case 'voting': return 'В оценке';
    case 'revealed': return 'Оценка завершена';
    case 'finalized': return 'Зафиксировано';
  }
}
