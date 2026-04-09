import { Outlet } from 'react-router-dom'
import NavSidebar from './NavSidebar'
import BottomTabBar from './BottomTabBar'

export default function AppLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <NavSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-surface p-4 lg:p-6 pb-20 lg:pb-6">
          <Outlet />
        </main>

        {/* Mobile Bottom Tab Bar */}
        <div className="block lg:hidden">
          <BottomTabBar />
        </div>
      </div>
    </div>
  )
}