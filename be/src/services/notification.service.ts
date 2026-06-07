import { Notification, NotificationType, Prisma } from '@prisma/client';
import {
  NotificationRepository,
  notificationRepository,
  NotificationPage,
} from '../repositories/notification.repository';
import { socketService } from './socket.service';
import { prisma } from '../config/prisma';

// ─── Notification Types ───

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  content: string;
  metadata: Record<string, unknown> | null;
  read: boolean;
  createdAt: Date;
}

// ─── Notification Service ───

export class NotificationService {
  constructor(private readonly repo: NotificationRepository) {}

  // Lưu DB và phát Socket (nếu user online)
  async triggerNotification(
    userId: string,
    type: NotificationType,
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<Notification | null> {
    try {
      // 1. Lưu DB
      const safeMetadata = metadata !== undefined
        ? (metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull;

      const notification = await this.repo.create({
        type,
        content,
        metadata: safeMetadata,
        userId,
      });

      // 2. Phát Socket
      if (notification) {
        const payload: NotificationPayload = {
          id: notification.id,
          type: notification.type,
          content: notification.content,
          metadata: notification.metadata as Record<string, unknown> | null,
          read: notification.read,
          createdAt: notification.createdAt,
        };
        socketService.sendToUser<NotificationPayload>(userId, 'NEW_NOTIFICATION', payload);
        
        // Recalculate absolute unread notification metrics and broadcast to user sessions
        this.syncUnreadCount(userId).catch((err) =>
          console.error('[NotificationService] triggerNotification sync failed:', err)
        );
      }

      return notification;
    } catch (error) {
      console.error('[NotificationService] triggerNotification failed:', error);
      return null;
    }
  }

  // Lấy danh sách thông báo (phân trang)
  async getNotifications(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    notifications: Notification[];
    totalCount: number;
    unreadCount: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const [notifications, totalCount, unreadCount] =
      await this.repo.findByUserId(userId, skip, limit);

    return {
      notifications,
      totalCount,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  // Đánh dấu 1 thông báo đã đọc
  async markAsRead(id: string, userId: string): Promise<Notification> {
    return this.repo.updateReadStatus(id, userId);
  }

  // Đánh dấu tất cả thông báo đã đọc
  async markAllRead(userId: string): Promise<{ count: number }> {
    const result = await this.repo.markAllRead(userId);
    return { count: result.count };
  }

  // Recalculate absolute unread notification metrics directly from database and broadcast to user
  async syncUnreadCount(userId: string): Promise<number> {
    try {
      const unreadCount = await prisma.notification.count({
        where: { userId, read: false },
      });
      socketService.sendToUser(userId, 'UNREAD_COUNT_CHANGED', { unreadCount });
      return unreadCount;
    } catch (error) {
      console.error('[NotificationService] syncUnreadCount failed:', error);
      return 0;
    }
  }
}

// Singleton export
export const notificationService = new NotificationService(notificationRepository);
