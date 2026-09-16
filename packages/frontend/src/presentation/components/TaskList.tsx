import React, { useState } from 'react';
import type { Task, TaskId, TableId } from '@planning-poker/shared';
import { useTable } from '../../application/contexts/TableContext';
import styles from './TaskList.module.css';

interface Props {
  tableId: TableId;
  tasks: Task[];
  activeTaskId: TaskId | null;
  isAdmin: boolean;
  canSwitch: boolean;
  allFinalized?: boolean;
  onFinishSession?: () => void;
  scoringAlgorithmPanel?: React.ReactNode;
}

export function TaskList({ tableId, tasks, activeTaskId, isAdmin, canSwitch, allFinalized, onFinishSession, scoringAlgorithmPanel }: Props) {
  const { addTask, removeTask, reorderTasks, switchTask } = useTable();
  const [newUrl, setNewUrl] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleFinishClick = () => setShowConfirm(true);
  const handleConfirm = () => {
    setShowConfirm(false);
    onFinishSession?.();
  };
  const handleCancel = () => setShowConfirm(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    try {
      await addTask(tableId, newUrl.trim());
      setNewUrl('');
    } catch {}
  };

  const handleDragStart = (index: number) => setDragIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const reordered = [...tasks];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    reorderTasks(tableId, reordered.map((t) => t.id));
    setDragIndex(index);
  };

  const handleDragEnd = () => setDragIndex(null);

  return (
    <aside className={styles.sidebar}>
      <h3 className={styles.heading}>Задачи</h3>

      <form onSubmit={handleAdd} className={styles.addForm}>
        <input
          className={styles.input}
          type="url"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="https://tracker.example.com/..."
        />
        <button className={styles.addBtn} type="submit" disabled={!newUrl.trim()}>+</button>
      </form>

      <ul className={styles.list}>
        {tasks.map((task, index) => (
          <li
            key={task.id}
            className={`${styles.item} ${task.id === activeTaskId ? styles.active : ''} ${task.status === 'finalized' ? styles.finalized : ''}`}
            draggable={isAdmin}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
          >
            <div className={styles.itemContent}>
              {isAdmin && <span className={styles.dragHandle}>⠿</span>}
              <div className={styles.itemInfo}>
                {task.id === activeTaskId && <span className={styles.activeDot} />}
                <a
                  href={task.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.taskUrl}
                >
                  {shortUrl(task.url)}
                </a>
                {task.finalScore !== null && (
                  <span className={styles.score}>{task.finalScore}</span>
                )}
              </div>
            </div>
            <div className={styles.itemActions}>
              {task.id !== activeTaskId && (canSwitch && isAdmin || allFinalized) && (
                <button
                  className={styles.switchBtn}
                  onClick={() => switchTask(tableId, task.id)}
                  title="Переключить"
                >
                  →
                </button>
              )}
              <button
                className={styles.deleteBtn}
                onClick={() => removeTask(tableId, task.id)}
                title="Удалить"
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>

      {scoringAlgorithmPanel}

      {isAdmin && (
        <div className={styles.finishWrapper}>
          <button className={styles.finishBtn} onClick={handleFinishClick}>
            Завершить оценку
          </button>
        </div>
      )}

      {showConfirm && (
        <div className={styles.overlay}>
          <div className={styles.dialog}>
            <p className={styles.dialogText}>Завершить оценку? Все участники будут выброшены из лобби.</p>
            <div className={styles.dialogActions}>
              <button className={styles.dialogConfirm} onClick={handleConfirm}>Завершить</button>
              <button className={styles.dialogCancel} onClick={handleCancel}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || u.hostname;
  } catch {
    return url.slice(0, 30);
  }
}
