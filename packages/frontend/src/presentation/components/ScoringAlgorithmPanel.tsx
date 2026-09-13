import React from 'react';
import type { ScoringAlgorithm, TableId } from '@planning-poker/shared';
import { useTable } from '../../application/contexts/TableContext';
import styles from './ScoringAlgorithmPanel.module.css';

interface Props {
  tableId: TableId;
  current: ScoringAlgorithm;
  isAdmin: boolean;
}

const ALGORITHMS: { value: ScoringAlgorithm; label: string; description: string }[] = [
  {
    value: 'average',
    label: 'Среднее взвешенное',
    description: 'Среднее арифметическое взвешенных оценок, округлённое до десятых',
  },
  {
    value: 'trimmed-average',
    label: 'Усечённое среднее',
    description: 'Отбрасывает max и min оценки перед расчётом среднего',
  },
];

export function ScoringAlgorithmPanel({ tableId, current, isAdmin }: Props) {
  const { setAlgorithm } = useTable();

  return (
    <div className={styles.panel}>
      <h3 className={styles.heading}>Алгоритм оценки</h3>
      <ul className={styles.list}>
        {ALGORITHMS.map((alg) => (
          <li
            key={alg.value}
            className={`${styles.item} ${alg.value === current ? styles.selected : ''} ${isAdmin ? styles.clickable : ''}`}
            onClick={() => isAdmin && setAlgorithm(tableId, alg.value)}
          >
            <div className={styles.radio}>
              <span className={`${styles.dot} ${alg.value === current ? styles.dotActive : ''}`} />
            </div>
            <div className={styles.text}>
              <span className={styles.label}>{alg.label}</span>
              <span className={styles.description}>{alg.description}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
