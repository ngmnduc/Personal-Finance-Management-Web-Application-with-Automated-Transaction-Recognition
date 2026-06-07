import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';
import apiClient from '../lib/axios';
import { API_ENDPOINTS } from '../lib/constants';

// ─── Interface định nghĩa cấu trúc một thông báo ─────────────────────────────

export type NotificationType = 'BUDGET_ALERT' | 'AUTOMATION_TRIGGER' | 'SYSTEM_NOTICE';

export interface Notification {
  id: string;
  type: NotificationType;
  content: string;
  metadata: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

// ─── Interface định nghĩa giá trị Context ─────────────────────────────────────

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

// ─── Khởi tạo Context ─────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextValue | null>(null);

// ─── Provider Component ───────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const accessToken = useAuthStore((s) => s.accessToken);
  const socketRef = useRef<Socket | null>(null);

  // ── Tải danh sách thông báo ban đầu từ REST API ──────────────────────────

  const fetchInitialNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get<{
        data: { notifications: Notification[]; pagination: { unreadCount: number } };
      }>(`${API_ENDPOINTS.NOTIFICATIONS}?page=1&limit=20`);

      setNotifications(res.data.data.notifications);
      setUnreadCount(res.data.data.pagination.unreadCount);
    } catch (error) {
      console.error('[Notification] Failed to fetch initial notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Thiết lập kết nối Socket.IO và lắng nghe sự kiện thời gian thực ─────

  useEffect(() => {
    if (!accessToken) return;

    // Truy xuất URL backend từ biến môi trường (bỏ phần /api/v1 để lấy gốc)
    const backendUrl = (import.meta.env.VITE_API_URL as string)
      ?.replace('/api/v1', '')
      .replace('/api', '') ?? 'http://localhost:3000';

    // Khởi tạo Socket.IO với xác thực Bearer token qua handshake
    const socket = io(backendUrl, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected, id:', socket.id);
    });

    // Lắng nghe sự kiện thông báo mới từ server
    socket.on('NEW_NOTIFICATION', (notification: Notification) => {
      // Chèn thông báo mới vào đầu danh sách
      setNotifications((prev) => [notification, ...prev]);
      // Tăng bộ đếm chưa đọc nếu thông báo chưa được đọc
      if (!notification.read) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    // Sync absolute unread count from the server to enforce a single source of truth across sessions
    socket.on('UNREAD_COUNT_CHANGED', (data: { unreadCount: number }) => {
      setUnreadCount(data.unreadCount);
    });

    // Trigger notification recovery upon reconnection to sync offline state mutations
    socket.on('reconnect', () => {
      fetchInitialNotifications();
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    // Tải thông báo lịch sử khi kết nối thành công
    fetchInitialNotifications();

    return () => {
      // Clean up event listeners and close socket connection to prevent memory leaks
      socket.off('NEW_NOTIFICATION');
      socket.off('UNREAD_COUNT_CHANGED');
      socket.off('reconnect');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, fetchInitialNotifications]);

  // ── Đánh dấu một thông báo là đã đọc ────────────────────────────────────

  const markAsRead = useCallback(async (id: string) => {
    try {
      await apiClient.patch(`${API_ENDPOINTS.NOTIFICATIONS}/${id}/read`);

      // Cập nhật state cục bộ ngay lập tức không cần re-fetch
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('[Notification] Failed to mark as read:', error);
    }
  }, []);

  // ── Đánh dấu tất cả thông báo là đã đọc ─────────────────────────────────

  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.patch(`${API_ENDPOINTS.NOTIFICATIONS}/read-all`);

      // Reset toàn bộ danh sách thông báo về trạng thái đã đọc
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('[Notification] Failed to mark all as read:', error);
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, isLoading, markAsRead, markAllAsRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// ─── Custom hook tiện ích để truy cập Context ─────────────────────────────────

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
}
