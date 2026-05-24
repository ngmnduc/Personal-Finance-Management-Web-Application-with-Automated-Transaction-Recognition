import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notification.controller';

const router = Router();

// Yêu cầu xác thực cho toàn bộ route
router.use(requireAuth);

// Lấy danh sách thông báo
router.get('/', getNotifications);

// Đánh dấu tất cả đã đọc (đặt trước /:id/read để tránh xung đột)
router.patch('/read-all', markAllAsRead);

// Đánh dấu một thông báo đã đọc
router.patch('/:id/read', markAsRead);

export default router;
