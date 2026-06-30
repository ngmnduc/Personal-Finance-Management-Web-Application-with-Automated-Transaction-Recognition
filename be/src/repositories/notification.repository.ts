import { Prisma, Notification, NotificationType } from '@prisma/client';
import { prisma } from '../config/prisma';

export type NotificationPage = [Notification[], number, number];

export class NotificationRepository {
  async create(data: Prisma.NotificationUncheckedCreateInput): Promise<Notification> {
    return prisma.notification.create({ data });
  }

  async findByUserId(
    userId: string,
    skip: number,
    limit: number,
  ): Promise<NotificationPage> {
    const [notifications, totalCount, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return [notifications, totalCount, unreadCount];
  }

  async updateReadStatus(id: string, userId: string): Promise<Notification> {
    return prisma.notification.update({
      where: {
        id,
        userId,
      },
      data: { read: true },
    });
  }

  async markAllRead(userId: string): Promise<Prisma.BatchPayload> {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}

export const notificationRepository = new NotificationRepository();
