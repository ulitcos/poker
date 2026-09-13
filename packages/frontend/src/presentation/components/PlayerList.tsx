import React from 'react';
import type { Player, PlayerId, TableId } from '@planning-poker/shared';
import { useTable } from '../../application/contexts/TableContext';
import styles from './PlayerList.module.css';

interface Props {
  tableId: TableId;
  players: Player[];
  currentPlayerId: PlayerId;
  adminId: PlayerId;
  isAdmin: boolean;
}

export function PlayerList({ tableId, players, currentPlayerId, adminId, isAdmin }: Props) {
  const { updatePlayerWeight, togglePlayerCanVote } = useTable();

  return (
    <div className={styles.panel}>
      <h3 className={styles.heading}>Участники</h3>
      <ul className={styles.list}>
        {players.map((player) => (
          <li key={player.id} className={styles.item}>
            <div className={styles.info}>
              <span
                className={`${styles.statusDot} ${player.status === 'online' ? styles.online : styles.offline}`}
                title={player.status}
              />
              <span className={styles.name}>
                {player.name}
                {player.id === currentPlayerId && <span className={styles.you}> (вы)</span>}
                {player.id === adminId && <span className={styles.adminBadge}>admin</span>}
              </span>
              {player.votingStatus && (
                <span className={`${styles.votingBadge} ${player.votingStatus === 'voted' ? styles.voted : styles.pending}`}>
                  {player.votingStatus === 'voted' ? '✓' : '…'}
                </span>
              )}
            </div>
            <div className={styles.controls}>
              <label className={styles.checkboxLabel} title="Участвует в голосовании">
                <input
                  type="checkbox"
                  checked={player.canVote}
                  disabled={!isAdmin}
                  onChange={(e) => togglePlayerCanVote(tableId, player.id, e.target.checked)}
                />
              </label>
              <div className={styles.weightControl}>
                <button
                  className={styles.weightBtn}
                  disabled={!isAdmin || player.voteWeight <= 0}
                  onClick={() => updatePlayerWeight(tableId, player.id, Math.max(0, player.voteWeight - 0.1))}
                >−</button>
                <span className={styles.weight}>{player.voteWeight.toFixed(1)}</span>
                <button
                  className={styles.weightBtn}
                  disabled={!isAdmin || player.voteWeight >= 2}
                  onClick={() => updatePlayerWeight(tableId, player.id, Math.min(2, player.voteWeight + 0.1))}
                >+</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
