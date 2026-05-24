import { Prisma, Notification, NotificationType } from '@prisma/client';
import { prisma } from '../config/prisma';

// ─── Notification Types ───

// Tuple trả về: [notifications, totalCount, unreadCount]
export type NotificationPage = [Notification[], number, number];

// ─── Notification Repository ───

export class NotificationRepository {
  // Tạo thông báo mới
  async create(data: Prisma.NotificationUncheckedCreateInput): Promise<Notification> {
    return prisma.notification.create({ data });
  }

  // Lấy danh sách phân trang và số lượng chưa đọc
  async findByUserId(
    userId: string,
    skip: number,
    limit: number,
  ): Promise<NotificationPage> {
    const [notifications, totalCount, unreadCount] = await Promise.all([
      // Lấy danh sách
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      // Đếm tổng số
      prisma.notification.count({ where: { userId } }),
      // Đếm chưa đọc
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return [notifications, totalCount, unreadCount];
  }

  // Đánh dấu 1 thông báo đã đọc (có check quyền)
  async updateReadStatus(id: string, userId: string): Promise<Notification> {
    return prisma.notification.update({
      where: {
        id,
        userId, // Đảm bảo quyền sở hữu
      },
      data: { read: true },
    });
  }

  // Đánh dấu tất cả đã đọc
  async markAllRead(userId: string): Promise<Prisma.BatchPayload> {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}

// Singleton export
export const notificationRepository = new NotificationRepository();
