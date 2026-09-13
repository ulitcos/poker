import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Player } from '@planning-poker/shared';
import { getSocket, connectSocket } from '../../infrastructure/SocketClient';

const PLAYER_KEY = 'pp_player';

interface SessionState {
  player: Player | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

interface SessionContextValue extends SessionState {
  join: (name: string) => Promise<void>;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({
    player: null,
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  const rehydrated = useRef(false);

  const join = useCallback(async (name: string) => {
    setState((s) => ({ ...s, isConnecting: true, error: null }));
    const socket = getSocket();

    return new Promise<void>((resolve, reject) => {
      const doJoin = () => {
        socket.emit('session:join', { playerName: name }, (response) => {
          if (response.success && response.player) {
            localStorage.setItem(PLAYER_KEY, JSON.stringify(response.player));
            setState((s) => ({
              ...s,
              player: response.player!,
              isConnecting: false,
              isConnected: true,
            }));
            resolve();
          } else {
            setState((s) => ({ ...s, isConnecting: false, error: response.error ?? 'Unknown error' }));
            reject(new Error(response.error));
          }
        });
      };

      if (socket.connected) {
        doJoin();
      } else {
        socket.once('connect', doJoin);
        connectSocket();
      }
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(PLAYER_KEY);
    setState({ player: null, isConnected: false, isConnecting: false, error: null });
    getSocket().disconnect();
  }, []);

  useEffect(() => {
    if (rehydrated.current) return;
    rehydrated.current = true;

    const stored = localStorage.getItem(PLAYER_KEY);
    if (!stored) return;

    try {
      const player = JSON.parse(stored) as Player;
      join(player.name).catch(() => {});
    } catch {
      localStorage.removeItem(PLAYER_KEY);
    }
  }, [join]);

  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => setState((s) => ({ ...s, isConnected: true }));
    const onDisconnect = () => setState((s) => ({ ...s, isConnected: false }));

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <SessionContext.Provider value={{ ...state, join, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
