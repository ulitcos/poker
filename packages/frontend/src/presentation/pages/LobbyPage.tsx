import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../../application/contexts/SessionContext';
import { useTableList } from '../../application/contexts/TableListContext';
import styles from './LobbyPage.module.css';

export function LobbyPage() {
  const { player, logout } = useSession();
  const { tables } = useTableList();
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.logo}>Planning Poker</h1>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{player?.name}</span>
          <button className={styles.logoutBtn} onClick={logout}>Выйти</button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.topBar}>
          <h2 className={styles.sectionTitle}>Доступные столы</h2>
          <Link to="/create-table" className={styles.createBtn}>+ Создать стол</Link>
        </div>

        {tables.length === 0 ? (
          <div className={styles.empty}>
            <p>Нет активных столов. Создайте первый!</p>
          </div>
        ) : (
          <ul className={styles.tableList}>
            {tables.map((table) => (
              <li key={table.id} className={styles.tableCard}>
                <div className={styles.tableInfo}>
                  <span className={styles.tableName}>{table.name}</span>
                  <span className={styles.tableMeta}>
                    {table.playerCount} участников · {statusLabel(table.status)}
                  </span>
                </div>
                <button
                  className={styles.joinBtn}
                  onClick={() => navigate(`/table/${table.id}`)}
                >
                  Войти
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case 'waiting': return 'Ожидание';
    case 'active': return 'В процессе';
    case 'completed': return 'Завершен';
    default: return status;
  }
}
