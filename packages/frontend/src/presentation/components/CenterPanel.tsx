import React, { useState } from 'react';
import type { Task, TableId, VoteView, Player } from '@planning-poker/shared';
import { useTable } from '../../application/contexts/TableContext';
import { VotingWindow } from './VotingWindow';
import styles from './CenterPanel.module.css';

interface Props {
  tableId: TableId;
  activeTask: Task | undefined;
  allTasksFinalized: boolean;
  isAdmin: boolean;
  currentPlayer: Player | undefined;
  players: Player[];
}

export function CenterPanel({ tableId, activeTask, allTasksFinalized, isAdmin, currentPlayer, players }: Props) {
  const {
    startVoting,
    revealVotes,
    setManualScore,
    revertToCalculated,
    finalizeScore,
    revealedVotes,
    calculatedScore,
  } = useTable();

  const [manualScoreInput, setManualScoreInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

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

  if (allTasksFinalized) {
    return (
      <div className={styles.center}>
        <div className={styles.statusBadge} data-status="completed">Все задачи оценены</div>
        <p className={styles.hint}>Выберите задачу в боковой панели для перезапуска оценки</p>
      </div>
    );
  }

  if (!activeTask) {
    return (
      <div className={styles.center}>
        <p className={styles.hint}>Добавьте задачи в список</p>
      </div>
    );
  }

  return (
    <div className={styles.center}>
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

      <div className={`${styles.statusBadge}`} data-status={activeTask.status}>
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
          {canVote && <VotingWindow tableId={tableId} />}
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
                <span className={styles.scoreValue}>{activeTask.finalScore}</span>
              </>
            ) : (
              <>
                <span className={styles.scoreLabel}>Результат ({algorithmName(calculatedScore)})</span>
                <span className={styles.scoreValue}>{calculatedScore}</span>
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

              <button className={styles.primaryBtn} onClick={() => finalizeScore(tableId)}>
                Зафиксировать оценку
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
                <span className={styles.scoreValue}>{activeTask.finalScore}</span>
              </>
            ) : (
              <>
                <span className={styles.scoreLabel}>Итог по формуле</span>
                <span className={styles.scoreValue}>{activeTask.finalScore}</span>
              </>
            )}
          </div>
        </div>
      )}
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

function algorithmName(score: number | null): string {
  return score !== null ? String(score) : '–';
}
