import { Server as SocketIOServer, Socket } from 'socket.io';

// ─── Socket Types ───

export interface AuthenticatedSocket extends Socket {
  userId: string; // Set sau khi auth thành công
}

// ─── Socket Service ───

export class SocketService {
  private static instance: SocketService;

  /** Socket.IO Server instance */
  private io: SocketIOServer | null = null;

  // Map lưu userId -> mảng socketId (hỗ trợ đa thiết bị)
  private connections = new Map<string, string[]>();

  // Tracks recently unregistered socketIds to protect against race conditions
  private unregisteredSockets = new Set<string>();

  private constructor() {}

  // Lấy singleton instance
  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  // Bind Socket.IO server
  init(io: SocketIOServer): void {
    this.io = io;
  }

  // Thêm client connection
  registerClient(userId: string, socketId: string): void {
    // Guard against late registration race conditions
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

  // Xóa client connection
  unregisterClient(socketId: string): void {
    // Track socketId in case its registration is still pending
    this.unregisteredSockets.add(socketId);

    // Limit set size to prevent unbounded memory growth
    if (this.unregisteredSockets.size > 5000) {
      const firstVal = this.unregisteredSockets.values().next().value;
      if (firstVal !== undefined) this.unregisteredSockets.delete(firstVal);
    }

    // Completely purge socketId from all connection lists and clean empty keys
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

  // Broadcast event tới tất cả sessions của user
  sendToUser<T>(userId: string, event: string, payload: T): void {
    if (!this.io) {
      console.warn('[Socket] SocketService not initialized — io is null');
      return;
    }

    const socketIds = this.connections.get(userId);
    if (!socketIds || socketIds.length === 0) {
      // User offline -> bỏ qua (data đã lưu DB)
      return;
    }

    // Gửi tới mọi session đang active
    socketIds.forEach((socketId) => {
      this.io!.to(socketId).emit(event, payload);
    });
  }
}

// Singleton export
export const socketService = SocketService.getInstance();
