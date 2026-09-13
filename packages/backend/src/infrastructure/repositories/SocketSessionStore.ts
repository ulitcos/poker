import type { PlayerId } from '@planning-poker/shared';
import type { TableId } from '@planning-poker/shared';

export interface SocketSession {
  socketId: string;
  playerId: PlayerId;
  tableId: TableId | null;
}

export class SocketSessionStore {
  private readonly bySocket = new Map<string, SocketSession>();
  private readonly byPlayer = new Map<PlayerId, string>();

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

  updateSocketId(playerId: PlayerId, newSocketId: string): void {
    const oldSocketId = this.byPlayer.get(playerId);
    if (oldSocketId) {
      const session = this.bySocket.get(oldSocketId);
      if (session) {
        this.bySocket.delete(oldSocketId);
        const updated = { ...session, socketId: newSocketId };
        this.bySocket.set(newSocketId, updated);
        this.byPlayer.set(playerId, newSocketId);
      }
    }
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
}
