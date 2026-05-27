import { Outlet } from 'react-router-dom'
import NavSidebar from './NavSidebar'
import BottomTabBar from './BottomTabBar'
import TopNavBar from './TopNavBar'
import { NotificationProvider } from '../context/NotificationContext'

export default function AppLayout() {
  return (
    // Bọc toàn bộ layout trong NotificationProvider để các component con dùng context
    <NotificationProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <NavSidebar />
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* TopNavBar: chỉ hiển thị trên desktop */}
          <div className="hidden lg:block">
            <TopNavBar />
          </div>

          <main className="flex-1 overflow-y-auto bg-background pb-20 lg:pb-0">
            <Outlet />
          </main>

          {/* Mobile Bottom Tab Bar */}
          <div className="block lg:hidden">
            <BottomTabBar />
          </div>
        </div>
      </div>
    </NotificationProvider>
  )
}