import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, AlertTriangle, Zap, Info, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications, Notification, NotificationType } from '../context/NotificationContext';

// ─── Icon ánh xạ theo loại thông báo ──────────────────────────────────────────

const NotificationIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
  switch (type) {
    case 'BUDGET_ALERT':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle size={15} className="text-amber-600" />
        </div>
      );
    case 'AUTOMATION_TRIGGER':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
          <Zap size={15} className="text-blue-600" />
        </div>
      );
    default:
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
          <Info size={15} className="text-slate-500" />
        </div>
      );
  }
};

// ─── Component một dòng thông báo ─────────────────────────────────────────────

const NotificationItem: React.FC<{
  notification: Notification;
  onRead: (id: string) => void;
}> = ({ notification, onRead }) => {
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
  });

  return (
    <div
      className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50 ${
        !notification.read ? 'bg-blue-50/60' : ''
      }`}
      onClick={() => !notification.read && onRead(notification.id)}
    >
      {/* Icon phân loại thông báo */}
      <NotificationIcon type={notification.type} />

      {/* Nội dung thông báo */}
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-snug ${
            !notification.read ? 'font-semibold text-slate-800' : 'font-normal text-slate-600'
          }`}
        >
          {notification.content}
        </p>
        <span className="mt-0.5 block text-xs text-slate-400">{timeAgo}</span>
      </div>

      {/* Chấm tròn chỉ thị chưa đọc */}
      {!notification.read && (
        <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
      )}
    </div>
  );
};

// ─── Notification Bell Dropdown chính ────────────────────────────────────────

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotifications();

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Nút chuông thông báo */}
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {/* Badge bộ đếm thông báo chưa đọc */}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:w-96">
          {/* Header của dropdown */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Nút đánh dấu tất cả đã đọc */}
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} />
                  All read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="ml-1 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Danh sách thông báo có thanh cuộn */}
          <div className="max-h-[420px] overflow-y-auto">
            {isLoading ? (
              /* Trạng thái loading */
              <div className="flex flex-col gap-3 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
                      <div className="h-2 w-1/3 animate-pulse rounded bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              /* Trạng thái rỗng */
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Bell size={22} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">No notifications yet</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    We'll let you know when something happens
                  </p>
                </div>
              </div>
            ) : (
              /* Danh sách thông báo */
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={markAsRead}
                />
              ))
            )}
          </div>

          {/* Footer dropdown */}
          {notifications.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2.5 text-center">
              <span className="text-xs text-slate-400">
                Showing latest {notifications.length} notifications
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
