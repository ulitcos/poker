import React from 'react';
import type { TableId } from '@planning-poker/shared';
import { useTable } from '../../application/contexts/TableContext';
import styles from './VotingWindow.module.css';

interface Props {
  tableId: TableId;
}

const STEPS = [1, 2, 4, 8, 40];

export function VotingWindow({ tableId }: Props) {
  const { myVoteValue, myVoteSubmitted, updateVoteValue, submitVote, retractVote } = useTable();

  if (myVoteSubmitted) {
    return (
      <div className={styles.submitted}>
        <span className={styles.checkIcon}>✓</span>
        <p>Ваша оценка принята. Ждём остальных...</p>
        <span className={styles.value}>{myVoteValue}</span>
        <button className={styles.retractBtn} onClick={() => retractVote(tableId)}>
          Переоценить
        </button>
      </div>
    );
  }

  const handleDelta = (delta: number) => {
    const newValue = Math.max(0, myVoteValue + delta);
    updateVoteValue(tableId, newValue);
  };

  return (
    <div className={styles.window}>
      <p className={styles.label}>Ваша оценка</p>
      <div className={styles.valueDisplay}>{myVoteValue}</div>

      <div className={styles.buttonsGroup}>
        <div className={styles.plusButtons}>
          {STEPS.map((step) => (
            <button
              key={`+${step}`}
              className={`${styles.btn} ${styles.plusBtn}`}
              onClick={() => handleDelta(step)}
            >
              +{step}
            </button>
          ))}
        </div>
        <div className={styles.minusButtons}>
          {STEPS.map((step) => (
            <button
              key={`-${step}`}
              className={`${styles.btn} ${styles.minusBtn}`}
              onClick={() => handleDelta(-step)}
              disabled={myVoteValue < step}
            >
              -{step}
            </button>
          ))}
        </div>
      </div>

      <button
        className={styles.submitBtn}
        onClick={() => submitVote(tableId)}
        disabled={myVoteValue === 0}
      >
        Оценить
      </button>
    </div>
  );
}
