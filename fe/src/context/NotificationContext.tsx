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

export type NotificationType = 'BUDGET_ALERT' | 'AUTOMATION_TRIGGER' | 'SYSTEM_NOTICE' | 'RECURRING_SUGGESTION';

export interface Notification {
  id: string;
  type: NotificationType;
  content: string;
  metadata: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const accessToken = useAuthStore((s) => s.accessToken);
  const socketRef = useRef<Socket | null>(null);

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

  useEffect(() => {
    if (!accessToken) return;

    const backendUrl = (import.meta.env.VITE_API_URL as string)
      ?.replace('/api/v1', '')
      .replace('/api', '') ?? 'http://localhost:3000';

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

    socket.on('NEW_NOTIFICATION', (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
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

  const markAsRead = useCallback(async (id: string) => {
    try {
      await apiClient.patch(`${API_ENDPOINTS.NOTIFICATIONS}/${id}/read`);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('[Notification] Failed to mark as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.patch(`${API_ENDPOINTS.NOTIFICATIONS}/read-all`);

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

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
}
