import { Server as SocketIOServer, Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  userId: string;
}

export class SocketService {
  private static instance: SocketService;

  private io: SocketIOServer | null = null;

  private connections = new Map<string, string[]>();

  private unregisteredSockets = new Set<string>();

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  init(io: SocketIOServer): void {
    this.io = io;
  }

  registerClient(userId: string, socketId: string): void {
    if (this.unregisteredSockets.has(socketId)) {
      this.unregisteredSockets.delete(socketId);
      console.log(`[Socket] Skipped registering already unregistered socketId: ${socketId}`);
      return;
    }

    const existing = this.connections.get(userId) ?? [];
    if (!existing.includes(socketId)) {
      this.connections.set(userId, [...existing, socketId]);
    }
    console.log(`[Socket] User ${userId} connected (socketId: ${socketId}) | Total connections: ${existing.length + 1}`);
  }

  unregisterClient(socketId: string): void {
    this.unregisteredSockets.add(socketId);

    if (this.unregisteredSockets.size > 5000) {
      const firstVal = this.unregisteredSockets.values().next().value;
      if (firstVal !== undefined) this.unregisteredSockets.delete(firstVal);
    }

    for (const [userId, socketIds] of this.connections.entries()) {
      const filtered = socketIds.filter((id) => id !== socketId);
      if (filtered.length !== socketIds.length) {
        if (filtered.length === 0) {
          this.connections.delete(userId);
        } else {
          this.connections.set(userId, filtered);
        }
        console.log(`[Socket] User ${userId} disconnected (socketId: ${socketId})`);
      }
    }
  }

  sendToUser<T>(userId: string, event: string, payload: T): void {
    if (!this.io) {
      console.warn('[Socket] SocketService not initialized — io is null');
      return;
    }

    const socketIds = this.connections.get(userId);
    if (!socketIds || socketIds.length === 0) {
      return;
    }

    socketIds.forEach((socketId) => {
      this.io!.to(socketId).emit(event, payload);
    });
  }
}

export const socketService = SocketService.getInstance();
