import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../application/contexts/SessionContext';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const [name, setName] = useState('');
  const { join, isConnecting, error } = useSession();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await join(name.trim());
      navigate('/');
    } catch {}
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Planning Poker</h1>
        <p className={styles.subtitle}>Введите ваше имя для участия</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            className={styles.input}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ваше имя"
            autoFocus
            disabled={isConnecting}
          />
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.button} type="submit" disabled={isConnecting || !name.trim()}>
            {isConnecting ? 'Подключение...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}
