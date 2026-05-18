import { useNavigate, useLocation } from 'react-router-dom'
import { House, ScanLine, Wallet, Target, Menu, Tags, Settings, LifeBuoy, LogOut, ChevronRight, User } from 'lucide-react'
import { ROUTES } from '../lib/constants'
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet'

export default function BottomTabBar() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  const navButtonClass = (path: string) => `flex flex-col items-center justify-center gap-1 py-1 w-[20%] text-[10px] font-medium transition-colors ${
    isActive(path) ? 'text-[#10b981]' : 'text-muted-foreground'
  }`

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-between px-2 pb-[env(safe-area-inset-bottom)] bg-card border-t border-border h-16">
      <button
        onClick={() => navigate(ROUTES.DASHBOARD)}
        className={navButtonClass(ROUTES.DASHBOARD)}
      >
        <House size={20} strokeWidth={isActive(ROUTES.DASHBOARD) ? 2.5 : 2} />
        Home
      </button>

      <button
        onClick={() => navigate(ROUTES.WALLETS)}
        className={navButtonClass(ROUTES.WALLETS)}
      >
        <Wallet size={20} strokeWidth={isActive(ROUTES.WALLETS) ? 2.5 : 2} />
        Wallets
      </button>

      {/* FAB Scan */}
      <div className="relative -top-5 flex justify-center w-[20%]">
        <button
          onClick={() => navigate(ROUTES.SCAN)}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-[#10b981] text-white shadow-lg shadow-emerald-500/30 hover:bg-[#0ea572] transition-transform active:scale-95"
        >
          <ScanLine size={24} />
        </button>
      </div>

      <button
        onClick={() => navigate(ROUTES.GOALS)}
        className={navButtonClass(ROUTES.GOALS)}
      >
        <Target size={20} strokeWidth={isActive(ROUTES.GOALS) ? 2.5 : 2} />
        Planning
      </button>

      {/* Side Drawer Menu */}
      <Sheet>
        <SheetTrigger asChild>
          <button className="flex flex-col items-center justify-center gap-1 py-1 w-[20%] text-[10px] font-medium transition-colors text-muted-foreground">
            <Menu size={20} strokeWidth={2} />
            Menu
          </button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-[85%] sm:max-w-[320px] bg-card p-0 rounded-l-[2rem] flex flex-col shadow-2xl border-l-0 border-border [&>button]:text-muted-foreground [&>button]:right-6 [&>button]:top-6"
        >
          {/* Header */}
          <div className="p-6 pb-4 flex items-center">
            <div className="w-12 h-12 bg-muted rounded-full border border-border flex items-center justify-center mr-4 shrink-0">
              <User size={24} className="text-muted-foreground" />
            </div>
            <div>
              <div className="text-foreground font-bold text-lg">Hello, David</div>
              <div className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide w-fit mt-1">
                FREE PLAN
              </div>
            </div>
          </div>

          <div className="border-t border-border mx-6 my-2" />

          {/* Menu List */}
          <div className="flex flex-col gap-1 px-4">
            <div
              onClick={() => navigate(ROUTES.CATEGORIES)}
              className="flex items-center justify-between p-3.5 rounded-xl hover:bg-muted transition-colors text-foreground cursor-pointer"
            >
              <div className="flex items-center">
                <Tags size={20} />
                <span className="text-sm font-semibold ml-3">Categories</span>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </div>

            <div
              onClick={() => navigate(ROUTES.SETTINGS)}
              className="flex items-center justify-between p-3.5 rounded-xl hover:bg-muted transition-colors text-foreground cursor-pointer"
            >
              <div className="flex items-center">
                <Settings size={20} />
                <span className="text-sm font-semibold ml-3">Settings</span>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl hover:bg-muted transition-colors text-foreground cursor-pointer">
              <div className="flex items-center">
                <LifeBuoy size={20} />
                <span className="text-sm font-semibold ml-3">Support</span>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto p-6 pt-4">
            <div className="border-t border-border mb-4" />
            <button className="w-full flex items-center p-3 rounded-xl text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors">
              <LogOut size={20} className="mr-3" />
              Log Out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  )
}