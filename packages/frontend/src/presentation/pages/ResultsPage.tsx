import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SessionResult, PlayerVoteRecord } from '@planning-poker/shared';
import styles from './ResultsPage.module.css';

interface PlayerStat {
  playerName: string;
  totalVotes: number;
  mostMin: number;
  mostMax: number;
  averageScore: number;
}

export function ResultsPage() {
  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [selected, setSelected] = useState<SessionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/results')
      .then((r) => r.json())
      .then((data: SessionResult[]) => {
        setSessions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.backLink}>← Лобби</Link>
        <h1 className={styles.title}>История оценок</h1>
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          {loading && <p className={styles.hint}>Загрузка...</p>}
          {!loading && sessions.length === 0 && (
            <p className={styles.hint}>Нет завершённых сессий</p>
          )}
          {sessions.map((s) => (
            <button
              key={s.sessionId}
              className={`${styles.sessionBtn} ${selected?.sessionId === s.sessionId ? styles.selectedBtn : ''}`}
              onClick={() => setSelected(s)}
            >
              <span className={styles.sessionName}>{s.tableName}</span>
              <span className={styles.sessionMeta}>
                {new Date(s.startedAt).toLocaleDateString('ru-RU')} · {s.scores.length} задач
              </span>
            </button>
          ))}
        </aside>

        <main className={styles.main}>
          {!selected && <p className={styles.hint}>Выберите сессию для просмотра статистики</p>}
          {selected && <SessionStats session={selected} />}
        </main>
      </div>
    </div>
  );
}

function SessionStats({ session }: { session: SessionResult }) {
  const stats = computeStats(session);

  return (
    <div className={styles.stats}>
      <h2 className={styles.statsTitle}>{session.tableName}</h2>
      <p className={styles.statsMeta}>
        {new Date(session.startedAt).toLocaleString('ru-RU')} ·{' '}
        {session.scores.length} задач оценено
      </p>

      <h3 className={styles.sectionHeading}>Статистика по участникам</h3>
      <div className={styles.playerStatsGrid}>
        {stats.map((stat) => (
          <div key={stat.playerName} className={styles.playerStatCard}>
            <div className={styles.playerStatName}>{stat.playerName}</div>
            <div className={styles.playerStatRow}>
              <span className={styles.statLabel}>Голосов</span>
              <span className={styles.statValue}>{stat.totalVotes}</span>
            </div>
            <div className={styles.playerStatRow}>
              <span className={styles.statLabel}>Был минимумом</span>
              <span className={styles.statValue}>{stat.mostMin}×</span>
            </div>
            <div className={styles.playerStatRow}>
              <span className={styles.statLabel}>Был максимумом</span>
              <span className={styles.statValue}>{stat.mostMax}×</span>
            </div>
            <div className={styles.playerStatRow}>
              <span className={styles.statLabel}>Средняя оценка</span>
              <span className={styles.statValue}>{stat.averageScore.toFixed(1)}</span>
            </div>
          </div>
        ))}
      </div>

      <h3 className={styles.sectionHeading}>Задачи</h3>
      <table className={styles.taskTable}>
        <thead>
          <tr>
            <th>Задача</th>
            <th>Алгоритм</th>
            <th>Итог</th>
            <th>Вручную</th>
          </tr>
        </thead>
        <tbody>
          {session.scores.map((score) => (
            <tr key={score.taskId}>
              <td>
                <a href={score.taskUrl} target="_blank" rel="noopener noreferrer" className={styles.taskLink}>
                  {score.taskUrl.split('/').pop()}
                </a>
              </td>
              <td>{score.algorithm}</td>
              <td className={styles.finalScore}>{score.finalScore}</td>
              <td>{score.isManualScore ? 'Да' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function computeStats(session: SessionResult): PlayerStat[] {
  const map = new Map<string, PlayerStat>();

  for (const score of session.scores) {
    const values = score.votes.map((v) => v.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    for (const vote of score.votes) {
      const existing = map.get(vote.playerName) ?? {
        playerName: vote.playerName,
        totalVotes: 0,
        mostMin: 0,
        mostMax: 0,
        averageScore: 0,
      };

      const total = existing.totalVotes;
      existing.averageScore = (existing.averageScore * total + vote.value) / (total + 1);
      existing.totalVotes += 1;
      if (vote.value === minVal) existing.mostMin += 1;
      if (vote.value === maxVal) existing.mostMax += 1;

      map.set(vote.playerName, existing);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalVotes - a.totalVotes);
}
