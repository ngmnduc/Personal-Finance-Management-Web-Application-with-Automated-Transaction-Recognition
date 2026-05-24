import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/errors';

// ─── Notification Controllers ───

// Lấy danh sách thông báo (có phân trang)
export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Lấy params phân trang, fallback về giá trị mặc định
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)),
    );

    const result = await notificationService.getNotifications(userId, page, limit);

    sendSuccess(
      res,
      {
        notifications: result.notifications,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.totalCount,
          totalPages: result.totalPages,
          unreadCount: result.unreadCount,
        },
      },
      'Notifications fetched successfully',
    );
  } catch (error) {
    next(error);
  }
};

// Đánh dấu 1 thông báo là đã đọc
export const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    // Ép kiểu ID để tránh lỗi union type từ Express params
    const id = String(req.params.id);

    if (!id) {
      throw AppError.BadRequest('Notification ID is required');
    }

    const notification = await notificationService.markAsRead(id, userId);

    sendSuccess(res, notification, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
};

// Đánh dấu tất cả thông báo chưa đọc là đã đọc
export const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const result = await notificationService.markAllRead(userId);

    sendSuccess(
      res,
      { updated: result.count },
      `${result.count} notifications marked as read`,
    );
  } catch (error) {
    next(error);
  }
};
