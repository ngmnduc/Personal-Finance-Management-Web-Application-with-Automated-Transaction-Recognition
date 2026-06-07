import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { NotificationBell } from '../components/NotificationBell';
import { useLogout } from '../features/auth/api/auth.api';
import { ROUTES } from '../lib/constants';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';

export const TopNavBar: React.FC = () => {
  // Access the logged-in user profile from global Zustand store
  const user = useAuthStore((s) => s.user);
  
  // Initialize react-router-dom navigate handler
  const navigate = useNavigate();

  // Extract the mutation trigger function from the logout mutation context hook
  const { mutate: logout } = useLogout();

  // Parse user's name to display initials as avatar fallback
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
      
      {/* Control Group: Notification Bell and User Profile Dropdown */}
      <div className="flex items-center gap-4">
        <NotificationBell />

        {/* Dropdown root provider wrapper */}
        <DropdownMenu>
          
          {/* Convert the profile button container element into a DropdownMenuTrigger. 
              asChild preserves semantic layout and mouse click/focus management */}
          <DropdownMenuTrigger asChild className="outline-none focus:outline-none cursor-pointer">
            <div className="flex items-center gap-2.5 border-l border-slate-100 pl-4 h-8 select-none">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0f1f3d] to-[#1e3a6e] text-xs font-semibold text-white shadow">
                {initials}
              </div>
              {/* Keep responsive visibility logic (hidden lg:block) exactly as declared */}
              <div className="hidden lg:block text-left">
                <p className="text-[13px] font-bold leading-tight text-slate-800">
                  {user?.name ?? 'User'}
                </p>
                <p className="text-[11px] leading-tight text-slate-400 mt-0.5">
                  {user?.email ?? ''}
                </p>
              </div>
            </div>
          </DropdownMenuTrigger>

          {/* Dropdown panel content, aligned to the end with a sideOffset of 8 */}
          <DropdownMenuContent align="end" sideOffset={8} className="w-56">
            
            {/* Header profile banner showing full name and email address */}
            <div className="px-3 py-2 text-left select-none pointer-events-none">
              <p className="text-sm font-bold text-slate-800 truncate">
                {user?.name ?? 'User'}
              </p>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {user?.email ?? ''}
              </p>
            </div>
            
            <DropdownMenuSeparator />

            {/* Settings redirection item */}
            <DropdownMenuItem 
              onClick={() => navigate(ROUTES.SETTINGS)}
              className="cursor-pointer text-slate-800 focus:bg-slate-100"
            >
              Settings
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />

            {/* Logout trigger item, styled with warning colors */}
            <DropdownMenuItem 
              onClick={() => logout()}
              className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50/50 font-medium"
            >
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

    </header>
  );
};

export default TopNavBar;
