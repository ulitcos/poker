import type { PlayerId, TableId } from '@planning-poker/shared';

export interface SocketSession {
  socketId: string;
  playerId: PlayerId;
  tableId: TableId | null;
}

export class SocketSessionStore {
  private readonly bySocket = new Map<string, SocketSession>();
  private readonly byPlayer = new Map<PlayerId, string>();
  private readonly evictionTimers = new Map<PlayerId, ReturnType<typeof setTimeout>>();

  set(socketId: string, session: SocketSession): void {
    this.bySocket.set(socketId, session);
    this.byPlayer.set(session.playerId, socketId);
  }

  getBySocket(socketId: string): SocketSession | undefined {
    return this.bySocket.get(socketId);
  }

  getByPlayer(playerId: PlayerId): SocketSession | undefined {
    const socketId = this.byPlayer.get(playerId);
    return socketId ? this.bySocket.get(socketId) : undefined;
  }

  setTableId(socketId: string, tableId: TableId | null): void {
    const session = this.bySocket.get(socketId);
    if (session) {
      this.bySocket.set(socketId, { ...session, tableId });
    }
  }

  delete(socketId: string): void {
    const session = this.bySocket.get(socketId);
    if (session) {
      this.byPlayer.delete(session.playerId);
      this.bySocket.delete(socketId);
    }
  }

  getSocketIdForPlayer(playerId: PlayerId): string | undefined {
    return this.byPlayer.get(playerId);
  }

  scheduleEviction(playerId: PlayerId, delayMs: number, onEvict: () => void): void {
    this.cancelEviction(playerId);
    const timer = setTimeout(() => {
      this.evictionTimers.delete(playerId);
      const socketId = this.byPlayer.get(playerId);
      if (socketId) this.delete(socketId);
      onEvict();
    }, delayMs);
    this.evictionTimers.set(playerId, timer);
  }

  cancelEviction(playerId: PlayerId): void {
    const timer = this.evictionTimers.get(playerId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.evictionTimers.delete(playerId);
    }
  }

  hasPendingEviction(playerId: PlayerId): boolean {
    return this.evictionTimers.has(playerId);
  }
}
