import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../../infrastructure/SocketClient';
import styles from './CreateTablePage.module.css';

export function CreateTablePage() {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    setError(null);

    getSocket().emit('table:create', { name: name.trim() }, (response) => {
      setIsLoading(false);
      if (response.success && response.table) {
        navigate(`/table/${response.table.id}`);
      } else {
        setError(response.error ?? 'Не удалось создать стол');
      }
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Новый стол</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>Название стола</label>
          <input
            className={styles.input}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Спринт 42"
            autoFocus
            disabled={isLoading}
          />
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => navigate('/')}
            >
              Отмена
            </button>
            <button
              className={styles.submitBtn}
              type="submit"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
