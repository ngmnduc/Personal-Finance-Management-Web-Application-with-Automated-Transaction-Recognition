import React from 'react';
import { useAuthStore } from '../store/auth.store';
import { NotificationBell } from '../components/NotificationBell';

export const TopNavBar: React.FC = () => {
  const user = useAuthStore((s) => s.user);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <header className="flex h-14 items-center justify-end border-b border-slate-200 bg-white px-6 shrink-0 w-full">
      
      {/* Cụm điều khiển bám phải: Bell và User Profile */}
      <div className="flex items-center gap-4">
        <NotificationBell />

        {/* Khối ngăn cách và hiển thị thông tin User */}
        <div className="flex items-center gap-2.5 border-l border-slate-100 pl-4 h-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0f1f3d] to-[#1e3a6e] text-xs font-semibold text-white shadow">
            {initials}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-[13px] font-bold leading-tight text-slate-800">
              {user?.name ?? 'User'}
            </p>
            <p className="text-[11px] leading-tight text-slate-400 mt-0.5">
              {user?.email ?? ''}
            </p>
          </div>
        </div>
      </div>

    </header>
  );
};

export default TopNavBar;
